import { supabase } from './conexion.js';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const SESSION_CHECK_TIMEOUT_MS = 4000;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'pdf', 'doc', 'docx', 'txt']);
const CATEGORY_LABELS = {
  acoso_escolar: 'Acoso escolar o bullying',
  violencia_fisica: 'Violencia física',
  amenazas_intimidacion: 'Amenazas o intimidación',
  discriminacion: 'Discriminación o exclusión',
  discriminacion_racial: 'Racismo o discriminación étnico-racial',
  discriminacion_genero_orientacion: 'Discriminación por género u orientación sexual',
  violencia_sexual: 'Violencia sexual o abuso',
  salud_emocional: 'Salud emocional o riesgo de vida',
  conflicto_convivencia: 'Conflicto de convivencia',
  seguridad_digital: 'Seguridad digital',
  problemas_familiares: 'Situación familiar o del hogar',
  otro: 'Otra situación'
};
const CASE_MODE_LABELS = {
  denuncia: 'Denuncia formal',
  apoyo: 'Apoyo emocional',
  orientacion: 'Orientación'
};
const EDITABLE_FIELDS = {
  description: 'qué ocurrió',
  case_mode: 'el tipo de ayuda',
  category: 'el tipo de situación',
  occurred_at: 'cuándo ocurrió',
  location: 'dónde ocurrió',
  involved: 'las personas involucradas',
  witnesses: 'los testigos',
  evidence: 'las evidencias',
  impact: 'cómo te ha afectado',
  support_goal: 'lo que necesitas',
  support_network: 'tu red de apoyo',
  desired_follow_up: 'el seguimiento deseado',
  additional_info: 'la información adicional'
};
const STAGE_GUIDANCE = {
  safety: ['1', 'Primero, tu seguridad', 'Antes de hablar del caso, confirmamos que puedas continuar sin exponerte.'],
  description: ['2', 'Comprender lo ocurrido', 'Describe los hechos con tus palabras. No necesitas usar términos técnicos.'],
  intent: ['3', 'Elegir cómo ayudarte', 'Puedes conversar, pedir orientación o preparar una denuncia formal.'],
  category: ['3', 'Clasificar la situación', 'Te ayudamos a ubicar el caso; tú confirmas la categoría final.'],
  occurred_at: ['3', 'Ubicar el momento', 'Una fecha aproximada también es válida si no recuerdas el día exacto.'],
  location: ['3', 'Ubicar el lugar', 'Indica el espacio donde ocurrió o señala que no lo sabes.'],
  involved: ['4', 'Identificar involucrados', 'Incluye solo las personas que conozcas, sin completar datos por suposición.'],
  witnesses: ['4', 'Posibles testigos', 'Puedes indicar que no hubo testigos o que no sabes si alguien observó lo ocurrido.'],
  evidence: ['5', 'Evidencias opcionales', 'Adjunta archivos únicamente si ya los tienes y deseas incluirlos.'],
  impact: ['4', 'Comprender el impacto', 'También importa cómo te está afectando la situación. Puedes responder a tu ritmo.'],
  support_goal: ['4', 'Definir el apoyo', 'Indica qué necesitas ahora para que la orientación sea útil para ti.'],
  support_network: ['5', 'Red de apoyo', 'Puedes mencionar una persona de confianza o indicar que todavía no cuentas con alguien.'],
  additional_info: ['5', 'Consecuencias y acciones previas', 'Puedes indicar cómo te afectó, si se informó a alguien o si ya se tomó alguna medida.'],
  follow_up: ['5', 'Próximo paso', 'Tú decides si quieres conservar el registro, orientación o seguimiento.'],
  review: ['6', 'Revisión y confirmación', 'Comprueba cada dato antes de guardar el registro. Puedes corregir cualquier sección.']
};
const FILE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7V3Z"/><path d="M14 3v5h5M10 13h5M10 17h5"/></svg>';

const elements = Object.fromEntries([
  'authGate', 'chatWorkspace', 'chatMessages', 'quickReplies', 'chatForm', 'chatInput', 'sendButton',
  'resetChat', 'attachmentPanel', 'evidenceInput', 'attachmentList', 'attachmentError', 'reportSummary',
  'summaryDetails', 'truthConfirmation', 'submitReport', 'editReport', 'saveStatus', 'sessionState',
  'liveStatus', 'successDialog', 'ticketResult', 'closeSuccess', 'stageGuide', 'stageGuideNumber',
  'stageGuideTitle', 'stageGuideHint'
].map(id => [id, document.getElementById(id)]));

let history = [];
let files = [];
let busy = false;
let session = null;
let pendingCorrection = '';
let draft = emptyDraft();
let guidedFallbackActive = false;

