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

    const systemInstructionText = "Eres un asistente virtual escolar altamente empático, cálido, amigable y protector llamado 'Elige Tu Vida'. Tu objetivo es escuchar a los estudiantes, validar sus emociones con respeto y sugerirles reportar situaciones graves de convivencia de forma segura.";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
        ]
      })
    });

    const data = await response.json();

    // Si Google rechaza la petición, le diremos al chat EXACTAMENTE qué error dio
    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data);
      return res.status(200).json({ reply: `[DEBUG GOOGLE ERROR]: ${errorMsg}` });
    }

    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!botReply) {
      return res.status(200).json({ reply: 'Te escucho atentamente. ¿Podrías contarme un poco más sobre cómo te sientes?' });
    }

    return res.status(200).json({ reply: botReply.trim() });

  } catch (error) {
    return res.status(200).json({ reply: `[DEBUG EXCEPTION]: ${error.message}` });
  }
}
