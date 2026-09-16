import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlFiles = readdirSync(root).filter(name => name.endsWith('.html'));

test('todas las páginas usan la navegación y el pie globales', () => {
  assert.ok(htmlFiles.length > 0);
  for (const file of htmlFiles) {
    const html = readFileSync(join(root, file), 'utf8');
    assert.match(html, /<html[^>]+lang="es-CO"/i, `${file} debe declarar el idioma`);
    assert.match(html, /src="global-nav\.js"/i, `${file} debe cargar global-nav.js`);
    assert.match(html, /href="global-nav\.css"/i, `${file} debe cargar los estilos estables de navegación`);
    assert.match(html, /<meta[^>]+name="viewport"/i, `${file} debe ser responsive`);
  }
});

test('los recursos y enlaces locales declarados existen', () => {
  const missing = [];
  for (const file of htmlFiles) {
    const html = readFileSync(join(root, file), 'utf8');
    const attributes = html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi);
    for (const [, rawTarget] of attributes) {
      if (/^(?:https?:|mailto:|tel:|data:|#|\/api\/)/i.test(rawTarget)) continue;
      const target = decodeURIComponent(rawTarget.split(/[?#]/)[0]);
      if (!target || target.startsWith('/')) continue;
      if (!existsSync(resolve(root, target))) missing.push(`${file}: ${rawTarget}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('el flujo de denuncias exige sesión y conserva la arquitectura estática', () => {
  const chat = readFileSync(join(root, 'chat.html'), 'utf8');
  const assistant = readFileSync(join(root, 'assistant.js'), 'utf8');
  const api = readFileSync(join(root, 'api', 'chat.js'), 'utf8');
  const appSource = [chat, assistant, api, readFileSync(join(root, 'conexion.js'), 'utf8')].join('\n');

  assert.match(chat, /id="authGate"/);
  assert.match(assistant, /Authorization:\s*`Bearer/);
  assert.match(api, /\/auth\/v1\/user/);
  assert.match(assistant, /registrar_denuncia_segura/);
  assert.doesNotMatch(appSource, /\.(?:php|asp|aspx)\b/i);
  assert.doesNotMatch(appSource, /\b(?:mysql|xampp)\b/i);
});

test('la migración de reparación registra la RPC y soporta IDs UUID o bigint', () => {
  const migration = readFileSync(join(root, 'supabase-chat-denuncias-v3.sql'), 'utf8');
  assert.match(migration, /create or replace function public\.registrar_denuncia_segura/i);
  assert.match(migration, /nuevo_reporte_id public\.reportes\.id%TYPE/i);
  assert.match(migration, /reporte_id %s not null references public\.reportes\(id\)/i);
  assert.match(migration, /insert into public\.perfiles \(id, nombre, rol\) values \(usuario_actual, '', 'User'\)/i);
  assert.match(migration, /notify pgrst, 'reload schema'/i);
  assert.match(migration, /EV-\[A-F0-9\]\{8\}/i);
  assert.match(readFileSync(join(root, 'assistant.js'), 'utf8'), /`EV-\$\{crypto\.randomUUID\(\)/);
});

test('la migración v4 guarda el tipo de ayuda y contexto estructurado con acceso protegido', () => {
  const migration = readFileSync(join(root, 'supabase-chat-apoyo-v4.sql'), 'utf8');
  assert.match(migration, /add column if not exists tipo_atencion text/i);
  assert.match(migration, /add column if not exists contexto_caso jsonb/i);
  assert.match(migration, /security definer[\s\S]+set search_path = ''/i);
  assert.match(migration, /auth\.uid\(\)/i);
  assert.match(migration, /revoke all on function public\.registrar_denuncia_segura/i);
  assert.match(migration, /to authenticated/i);
  assert.match(readFileSync(join(root, 'assistant.js'), 'utf8'), /p_contexto_caso/);
});

test('la interfaz no contiene caracteres emoji', () => {
  const interfaceFiles = [...htmlFiles, 'assistant.js', 'global-nav.js'];
  const emoji = /[\u{1F000}-\u{1FAFF}]/u;
  for (const file of interfaceFiles) {
    assert.doesNotMatch(readFileSync(join(root, file), 'utf8'), emoji, `${file} contiene un emoji`);
  }
});

test('los scripts embebidos tienen sintaxis JavaScript válida', () => {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const file of htmlFiles) {
    const html = readFileSync(join(root, file), 'utf8');
    const scripts = html.matchAll(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi);
    for (const [, source] of scripts) {
      const withoutImports = source.replace(/^\s*import\s+[^;]+;\s*$/gm, '');
      assert.doesNotThrow(() => new AsyncFunction(withoutImports), `${file} contiene un script embebido inválido`);
    }
  }
});

test('la configuración de Vercel incluye cabeceras de seguridad', () => {
  const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const headers = Object.fromEntries(config.headers[0].headers.map(item => [item.key, item.value]));
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Permissions-Policy'], /camera=\(\)/);
});