function emptyDraft() {
  return {
    safe_now: null,
    description: '',
    case_mode: '',
    case_mode_confirmed: false,
    category: '',
    category_confirmed: false,
    topic_tags: [],
    occurred_at: '',
    location: '',
    involved: '',
    witnesses: '',
    evidence_answered: false,
    impact: '',
    impact_answered: false,
    support_goal: '',
    support_network: '',
    support_network_answered: false,
    desired_follow_up: '',
    follow_up_answered: false,
    additional_info: '',
    additional_answered: false,
    immediate_risk: false
  };
}

function normalizeText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function inferCategoryLocally(text) {
  const value = normalizeText(text);
  if (/bullying|acoso escolar|se burl|hostig/.test(value)) return 'acoso_escolar';
  if (/golp|agred|pelea|violencia fisica/.test(value)) return 'violencia_fisica';
  if (/amenaz|intimid|chantaj/.test(value)) return 'amenazas_intimidacion';
  if (/racis|por ser negr|color de piel|etni|afro/.test(value)) return 'discriminacion_racial';
  if (/homofob|transfob|orientacion sexual|identidad de genero|por ser gay|por ser lesbiana|por ser trans|genero sexual/.test(value)) return 'discriminacion_genero_orientacion';
  if (/discrimin|exclu/.test(value)) return 'discriminacion';
  if (/abuso sexual|violacion|tocamiento|violencia sexual/.test(value)) return 'violencia_sexual';
  if (/suicid|autoles|ansiedad|depres|salud emocional/.test(value)) return 'salud_emocional';
  if (/internet|redes|cuenta|foto|mensaje|seguridad digital|ciber/.test(value)) return 'seguridad_digital';
  if (/conflicto|discusion|convivencia/.test(value)) return 'conflicto_convivencia';
  if (/familia|casa|hogar|padres|madre|padre/.test(value)) return 'problemas_familiares';
  return '';
}

function inferCaseModeLocally(text) {
  const value = normalizeText(text);
  if (/denunciar|poner una denuncia|reportar|dejar constancia/.test(value)) return 'denuncia';
  if (/solo quiero hablar|desahog|que me escuch|apoyo emocional|me siento/.test(value)) return 'apoyo';
  if (/orientacion|que puedo hacer|necesito consejo|opciones tengo/.test(value)) return 'orientacion';
  return Object.hasOwn(CASE_MODE_LABELS, value) ? value : '';
}

function inferTagsLocally(text) {
  const value = normalizeText(text);
  const matches = [
    [/depres|deprim|sin ganas|tristeza profunda/, 'depresion'], [/ansiedad|panico|angustia/, 'ansiedad'],
    [/autoles|hacerme dano|cortarme/, 'autolesion'], [/suicid|matarme|no quiero vivir/, 'riesgo_suicida'],
    [/racis|por ser negr|color de piel|etni|afro/, 'racismo'], [/orientacion sexual|homofob|por ser gay|por ser lesbiana|bisexual/, 'orientacion_sexual'],
    [/identidad de genero|transfob|por ser trans|genero sexual/, 'identidad_genero'], [/exclu|ignoran|aisla/, 'exclusion'],
    [/bullying|acoso|hostig/, 'acoso'], [/golp|agred|violencia/, 'violencia'], [/amenaz|intimid|chantaj/, 'amenazas'],
    [/familia|casa|hogar|padres/, 'conflicto_familiar'], [/duelo|fallec|murio|perdida/, 'duelo'], [/soledad|solo|sola/, 'soledad']
  ];
  return matches.filter(([pattern]) => pattern.test(value)).map(([, tag]) => tag);
}

function chooseReply(step, variants) {
  const source = `${step}:${history.length}:${history.at(-1)?.text || ''}`;
  let hash = 0;
  for (const character of source) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return variants[hash % variants.length];
}

