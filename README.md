# Elige Tu Vida

Aplicación web estática de orientación y convivencia escolar. La arquitectura se mantiene en HTML, CSS y JavaScript, con Supabase para autenticación, base de datos y evidencias; una función serverless de Vercel protege el acceso a Gemini.

## Asistente de denuncias

`chat.html` exige una sesión antes de iniciar. El asistente recopila progresivamente:

- seguridad inmediata;
- descripción y tipo de situación;
- momento y lugar;
- personas involucradas y testigos;
- evidencias opcionales;
- información adicional.

La conversación conserva el contexto del turno, acepta respuestas como “no lo sé”, permite corregir cada campo en el resumen y solo registra después de una confirmación explícita. El endpoint `/api/chat` vuelve a validar el token de Supabase; ocultar el formulario no es la única barrera.

Los adjuntos admitidos son imágenes, video, audio, PDF, DOC/DOCX y TXT. Se permiten hasta 5 archivos, 20 MB por archivo y 50 MB en total. El bucket `reportes-evidencias` es privado y los paneles generan enlaces firmados con una duración de cinco minutos.

## Configuración de Supabase

1. Para una instalación que ya ejecutó `supabase-roles-y-rls.sql`, ejecuta completo `supabase-denuncias-seguras-v2.sql` desde **Supabase Dashboard > SQL Editor**.
2. Asigna `Employee` o `Admin` únicamente desde SQL o un entorno administrativo seguro; nunca desde `user_metadata` del navegador. Al final de la migración hay ejemplos comentados.
3. Confirma en Authentication > URL Configuration que la URL de producción y las URLs de redirección incluyen:
   - `https://TU-DOMINIO/login.html`
   - `https://TU-DOMINIO/recuperar-contrasena.html`
   - la URL local que uses durante las pruebas.
4. Conserva la clave `service_role` fuera del navegador. El cliente solo usa la clave publicable.

La migración agrega los campos `testigos` e `informacion_adicional`, el rol `Employee`, índices, políticas RLS de mínimo privilegio, reglas privadas de Storage y la función atómica `registrar_denuncia_segura`.

## Variables de Vercel

Configura estas variables en Project Settings > Environment Variables y vuelve a desplegar:

- `GEMINI_API_KEY`: clave privada de Gemini.
- `GEMINI_MODEL`: opcional; el valor predeterminado es `gemini-2.5-flash`.
- `SUPABASE_URL`: debe ser exactamente la URL usada en `conexion.js`.
- `SUPABASE_PUBLISHABLE_KEY`: la clave publicable del mismo proyecto.

No configures `service_role` para este endpoint. La verificación de sesión se realiza contra Supabase Auth con la clave publicable y el token del usuario.

## Despliegue

El flujo continúa siendo GitHub → Vercel → Supabase. Vercel sirve los archivos estáticos y detecta automáticamente `api/chat.js` como función serverless. `vercel.json` añade cabeceras de seguridad para impedir el embebido del sitio, limitar orígenes y desactivar permisos del navegador que no se utilizan. No se requieren PHP, MySQL, XAMPP ni un servidor adicional.

## Verificación local

Con Node.js 22 o posterior:

```text
npm test
npm run check
```

Las pruebas cubren autenticación del endpoint, validación de entradas, progreso completo del borrador, correcciones y rutas locales. La prueba real de guardado requiere ejecutar la migración en el proyecto Supabase correcto y usar una sesión real.
