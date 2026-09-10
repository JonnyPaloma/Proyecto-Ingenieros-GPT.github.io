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

    // Prompt directo y estricto integrado en el flujo de usuario para evitar que repita instrucciones
    const promptText = `Actúa estrictamente como 'Elige Tu Vida', un asistente escolar súper cálido, empático y breve. Responde al estudiante con máximo 2 o 3 frases cortas, sin usar asteriscos ni markdown, validando su emoción y guiándolo con cariño. 
    
    Estudiante dice: "${message}"`;

    let data = null;
    let success = false;

    for (let i = 0; i < 2; i++) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: promptText }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 120,
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
        reply: "Lamento mucho lo que pasas. Tu seguridad es primero, usa la sección de Reporte Seguro para ayudarte. 💙" 
      });
    }

    let botReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!botReply) {
      return res.status(200).json({ reply: "Te escucho atentamente. ¿Cómo te sientes?" });
    }

    // Limpieza profunda de cualquier símbolo o texto raro de instrucciones
    botReply = botReply
      .replace(/[*_#]/g, '')
      .replace(/Gently guide to.*$/i, '')
      .replace(/Actúa estrictamente.*?:/i, '')
      .trim();

    if (!botReply) {
      botReply = "Estoy contigo. No estás solo, cuéntame un poco más para apoyarte. 💙";
    }

    return res.status(200).json({ reply: botReply });

  } catch (error) {
    return res.status(200).json({ 
      reply: "Estoy contigo. No estás solo, acércate a un docente o usa nuestro reporte seguro. 💙" 
    });
  }
}