function guidedReply(step) {
  const replies = {
    safety: draft.immediate_risk
      ? 'Tu seguridad importa más que completar este registro. Si podrías hacerte daño o alguien puede lastimarte ahora, aléjate de medios peligrosos, busca de inmediato a una persona adulta o de confianza y contacta emergencias de tu localidad. ¿Estás ahora en un lugar seguro y acompañado?'
      : draft.safe_now === false
        ? 'Lo más importante ahora es protegerte. Busca un lugar seguro y contacta a un adulto de confianza o a los servicios de emergencia de tu localidad. ¿Ya estás acompañado o fuera del peligro?'
        : draft.description
          ? 'Quiero tomar en serio lo que acabas de contar. Antes de seguir, necesito confirmar algo importante: ¿te encuentras a salvo en este momento?'
          : 'Podemos avanzar a tu ritmo. Antes de hablar de lo ocurrido, ¿te encuentras a salvo en este momento?',
    description: chooseReply('description', [
      'Puedes contarlo con tus propias palabras y sin usar términos técnicos. ¿Qué está ocurriendo o qué te preocupa?',
      'Este espacio también sirve para hablar de cómo te estás sintiendo. ¿Qué situación te llevó a buscar apoyo hoy?',
      'No tienes que ordenar todo antes de escribirlo. ¿Qué te gustaría que comprendiera primero sobre lo que estás viviendo?'
    ]),
    intent: 'Podemos acompañarte de distintas maneras. ¿Quieres preparar una denuncia, recibir apoyo para hablar de lo que sientes o buscar orientación sobre qué hacer?',
    category: draft.category
      ? `Para organizar el caso, lo ubicaría como “${CATEGORY_LABELS[draft.category]}”. ¿Esa categoría representa bien lo ocurrido?`
      : 'Para clasificar correctamente el caso, ¿qué tipo de situación describe mejor lo ocurrido?',
    occurred_at: 'Quiero ubicar el hecho en el tiempo. ¿Cuándo ocurrió, aunque sea aproximadamente?',
    location: 'Ahora necesito precisar el contexto. ¿Dónde ocurrió?',
    involved: 'Para dejar un registro claro, ¿quiénes estuvieron involucrados? Incluye únicamente lo que conozcas.',
    witnesses: '¿Alguien presenció lo ocurrido o podría aportar información sobre el caso?',
    evidence: 'Si cuentas con archivos, mensajes o documentos relacionados, puedes adjuntarlos de forma opcional. ¿Deseas agregar alguna evidencia?',
    impact: draft.category === 'salud_emocional'
      ? 'Lo que sientes merece ser escuchado sin juicios. ¿Cómo está afectando esto tu ánimo, tus actividades o tus relaciones últimamente?'
      : 'Quiero comprender también el efecto de la situación, no solo los hechos. ¿Cómo te ha afectado?',
    support_goal: 'Para acompañarte de una forma útil, ¿qué necesitas principalmente en este momento: ser escuchado, pensar opciones, hablar con alguien de confianza o iniciar un seguimiento?',
    support_network: 'No tienes que manejar esto en soledad. ¿Hay alguna persona adulta o de confianza con quien te sentirías seguro hablando?',
    additional_info: '¿Hay algo más que consideres importante, como acciones que ya intentaste o una preocupación que no hayamos mencionado?',
    follow_up: '¿Cómo te gustaría continuar después de guardar este registro: solo conservarlo, solicitar orientación o pedir seguimiento de una persona responsable?',
    review: 'Organicé lo que compartiste respetando el tipo de ayuda que elegiste. Revisa el resumen y corrige cualquier dato antes de decidir si deseas guardarlo.'
  };
  return replies[step];
}

