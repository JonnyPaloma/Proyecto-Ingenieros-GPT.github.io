import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/chat.js';

function response() {
  return {
    code: 200, payload: null, headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

test('rechaza métodos distintos de POST', async () => {
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.code, 405);
  assert.equal(res.headers.Allow, 'POST');
});

test('rechaza mensajes vacíos y demasiado largos', async () => {
  const empty = response();
  await handler({ method: 'POST', body: { message: '   ' } }, empty);
  assert.equal(empty.code, 400);

  const long = response();
  await handler({ method: 'POST', body: { message: 'x'.repeat(4001) } }, long);
  assert.equal(long.code, 413);
});

test('el flujo alternativo avanza de seguridad a descripción sin perder el borrador', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'clave-de-prueba-no-real';
  global.fetch = async () => ({ ok: false, json: async () => ({ error: 'simulado' }) });
  try {
    const safety = response();
    await handler({ method: 'POST', body: { message: 'Sí, estoy a salvo', history: [], draft: {} } }, safety);
    assert.equal(safety.code, 200);
    assert.equal(safety.payload.reportDraft.safe_now, true);
    assert.equal(safety.payload.nextStep, 'description');

    const description = response();
    await handler({ method: 'POST', body: { message: 'Un compañero me amenazó a la salida del colegio.', history: [], draft: safety.payload.reportDraft } }, description);
    assert.match(description.payload.reportDraft.description, /amenazó/);
    assert.equal(description.payload.nextStep, 'details');
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
