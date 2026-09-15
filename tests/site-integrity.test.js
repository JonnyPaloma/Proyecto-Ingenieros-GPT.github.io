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