// Mantiene el flujo disponible si /api/chat está temporalmente fuera de servicio.
// No guarda nada: el registro sigue requiriendo sesión y la función protegida de Supabase.
function localGuidedResponse(message, correctionField = '') {
  const value = String(message || '').trim();
  const normalized = normalizeText(value);
  const step = correctionField || currentDetailStep();

  if (/me quiero (matar|morir)|voy a (suicidarme|matarme|hacerme dano)|quiero suicidarme|no quiero seguir viviendo|me estan atacando ahora/.test(normalized) && step !== 'safety') {
    draft.safe_now = null;
    draft.immediate_risk = true;
    draft.topic_tags = [...new Set([...(draft.topic_tags || []), 'riesgo_suicida'])];
    return { reportDraft: draft, nextStep: 'safety', reply: guidedReply('safety') };
  }

  if (step === 'safety') {
    if (/\bno\b|peligro|riesgo|urgente|amenaza ahora|no estoy a salvo|necesito ayuda|me quiero (matar|morir)|suicid|hacerme dano|no quiero vivir/.test(normalized)) {
      draft.safe_now = false;
      draft.immediate_risk = true;
    } else if (/\bsi\b|estoy a salvo|estoy bien|no hay peligro|lugar seguro|adulto de confianza/.test(normalized)) {
      draft.safe_now = true;
    } else if (value.length >= 10) {
      draft.description = value;
      if (!draft.category) draft.category = inferCategoryLocally(value);
      draft.topic_tags = [...new Set([...(draft.topic_tags || []), ...inferTagsLocally(value)])];
      const inferredMode = inferCaseModeLocally(value);
      if (inferredMode) draft.case_mode = inferredMode;
    }
  } else if (step === 'description') {
    draft.description = value;
    if (!draft.category) draft.category = inferCategoryLocally(value);
    draft.topic_tags = [...new Set([...(draft.topic_tags || []), ...inferTagsLocally(value)])];
    const inferredMode = inferCaseModeLocally(value);
    if (inferredMode) draft.case_mode = inferredMode;
  } else if (step === 'intent' || step === 'case_mode') {
    const selected = inferCaseModeLocally(value);
    if (selected) {
      draft.case_mode = selected;
      draft.case_mode_confirmed = true;
    }
  } else if (step === 'category') {
    const selected = Object.hasOwn(CATEGORY_LABELS, value) ? value : inferCategoryLocally(value);
    if (selected) {
      draft.category = selected;
      draft.category_confirmed = true;
    } else if (/^(si|correcto|asi es|de acuerdo)$/.test(normalized) && draft.category) {
      draft.category_confirmed = true;
    } else {
      draft.category = 'otro';
      draft.category_confirmed = true;
    }
  } else if (step === 'occurred_at') draft.occurred_at = value;
  else if (step === 'location') draft.location = value;
  else if (step === 'involved') draft.involved = value;
  else if (step === 'witnesses') draft.witnesses = value;
  else if (step === 'evidence') draft.evidence_answered = true;
  else if (step === 'impact') {
    draft.impact = /no deseo|prefiero no|no quiero responder/.test(normalized) ? '' : value;
    draft.impact_answered = true;
    draft.topic_tags = [...new Set([...(draft.topic_tags || []), ...inferTagsLocally(value)])];
  } else if (step === 'support_goal') draft.support_goal = value;
  else if (step === 'support_network') {
    draft.support_network = value;
    draft.support_network_answered = true;
  } else if (step === 'follow_up' || step === 'desired_follow_up') {
    draft.desired_follow_up = value;
    draft.follow_up_answered = true;
  }
  else if (step === 'additional_info') {
    draft.additional_answered = true;
    draft.additional_info = /no deseo|nada mas|sin informacion|no tengo mas/.test(normalized) ? '' : value;
  }

  if (files.length) draft.evidence_answered = true;
  const nextStep = currentDetailStep();
  return { reportDraft: draft, nextStep, reply: guidedReply(nextStep) };
}

function announce(text) {
  elements.liveStatus.textContent = '';
  requestAnimationFrame(() => { elements.liveStatus.textContent = text; });
}

function addMessage(text, role = 'bot') {
  const message = document.createElement('div');
  message.className = `message ${role}`;
  message.textContent = text;
  elements.chatMessages.append(message);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return message;
}

function addTypingIndicator() {
  const message = document.createElement('div');
  message.className = 'message bot typing';
  message.setAttribute('aria-label', 'El asistente está escribiendo');
  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement('span');
    dot.className = 'typing-dot';
    message.append(dot);
  }
  elements.chatMessages.append(message);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return message;
}

function setQuickReplies(items = []) {
  elements.quickReplies.replaceChildren();
  items.forEach(({ label, value = label }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => sendMessage(value));
    elements.quickReplies.append(button);
  });
}

function currentDetailStep() {
  if (draft.safe_now !== true) return 'safety';
  if (draft.description.trim().length < 10) return 'description';
  if (!draft.case_mode_confirmed) return 'intent';
  if (!draft.category_confirmed) return 'category';
  if (draft.case_mode === 'denuncia') {
    if (!draft.occurred_at.trim()) return 'occurred_at';
    if (!draft.location.trim()) return 'location';
    if (!draft.involved.trim()) return 'involved';
    if (!draft.witnesses.trim()) return 'witnesses';
    if (!draft.evidence_answered) return 'evidence';
  }
  if (!draft.impact_answered) return 'impact';
  if (!draft.support_goal.trim()) return 'support_goal';
  if (!draft.support_network_answered) return 'support_network';
  if (!draft.additional_answered) return 'additional_info';
  if (!draft.follow_up_answered) return 'follow_up';
  return 'review';
}

function progressStep() {
  const detail = currentDetailStep();
  if (['intent', 'category', 'occurred_at', 'location'].includes(detail)) return 'context';
  if (['involved', 'witnesses', 'impact', 'support_goal'].includes(detail)) return 'people';
  if (['support_network', 'additional_info', 'follow_up'].includes(detail)) return 'evidence';
  return detail;
}

function updateProgress() {
  const order = ['safety', 'description', 'context', 'people', 'evidence', 'review'];
  const active = order.indexOf(progressStep());
  document.querySelectorAll('#progressSteps li').forEach((item, index) => {
    item.classList.toggle('active', index === active);
    item.classList.toggle('done', index < active);
  });
}

