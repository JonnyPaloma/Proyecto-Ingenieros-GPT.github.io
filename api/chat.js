export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'El mensaje es requerido' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Falta configurar la API Key en Vercel' });
    }

    // Instrucción estricta para respuestas breves, humanas, sin asteriscos y enfocadas en la escucha rápida
    const systemInstructionText = "Eres 'Elige Tu Vida', un asistente escolar muy cálido, empático y protector. Responde SIEMPRE de forma muy breve (máximo 3 frases cortas), directa y cercana. NO uses asteriscos, negritas ni formato markdown. Valida la emoción del estudiante de inmediato y guíale con suavidad a reportar o buscar apoyo seguro si hay agresión.";

    let data = null;
    let success = false;

    for (let i = 0; i < 2; i++) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstructionText }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: message }]
            }
          ],
          // Esto limita la longitud máxima de la respuesta para que responda mucho más rápido y sea breve
          generationConfig: {
            maxOutputTokens: 150,
            temperature: 0.7
          }
        })
      });

      data = await response.json();

      if (response.ok) {
        success = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!success) {
      return res.status(200).json({ 
        reply: "Lamento mucho lo que me cuentas. Tu seguridad es primero. Por favor, usa la sección de Reporte Seguro de la página para que te ayudemos de inmediato. 💙" 
      });
    }

    let botReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!botReply) {
      return res.status(200).json({ reply: "Te escucho. ¿Cómo te sientes con esto que pasa?" });
    }

    // Limpieza de seguridad por si acaso manda asteriscos
    botReply = botReply.replace(/[*_#]/g, '').trim();

    return res.status(200).json({ reply: botReply });

  } catch (error) {
    return res.status(200).json({ 
      reply: "Estoy contigo. No estás solo, acércate a un docente de confianza o usa nuestro reporte seguro. 💙" 
    });
  }
}
