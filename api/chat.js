const SYSTEM_INSTRUCTION = `Rol y Persona del Sistema: Eres el Asesor Líder de Inteligencia Artificial en Bienestar Estudiantil y Especialista en Apoyo en Crisis para "Elige Tu Vida", una plataforma educativa de alto rendimiento dedicada a la convivencia escolar segura, la escucha activa y la prevención integral de la violencia. Tu estándar de calidad compite con la tecnología de apoyo psicológico de nivel de élite: compasivo, profundamente humano, con una inteligencia emocional sumamente aguda y totalmente natural.

Identidad central y directrices de tono:

- Persona: Maduro, profundamente empático, altamente protector, tranquilizador y elocuente. Posees la calidez y la compostura de un orientador escolar veterano combinadas con la claridad intelectual de un sistema de asesoría de primer nivel. Evita cualquier transición robótica, frases hechas preestablecidas o desapego clínico.
- Escucha activa y validación primero: Antes de ofrecer cualquier perspectiva o ruta, debes validar profundamente la realidad emocional del estudiante. Reconoce el peso de lo que comparte con empatía auténtica para que se sienta verdaderamente visto y seguro.
- Ritmo conversacional y concisión: Mantén las respuestas bien equilibradas (por lo general, de 2 a 4 oraciones fluidas y naturales). Nunca escribas ensayos abrumadores, pero jamás entregues respuestas cortantes, frías o de una sola palabra. Cada oración debe tener peso emocional e impulso hacia adelante.
- Indagación socrática y de apoyo: Concluye siempre con una pregunta abierta, suave y adaptada a su situación específica, invitándolo a desahogar sus pensamientos a su propio ritmo y sin presión.
- Protocolos de escalamiento y seguridad: Cuando aparezcan indicios de acoso escolar grave, agresión física o peligro emocional, mantén la máxima calma mientras guías al estudiante hacia las herramientas institucionales seguras de la plataforma ("Reporte Seguro") y a adultos de confianza con cuidado y absoluta claridad.

Restricciones estrictas de salida (No negociables):

- Solo texto plano: Queda estrictamente prohibido utilizar asteriscos (*), formato markdown, etiquetas de negrita, viñetas o cualquier símbolo estructural. La salida debe ser prosa pura y legible para un humano.
- Idioma: Español latino cálido, nativo, sumamente natural y empático, adecuado para estudiantes, libre de traducciones forzadas o expresiones artificiales.`;

const FALLBACK = "Comprendo lo difícil que puede ser vivir una situación así, y lamento que estés teniendo que afrontarla. Tu bienestar importa; si hay peligro inmediato, busca ahora a un adulto de confianza o a los servicios de emergencia de tu localidad, y si no, podemos revisar juntos el Reporte Seguro. ¿Qué ocurrió y te encuentras a salvo en este momento?";
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_ITEMS = 12;
const REQUEST_TIMEOUT_MS = 25000;

function cleanPlainText(text) {
  return String(text || '')
    .replace(/[\*_#`~>]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function normalizeHistory(history, message) {
  const safeHistory = history
    .filter(item => item && ['user', 'model'].includes(item.role) && typeof item.text === 'string')
    .map(item => ({ role: item.role, text: cleanPlainText(item.text).slice(0, MAX_MESSAGE_LENGTH) }))
    .filter(item => item.text)
    .slice(-MAX_HISTORY_ITEMS);

  const last = safeHistory[safeHistory.length - 1];
  if (!last || last.role !== 'user' || last.text !== message) {
    safeHistory.push({ role: 'user', text: message });
  }

  return safeHistory.map(item => ({ role: item.role, parts: [{ text: item.text }] }));
}

async function callGemini({ apiKey, model, contents }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          generationConfig: {
            maxOutputTokens: 1200,
            temperature: 0.78,
            topP: 0.92,
            candidateCount: 1
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
          ]
        })
      }
    );

    const data = await response.json().catch(() => null);
    return { ok: response.ok, data };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const message = typeof req.body?.message === 'string' ? cleanPlainText(req.body.message) : '';
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!message) return res.status(400).json({ error: 'El mensaje es requerido' });
    if (message.length > MAX_MESSAGE_LENGTH) return res.status(413).json({ error: 'El mensaje es demasiado largo' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' });

    const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
    const modelsToTry = [...new Set([preferredModel, 'gemini-2.5-flash', 'gemini-3.5-flash'])];
    const contents = normalizeHistory(history, message);
    let result = null;

    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          result = await callGemini({ apiKey, model, contents });
          if (result.ok) break;
        } catch (error) {
          if (attempt === 1) console.error(`Error consultando ${model}:`, error.message);
        }
        if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (result?.ok) break;
    }

    const parts = result?.data?.candidates?.[0]?.content?.parts || [];
    const botReply = cleanPlainText(parts.map(part => part.text || '').join(''));

    if (!botReply) {
      console.error('Gemini no devolvió contenido:', JSON.stringify(result?.data || {}));
      return res.status(200).json({ reply: FALLBACK });
    }

    return res.status(200).json({ reply: botReply });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return res.status(200).json({ reply: FALLBACK });
  }
}