function isReady() {
  return currentDetailStep() === 'review';
}

function quickRepliesForStep(step) {
  if (step === 'safety') {
    if (draft.safe_now === false || draft.immediate_risk) {
      return [
        { label: 'Ya estoy en un lugar seguro' },
        { label: 'Estoy con un adulto de confianza' },
        { label: 'Todavía necesito ayuda para ponerme a salvo' }
      ];
    }
    return [{ label: 'Sí, estoy a salvo' }, { label: 'No, hay peligro ahora' }];
  }
  if (step === 'intent') {
    return [
      { label: 'Quiero apoyo para hablar', value: 'apoyo' },
      { label: 'Quiero orientación', value: 'orientacion' },
      { label: 'Quiero preparar una denuncia', value: 'denuncia' }
    ];
  }
  if (step === 'category') {
    return Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ label, value }));
  }
  if (step === 'occurred_at') return [{ label: 'No recuerdo cuándo ocurrió' }];
  if (step === 'location') return [{ label: 'No sé dónde ocurrió' }];
  if (step === 'involved') return [{ label: 'No sé quiénes fueron' }];
  if (step === 'witnesses') return [{ label: 'No conozco testigos' }];
  if (step === 'evidence') return [{ label: 'No tengo evidencias' }];
  if (step === 'impact') return [{ label: 'Prefiero no describirlo ahora' }];
  if (step === 'support_goal') return [{ label: 'Necesito que me escuchen' }, { label: 'Quiero conocer mis opciones' }];
  if (step === 'support_network') return [{ label: 'Tengo una persona de confianza' }, { label: 'No tengo a quién acudir todavía' }];
  if (step === 'additional_info') return [{ label: 'No deseo agregar más información' }];
  if (step === 'follow_up') return [{ label: 'Solo guardar el registro' }, { label: 'Solicitar orientación' }, { label: 'Solicitar seguimiento' }];
  return [];
}

function updateConversationControls(step = currentDetailStep()) {
  setQuickReplies(quickRepliesForStep(step));
  elements.attachmentPanel.hidden = !draft.evidence_answered && step !== 'evidence';
  const guidance = STAGE_GUIDANCE[step] || STAGE_GUIDANCE.review;
  elements.stageGuide.hidden = false;
  elements.stageGuideNumber.textContent = guidance[0];
  elements.stageGuideTitle.textContent = guidance[1];
  elements.stageGuideHint.textContent = guidance[2];
  updateProgress();
  showSummary();
}

function makeSummaryRow(field, label, value) {
  const row = document.createElement('div');
  row.className = 'summary-row';
  const term = document.createElement('dt');
  term.textContent = label;
  const description = document.createElement('dd');
  description.textContent = value;
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.textContent = 'Corregir';
  edit.setAttribute('aria-label', `Corregir ${label.toLowerCase()}`);
  edit.addEventListener('click', () => beginCorrection(field));
  row.append(term, description, edit);
  return row;
}

