import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/chat.js';

function response() {
  return {
    code: 200,
    payload: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

function request(body, token = 'token-de-prueba') {
  return { method: 'POST', headers: { authorization: `Bearer ${token}` }, body };
}

async function withMockedServices(callback, { validSession = true, geminiPayload = null } = {}) {
  const originalFetch = global.fetch;
  const originalEnvironment = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY
  };
  process.env.GEMINI_API_KEY = 'clave-gemini-de-prueba';
  process.env.SUPABASE_URL = 'https://proyecto-prueba.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'clave-publicable-de-prueba';
  global.fetch = async url => {
    if (String(url).includes('/auth/v1/user')) {
      return {
        ok: validSession,
        json: async () => validSession ? { id: '00000000-0000-4000-8000-000000000001' } : { message: 'invalid' }
      };
    }
    if (geminiPayload) {
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(geminiPayload) }] } }] })
      };
    }
    return { ok: false, json: async () => ({ error: 'Gemini no disponible en la prueba' }) };
  };

  try {
    return await callback();
  } finally {
    global.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test('solo admite POST y desactiva caché', async () => {
  const res = response();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.code, 405);
  assert.equal(res.headers.Allow, 'POST');
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('rechaza el uso del asistente sin una sesión autenticada', async () => {
  const res = response();
  await handler({ method: 'POST', headers: {}, body: { message: 'Hola' } }, res);
  assert.equal(res.code, 401);
  assert.match(res.payload.error, /iniciar sesión/i);
});

test('rechaza un token que Supabase no reconoce', async () => {
  await withMockedServices(async () => {
    const res = response();
    await handler(request({ message: 'Hola' }, 'token-invalido'), res);
    assert.equal(res.code, 401);
    assert.match(res.payload.error, /sesión/i);
  }, { validSession: false });
});

test('valida mensajes vacíos y demasiado largos después de validar la sesión', async () => {
  await withMockedServices(async () => {
    const empty = response();
    await handler(request({ message: '   ' }), empty);
    assert.equal(empty.code, 400);

    const long = response();
    await handler(request({ message: 'x'.repeat(4001) }), long);
    assert.equal(long.code, 413);
  });
});

test('el flujo alternativo completa todos los campos sin inventar datos desconocidos', async () => {
  await withMockedServices(async () => {
    let draft = {};
    const turns = [
      ['Sí, estoy a salvo', 'description'],
      ['Un compañero me amenazó a la salida del colegio.', 'category'],
      ['amenazas_intimidacion', 'occurred_at'],
      ['No recuerdo cuándo ocurrió', 'location'],
      ['En el patio del colegio', 'involved'],
      ['Un estudiante de otro curso', 'witnesses'],
      ['No conozco testigos', 'evidence'],
      ['No tengo evidencias', 'additional_info'],
      ['No deseo agregar más información', 'review']
    ];

    for (const [message, expectedStep] of turns) {
      const res = response();
      await handler(request({ message, history: [], draft }), res);
      assert.equal(res.code, 200);
      assert.equal(res.payload.nextStep, expectedStep);
      draft = res.payload.reportDraft;
    }

    assert.equal(draft.category, 'amenazas_intimidacion');
    assert.equal(draft.category_confirmed, true);
    assert.equal(draft.occurred_at, 'No recuerdo cuándo ocurrió');
    assert.equal(draft.witnesses, 'No conozco testigos');
    assert.equal(draft.additional_info, '');
    assert.equal(draft.additional_answered, true);
  });
});

test('un peligro inmediato mantiene la prioridad de seguridad hasta estar acompañado', async () => {
  await withMockedServices(async () => {
    const danger = response();
    await handler(request({ message: 'No, todavía necesito ayuda', history: [], draft: {} }), danger);
    assert.equal(danger.payload.nextStep, 'safety');
    assert.equal(danger.payload.reportDraft.safe_now, false);
    assert.equal(danger.payload.reportDraft.immediate_risk, true);
    assert.match(danger.payload.reply, /seguridad es lo primero/i);

    const protectedNow = response();
    await handler(request({ message: 'Estoy con un adulto de confianza', history: [], draft: danger.payload.reportDraft }), protectedNow);
    assert.equal(protectedNow.payload.nextStep, 'description');
    assert.equal(protectedNow.payload.reportDraft.safe_now, true);
    assert.equal(protectedNow.payload.reportDraft.immediate_risk, true);
  });
});

test('una corrección actualiza solo el campo seleccionado', async () => {
  await withMockedServices(async () => {
    const draft = {
      safe_now: true,
      description: 'Una descripción suficientemente detallada.',
      category: 'otro',
      category_confirmed: true,
      occurred_at: 'Ayer',
      location: 'Patio',
      involved: 'Dos estudiantes',
      witnesses: 'No conozco testigos',
      evidence_answered: true,
      additional_info: '',
      additional_answered: true,
      immediate_risk: false
    };
    const res = response();
    await handler(request({ message: 'Fue en la biblioteca', history: [], draft, correctionField: 'location' }), res);
    assert.equal(res.code, 200);
    assert.equal(res.payload.reportDraft.location, 'Fue en la biblioteca');
    assert.equal(res.payload.reportDraft.description, draft.description);
    assert.equal(res.payload.nextStep, 'review');
  });
});

test('la respuesta de IA no borra datos ya confirmados ni salta la confirmación de categoría', async () => {
  const geminiPayload = {
    reply: 'Propongo una categoría. ¿Es correcta?',
    report_draft: {
      safe_now: true,
      description: 'Un relato nuevo suficientemente detallado.',
      category: 'acoso_escolar',
      category_confirmed: true,
      occurred_at: '',
      location: '',
      involved: '',
      witnesses: '',
      evidence_answered: false,
      additional_info: '',
      additional_answered: false,
      immediate_risk: false
    }
  };
  await withMockedServices(async () => {
    const res = response();
    await handler(request({
      message: 'Amplío lo que pasó para que quede claro.',
      history: [],
      draft: { safe_now: true, description: '' }
    }), res);
    assert.equal(res.code, 200);
    assert.equal(res.payload.reportDraft.category, 'acoso_escolar');
    assert.equal(res.payload.reportDraft.category_confirmed, false);
    assert.equal(res.payload.nextStep, 'category');
  }, { geminiPayload });
});
