# Elige Tu Vida

Sitio web de orientación y convivencia escolar con autenticación, paneles de seguimiento, Gemini y Supabase.

## Asistente Inteligente Elige Tu vida

`chat.html` reúne la orientación y el reporte en un único flujo conversacional. Recopila seguridad inmediata, descripción, momento, personas involucradas y evidencias; después muestra un resumen y solo guarda cuando la persona confirma.

Los adjuntos admitidos son imágenes, video, audio, PDF, DOC/DOCX y TXT. Se permiten hasta 5 archivos, 20 MB por archivo y 50 MB en total. Se guardan en el bucket privado `reportes-evidencias`; los paneles crean enlaces firmados por cinco minutos.

## Configuración necesaria

1. En el proyecto Supabase usado por `conexion.js`, ejecutar completo `supabase-roles-y-rls.sql` desde SQL Editor. Es una migración compatible con datos existentes: agrega las columnas conversacionales, la tabla `reporte_evidencias`, el bucket privado, políticas RLS y la función transaccional `registrar_reporte_con_evidencias`.
2. En Vercel configurar `GEMINI_API_KEY`. Opcionalmente se puede definir `GEMINI_MODEL`; por defecto se usa `gemini-2.5-flash`.
3. Desplegar el proyecto en Vercel para que `/api/chat` ejecute `api/chat.js`. Un servidor estático permite revisar la interfaz, pero no ejecuta esa función serverless.

## Verificación local

Con Node.js 22 o posterior:

```text
node --test tests/chat-api.test.js
node --check assistant.js
node --check global-nav.js
node --check api/chat.js
```

La prueba automatizada cubre validación HTTP y el avance alternativo del flujo cuando Gemini no responde. La prueba real de guardado requiere una sesión de usuario y la migración aplicada en el proyecto Supabase correcto.