function showSummary() {
  if (!isReady()) {
    elements.reportSummary.hidden = true;
    return;
  }
  const evidenceLabel = files.length
    ? `${files.length} archivo${files.length === 1 ? '' : 's'} listo${files.length === 1 ? '' : 's'} para cargar`
    : 'Sin archivos adjuntos';
  const rows = [
    ['case_mode', 'Tipo de ayuda', CASE_MODE_LABELS[draft.case_mode] || 'Por confirmar'],
    ['description', 'Situación compartida', draft.description],
    ['category', 'Tema principal', CATEGORY_LABELS[draft.category] || CATEGORY_LABELS.otro]
  ];
  if (draft.case_mode === 'denuncia') {
    rows.push(
      ['occurred_at', 'Cuándo ocurrió', draft.occurred_at],
      ['location', 'Dónde ocurrió', draft.location],
      ['involved', 'Personas involucradas', draft.involved],
      ['witnesses', 'Testigos', draft.witnesses],
      ['evidence', 'Evidencias', evidenceLabel]
    );
  }
  rows.push(
    ['impact', 'Cómo te ha afectado', draft.impact || 'Prefirió no describirlo'],
    ['support_goal', 'Qué necesitas', draft.support_goal],
    ['support_network', 'Red de apoyo', draft.support_network || 'Sin una red identificada por ahora'],
    ['additional_info', 'Información adicional', draft.additional_info || 'Sin información adicional'],
    ['desired_follow_up', 'Seguimiento deseado', draft.desired_follow_up]
  );
  elements.summaryDetails.replaceChildren(...rows.map(row => makeSummaryRow(...row)));
  elements.reportSummary.hidden = false;
  elements.reportSummary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function beginCorrection(field) {
  pendingCorrection = field;
  elements.reportSummary.hidden = true;
  elements.truthConfirmation.checked = false;
  elements.submitReport.disabled = true;
  if (field === 'evidence') {
    elements.attachmentPanel.hidden = false;
    addMessage('Puedes agregar o quitar archivos. Cuando termines, indícame si deseas cambiar algo más.', 'system');
  } else {
    const label = EDITABLE_FIELDS[field] || 'ese dato';
    addMessage(`Escribe la corrección para ${label}.`, 'system');
    elements.chatInput.placeholder = `Corrige ${label}`;
  }
  elements.chatInput.focus();
}

function setBusy(value, status = '') {
  busy = value;
  elements.chatInput.disabled = value;
  elements.sendButton.disabled = value;
  elements.resetChat.disabled = value;
  elements.submitReport.disabled = value || !elements.truthConfirmation.checked;
  if (status) {
    elements.saveStatus.textContent = status;
    announce(status);
  }
}

function showLoginGate() {
  session = null;
  elements.authGate.hidden = false;
  elements.chatWorkspace.hidden = true;
  elements.resetChat.hidden = true;
  elements.sessionState.textContent = 'Debes iniciar sesión para comenzar y guardar un registro.';
  elements.saveStatus.textContent = 'Inicio de sesión requerido';
}

function showWorkspace(activeSession) {
  const firstActivation = !session;
  session = activeSession;
  elements.authGate.hidden = true;
  elements.chatWorkspace.hidden = false;
  elements.resetChat.hidden = false;
  elements.sessionState.innerHTML = '<strong>Sesión protegida activa.</strong> El registro quedará asociado a tu cuenta únicamente después de confirmarlo.';
  if (firstActivation) resetConversation();
}

async function getSessionQuickly() {
  let timeoutId;
  try {
    return await Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('La comprobación de acceso tardó demasiado.')), SESSION_CHECK_TIMEOUT_MS);
      })
    ]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function requireSession() {
  try {
    const { data: { session: activeSession }, error } = await getSessionQuickly();
    if (error || !activeSession) {
      showLoginGate();
      return null;
    }
    session = activeSession;
    return activeSession;
  } catch (error) {
    console.warn('No fue posible obtener la sesión a tiempo:', error);
    showLoginGate();
    return null;
  }
}

async function sendMessage(rawText) {
  const text = String(rawText || '').trim();
  if (!text || busy) return;
  const activeSession = await requireSession();
  if (!activeSession) return;

  addMessage(text, 'user');
  history.push({ role: 'user', text });
  history = history.slice(-18);
  elements.chatInput.value = '';
  elements.chatInput.style.height = '';
  setQuickReplies();
  setBusy(true, 'Preparando la siguiente pregunta');
  const typing = addTypingIndicator();
  const correctionField = pendingCorrection;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeSession.access_token}`
      },
      body: JSON.stringify({
        message: text,
        history,
        draft,
        correctionField: correctionField || null,
        attachmentCount: files.length
      })
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      typing.remove();
      showLoginGate();
      return;
    }
    if (!response.ok) throw new Error(data.error || 'No fue posible consultar el asistente.');

    draft = { ...emptyDraft(), ...draft, ...(data.reportDraft || {}) };
    if (files.length) draft.evidence_answered = true;
    pendingCorrection = '';
    elements.chatInput.placeholder = 'Escribe con tranquilidad';
    typing.remove();
    if (data.aiAvailable === false && !guidedFallbackActive) {
      addMessage('El servicio de IA está temporalmente no disponible. Continuaré con preguntas guiadas para que no pierdas tu avance.', 'system');
    }
    guidedFallbackActive = data.aiAvailable === false;
    addMessage(data.reply, 'bot');
    history.push({ role: 'model', text: data.reply });
    history = history.slice(-18);
    updateConversationControls(data.nextStep);
    elements.saveStatus.textContent = isReady() ? 'Resumen listo para revisar' : 'Borrador temporal, aún no guardado';
  } catch (error) {
    typing.remove();
    const backup = localGuidedResponse(text, correctionField);
    pendingCorrection = '';
    elements.chatInput.placeholder = 'Escribe con tranquilidad';
    if (!guidedFallbackActive) {
      addMessage('No se pudo contactar el servicio remoto. Continuaré con preguntas guiadas para que no pierdas tu avance.', 'system');
    }
    guidedFallbackActive = true;
    addMessage(backup.reply, 'bot');
    history.push({ role: 'model', text: backup.reply });
    history = history.slice(-18);
    updateConversationControls(backup.nextStep);
    elements.saveStatus.textContent = isReady() ? 'Resumen listo para revisar' : 'Borrador temporal, aún no guardado';
    console.error('Error al consultar el asistente:', error);
  } finally {
    setBusy(false);
    if (!elements.chatWorkspace.hidden) elements.chatInput.focus();
  }
}

function extensionOf(name) {
  return name.includes('.') ? name.split('.').pop().toLowerCase() : '';
}

function safeFileName(name) {
  const extension = extensionOf(name);
  const base = name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 70) || 'evidencia';
  return `${base}.${extension}`;
}

function formatBytes(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.ceil(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderFiles() {
  elements.attachmentList.replaceChildren();
  files.forEach((file, index) => {
    const item = document.createElement('li');
    const icon = document.createElement('span');
    icon.innerHTML = FILE_ICON;
    const label = document.createElement('span');
    label.textContent = `${file.name} · ${formatBytes(file.size)}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Quitar';
    remove.setAttribute('aria-label', `Quitar ${file.name}`);
    remove.addEventListener('click', () => {
      files.splice(index, 1);
      renderFiles();
    });
    item.append(icon, label, remove);
    elements.attachmentList.append(item);
  });
  if (files.length) draft.evidence_answered = true;
  showSummary();
}

