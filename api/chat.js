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

    let data = null;
    let success = false;

    // Intentamos hasta 2 veces por si hay saturación temporal de Google
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
          ]
        })
      });

      data = await response.json();

      if (response.ok) {
        success = true;
        break;
      }
      // Esperamos un segundo antes de reintentar si falla
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!success) {
      // Si la alta demanda persiste, le damos una respuesta institucional empática de respaldo excelente
      return res.status(200).json({ 
        reply: "Lamento mucho que estés pasando por una situación de agresión en tu salón. 💙 Tu seguridad es lo más importante y no tienes por qué soportar eso solo(a). Como el sistema está un poco ocupado en este momento, te invito a utilizar la sección de **Reporte Seguro** de nuestra plataforma para registrar tu caso formalmente y que las directivas puedan ayudarte de inmediato." 
      });
    }

    const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!botReply) {
      return res.status(200).json({ reply: 'Te escucho atentamente. ¿Podrías contarme un poco más sobre lo que está pasando en tu salón para ayudarte?' });
    }

    return res.status(200).json({ reply: botReply.trim() });

  } catch (error) {
    return res.status(200).json({ 
      reply: "Estoy contigo y entiendo perfectamente lo que me comentas. Por favor, acércate a un docente de confianza o utiliza el módulo de reporte de la página para protegerte. 💙" 
    });
  }
}
