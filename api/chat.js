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

    // Prompt equilibrado para escucha activa, empatía profunda y extensión justa (ni seca ni larga)
    const promptText = `Eres 'Elige Tu Vida', un asistente escolar muy cálido, humano, empático y protector. Tu misión es escuchar activamente al estudiante. 
    Responde con un párrafo equilibrado (de 3 a 4 oraciones): 
    1. Valida y comprende profundamente lo que siente.
    2. Transmitile tranquilidad y apoyo incondicional.
    3. Hazle una pregunta de apoyo amable para entender mejor lo que pasa o guiarlo con suavidad.
    No uses asteriscos, negritas ni formato markdown. Habla con naturalidad y cercanía sincera.

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
            maxOutputTokens: 220,
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
        reply: "Lamento mucho que estés pasando por esto y entiendo lo difícil que debe ser. No estás solo en esto. ¿Te gustaría contarme un poco más de lo que sucede o prefieres que veamos cómo hacer un reporte seguro para protegerte? 💙" 
      });
    }

    let botReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!botReply) {
      return res.status(200).json({ reply: "Te escucho con atención. Cuéntame un poco más sobre cómo te sientes con esto, estoy aquí para apoyarte. 💙" });
    }

    // Limpieza de símbolos extraños
    botReply = botReply.replace(/[*_#]/g, '').trim();

    return res.status(200).json({ reply: botReply });

  } catch (error) {
    return res.status(200).json({ 
      reply: "Siento mucho que estés experimentando esto. Estoy aquí contigo y me importa mucho tu bienestar. ¿Quieres contarme cómo ha sido el ambiente en el salón últimamente? 💙" 
    });
  }
}