function addSelectedFiles(fileList) {
  if (!fileList?.length) return;
  const wasEvidenceStep = currentDetailStep() === 'evidence';
  elements.attachmentError.textContent = '';
  const next = [...files];
  const previousCount = next.length;
  for (const file of fileList) {
    if (next.length >= MAX_FILES) {
      elements.attachmentError.textContent = `Solo puedes adjuntar ${MAX_FILES} archivos.`;
      break;
    }
    if (!ALLOWED_EXTENSIONS.has(extensionOf(file.name))) {
      elements.attachmentError.textContent = `El formato de ${file.name} no está permitido.`;
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      elements.attachmentError.textContent = `${file.name} supera el límite de 20 MB.`;
      continue;
    }
    if (next.some(item => item.name === file.name && item.size === file.size)) continue;
    next.push(file);
  }
  if (next.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
    elements.attachmentError.textContent = 'El total de los adjuntos no puede superar 50 MB.';
    elements.evidenceInput.value = '';
    return;
  }
  if (next.length === previousCount) {
    elements.evidenceInput.value = '';
    return;
  }
  files = next;
  draft.evidence_answered = true;
  renderFiles();
  elements.evidenceInput.value = '';
  addMessage(
    files.length
      ? `Hay ${files.length} archivo${files.length === 1 ? '' : 's'} preparado${files.length === 1 ? '' : 's'}. Solo se cargarán cuando confirmes el registro.`
      : 'No hay archivos seleccionados.',
    'system'
  );
  if (wasEvidenceStep && !draft.additional_answered) {
    addMessage('¿Hay algún otro dato que consideres importante incluir? Puedes continuar sin agregar más información.', 'bot');
  }
  updateConversationControls();
}

function riskLevel() {
  const text = `${draft.description} ${draft.involved} ${draft.impact} ${draft.additional_info} ${(draft.topic_tags || []).join(' ')}`
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (draft.immediate_risk || /suicid|arma|abuso sexual|violacion|matar|peligro inmediato/.test(text)) return 'Crítico';
  if (/acoso|bullying|amenaza|violencia|chantaje|golpe|discriminacion|racismo|autolesion/.test(text)) return 'Alto';
  return 'Medio';
}

