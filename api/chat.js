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

const FALLBACK = "Comprendo lo difícil que es atravesar por una situación así, y lamento mucho que tengas que vivirlo. Tu bienestar importa y podemos buscar apoyo seguro con un adulto de confianza o mediante Reporte Seguro. ¿Te gustaría contarme qué ocurrió y si estás a salvo en este momento?";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    if (!message) return res.status(400).json({ error: 'El mensaje es requerido' });
    if (message.length > 4000) return res.status(413).json({ error: 'El mensaje es demasiado largo' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Falta configurar la API Key en Vercel' });

    const contents = history
      .filter(item => item && ['user', 'model'].includes(item.role) && typeof item.text === 'string')
      .slice(-10)
      .map(item => ({ role: item.role, parts: [{ text: item.text.slice(0, 4000) }] }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    let data;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          generationConfig: { maxOutputTokens: 300, temperature: 0.75 }
        })
      });
      data = await response.json().catch(() => null);
      if (response.ok) break;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 450));
    }

    let botReply = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!botReply) return res.status(200).json({ reply: FALLBACK });
    botReply = botReply.replace(/[\*_#`~>]/g, '').replace(/^\s*[-•]\s*/gm, '').replace(/\n{2,}/g, '\n').trim();
    return res.status(200).json({ reply: botReply || FALLBACK });
  } catch (error) {
    console.error('Error en /api/chat:', error);
    return res.status(200).json({ reply: FALLBACK });
  }
}
