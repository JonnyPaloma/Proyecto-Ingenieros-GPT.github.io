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

    // Instrucción de sistema experta, natural y profundamente empática para un orientador escolar
    const systemInstructionText = "Eres el orientador virtual de 'Elige Tu Vida', un profesional experto en convivencia escolar, empatía y apoyo emocional para jóvenes. Tu tono debe ser cálido, maduro, cercano, absolutamente humano y profesional. Nunca suenes robótico ni uses fórmulas repetitivas. Escucha activamente lo que dice el estudiante, valida sus emociones con respeto y hazle una pregunta orientadora o de apoyo sincera que le invite a sentirse seguro y comprendido. No uses asteriscos ni markdown.";

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
          generationConfig: {
            maxOutputTokens: 250,
            temperature: 0.8
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
        reply: "Comprendo lo difícil que es atravesar por una situación así, y lamento mucho que tengas que vivirlo. Quiero recordarte que no estás solo y que tu bienestar es lo más importante. ¿Te sientes cómodo conversando un poco más sobre lo que ocurre, o prefieres que revisemos juntos la opción de hacer un reporte seguro? 💙" 
      });
    }

    let botReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!botReply) {
      return res.status(200).json({ reply: "Te escucho con total atención. Cuéntame un poco más de lo que estás experimentando para poder comprenderlo mejor. 💙" });
    }

    // Limpieza de símbolos de formato
    botReply = botReply.replace(/[*_#]/g, '').trim();

    return res.status(200).json({ reply: botReply });

  } catch (error) {
    return res.status(200).json({ 
      reply: "Lamento mucho que estés pasando por esto. Estoy aquí para escucharte y buscar la manera de protegerte. ¿Hay algo específico de lo que ocurra en el salón que te gustaría compartirme? 💙" 
    });
  }
}