async function uploadFiles(userId, ticket) {
  const uploaded = [];
  for (const file of files) {
    const path = `${userId}/${ticket}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    elements.saveStatus.textContent = `Cargando archivo ${uploaded.length + 1} de ${files.length}`;
    const { error } = await supabase.storage.from('reportes-evidencias').upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
      cacheControl: '3600'
    });
    if (error) throw error;
    uploaded.push({
      storage_path: path,
      nombre_original: file.name,
      tipo_mime: file.type || 'application/octet-stream',
      tamano_bytes: file.size
    });
  }
  return uploaded;
}

async function submitReport() {
  if (busy || !isReady() || !elements.truthConfirmation.checked) return;
  setBusy(true, 'Validando tu sesión');
  let uploaded = [];
  try {
    const activeSession = await requireSession();
    if (!activeSession) return;
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user || userData.user.id !== activeSession.user.id) {
      throw new Error('La sesión no pudo validarse. Inicia sesión nuevamente.');
    }

    const ticket = `EV-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    uploaded = await uploadFiles(activeSession.user.id, ticket);
    elements.saveStatus.textContent = 'Guardando el registro y sus evidencias';
    const createdAt = new Date().toISOString();
    const conversation = history.map(item => ({ role: item.role, text: item.text, at: createdAt }));
    const { data, error } = await supabase.rpc('registrar_denuncia_segura', {
      p_ticket: ticket,
      p_categoria: draft.category,
      p_descripcion: draft.description,
      p_fecha_suceso: draft.occurred_at,
      p_ubicacion: draft.location,
      p_involucrados: draft.involved,
      p_testigos: draft.witnesses,
      p_informacion_adicional: draft.additional_info || null,
      p_riesgo: riskLevel(),
      p_conversacion: conversation,
      p_evidencias: uploaded,
      p_tipo_atencion: draft.case_mode,
      p_contexto_caso: {
        etiquetas: draft.topic_tags,
        impacto: draft.impact,
        objetivo_apoyo: draft.support_goal,
        red_apoyo: draft.support_network,
        seguimiento_deseado: draft.desired_follow_up,
        riesgo_inmediato: draft.immediate_risk
      }
    });
    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    const confirmedTicket = result?.ticket || ticket;
    elements.ticketResult.textContent = confirmedTicket;
    elements.saveStatus.textContent = 'Registro guardado de forma segura';
    addMessage(`El registro fue guardado. Tu código de seguimiento es ${confirmedTicket}.`, 'system');
    elements.successDialog.showModal();
  } catch (error) {
    if (uploaded.length) {
      const { error: cleanupError } = await supabase.storage
        .from('reportes-evidencias')
        .remove(uploaded.map(item => item.storage_path));
      if (cleanupError) console.error('No fue posible limpiar los adjuntos no vinculados:', cleanupError);
    }
    addMessage(`No se pudo guardar el registro: ${error.message || 'error de conexión'}. La información permanece en pantalla para que puedas reintentar.`, 'bot error');
    console.error('Error al guardar el registro:', error);
  } finally {
    setBusy(false);
  }
}

function resetConversation() {
  history = [];
  files = [];
  pendingCorrection = '';
  guidedFallbackActive = false;
  draft = emptyDraft();
  elements.chatMessages.replaceChildren();
  elements.attachmentList.replaceChildren();
  elements.attachmentPanel.hidden = true;
  elements.reportSummary.hidden = true;
  elements.truthConfirmation.checked = false;
  elements.submitReport.disabled = true;
  elements.chatInput.value = '';
  elements.chatInput.placeholder = 'Escribe con tranquilidad';
  elements.saveStatus.textContent = 'Borrador temporal, aún no guardado';
  const firstName = session?.user?.user_metadata?.nombre?.trim()?.split(/\s+/)[0];
  addMessage(`${firstName ? `Hola, ${firstName}. ` : 'Hola. '}Este es un espacio para hablar, recibir orientación o preparar una denuncia, sin juicios y a tu ritmo. Nada se guardará sin que revises y confirmes el resumen. Para comenzar, ¿te encuentras a salvo en este momento?`, 'bot');
  updateConversationControls('safety');
}

async function initialize() {
  try {
    const { data: { session: activeSession }, error } = await getSessionQuickly();
    if (error) throw error;
    if (activeSession) showWorkspace(activeSession);
    else showLoginGate();
  } catch (error) {
    console.error('No fue posible comprobar la sesión:', error);
    showLoginGate();
    elements.sessionState.textContent = 'No fue posible validar el acceso. Intenta iniciar sesión nuevamente.';
  }
}

elements.chatForm.addEventListener('submit', event => {
  event.preventDefault();
  sendMessage(elements.chatInput.value);
});
elements.chatInput.addEventListener('input', () => {
  elements.chatInput.style.height = 'auto';
  elements.chatInput.style.height = `${Math.min(elements.chatInput.scrollHeight, 140)}px`;
});
elements.evidenceInput.addEventListener('change', event => addSelectedFiles(event.target.files));
elements.truthConfirmation.addEventListener('change', () => {
  elements.submitReport.disabled = busy || !elements.truthConfirmation.checked;
});
elements.submitReport.addEventListener('click', submitReport);
elements.editReport.addEventListener('click', () => {
  elements.reportSummary.hidden = true;
  elements.truthConfirmation.checked = false;
  elements.submitReport.disabled = true;
  addMessage('Indícame qué dato deseas corregir y cuál es la información correcta.', 'system');
  elements.chatInput.focus();
});
elements.resetChat.addEventListener('click', resetConversation);
elements.closeSuccess.addEventListener('click', () => elements.successDialog.close());

supabase.auth.onAuthStateChange((event, activeSession) => {
  if (event === 'SIGNED_OUT' || !activeSession) showLoginGate();
  else if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && !session) showWorkspace(activeSession);
  else session = activeSession;
});

initialize();
