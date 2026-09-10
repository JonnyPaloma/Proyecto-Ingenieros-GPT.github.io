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

    const systemInstruction = "Eres un asistente virtual escolar altamente empático, cálido, amigable y protector llamado 'Elige Tu Vida'. Tu objetivo es escuchar a los estudiantes, validar sus emociones con respeto y sugerirles reportar situaciones graves de convivencia de forma segura.";

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemInstruction}\n\nEstudiante: ${message}` }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Error de la API de Google:", data);
      return res.status(500).json({ reply: 'Lo siento, la IA no pudo procesar la solicitud en este momento.' });
    }

    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Lo siento, no pude procesar una respuesta en este momento, pero estoy contigo.';

    return res.status(200).json({ reply: botReply.trim() });

  } catch (error) {
    console.error("Error en la función de IA:", error);
    return res.status(500).json({ reply: 'Lo siento, tuve un problema de conexión con el servicio de IA.' });
  }
}
