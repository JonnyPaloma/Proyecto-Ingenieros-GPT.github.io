import { supabase } from './conexion.js';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const CATEGORY_LABELS = {
  acoso_escolar: 'Acoso escolar o bullying', violencia_fisica: 'Violencia física',
  amenazas_intimidacion: 'Amenazas o intimidación', discriminacion: 'Discriminación o exclusión',
  violencia_sexual: 'Violencia sexual o abuso', salud_emocional: 'Salud emocional o riesgo de vida',
  conflicto_convivencia: 'Conflicto de convivencia', seguridad_digital: 'Seguridad digital', otro: 'Otra situación'
};
const ALLOWED_EXTENSIONS = new Set(['jpg','jpeg','png','gif','webp','heic','mp4','mov','webm','mp3','wav','m4a','pdf','doc','docx','txt']);

const elements = Object.fromEntries([
  'chatMessages','quickReplies','chatForm','chatInput','sendButton','resetChat','evidenceInput','attachmentList',
  'attachmentError','reportSummary','summaryDetails','truthConfirmation','submitReport','editReport','saveStatus',
  'sessionState','liveStatus','successDialog','ticketResult','closeSuccess'
].map(id => [id, document.getElementById(id)]));

let history = [];
let files = [];
let busy = false;
let draft = emptyDraft();

function emptyDraft() {
  return { safe_now: null, description: '', occurred_at: '', location: '', involved: '', category: 'otro', evidence_answered: false, immediate_risk: false };
}

function addMessage(text, role = 'bot') {
  const message = document.createElement('div');
  message.className = `message ${role}`;
  message.textContent = text;
  elements.chatMessages.append(message);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return message;
}

function announce(text) { elements.liveStatus.textContent = text; }

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

function currentStep() {
  if (draft.safe_now === null) return 'safety';
  if (!draft.description || draft.description.length < 10) return 'description';
  if (!draft.occurred_at || !draft.involved) return 'details';
  if (!draft.evidence_answered) return 'evidence';
  return 'review';
}

function updateProgress() {
  const order = ['safety','description','details','evidence','review'];
  const active = order.indexOf(currentStep());
  document.querySelectorAll('#progressSteps li').forEach((item, index) => {
    item.classList.toggle('active', index === active);
    item.classList.toggle('done', index < active);
  });
}

function isReady() {
  return draft.safe_now !== null && draft.description.trim().length >= 10 && draft.occurred_at && draft.involved.trim() && draft.evidence_answered;
}

function showSummary() {
  if (!isReady()) { elements.reportSummary.hidden = true; return; }
  const rows = [
    ['Categoría', CATEGORY_LABELS[draft.category] || CATEGORY_LABELS.otro],
    ['Qué ocurrió', draft.description], ['Cuándo', draft.occurred_at],
    ['Personas involucradas', draft.involved], ['Lugar', draft.location || 'No indicado'],
    ['Evidencias', files.length ? `${files.length} archivo(s) listo(s)` : 'Sin archivos adjuntos']
  ];
  elements.summaryDetails.replaceChildren();
  rows.forEach(([term, value]) => {
    const dt = document.createElement('dt'); dt.textContent = term;
    const dd = document.createElement('dd'); dd.textContent = value;
    elements.summaryDetails.append(dt, dd);
  });
  elements.reportSummary.hidden = false;
  updateProgress();
}

function setBusy(value, status = '') {
  busy = value;
  elements.chatInput.disabled = value;
  elements.sendButton.disabled = value;
  elements.submitReport.disabled = value || !elements.truthConfirmation.checked;
  if (status) { elements.saveStatus.textContent = status; announce(status); }
}

async function sendMessage(rawText) {
  const text = String(rawText || '').trim();
  if (!text || busy) return;
  addMessage(text, 'user');
  history.push({ role: 'user', text });
  history = history.slice(-14);
  elements.chatInput.value = '';
  setQuickReplies();
  setBusy(true, 'El asistente está preparando la siguiente pregunta…');
  const typing = addMessage('•••', 'bot typing');
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history, draft, attachmentCount: files.length })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No fue posible consultar el asistente.');
    draft = { ...draft, ...(data.reportDraft || {}) };
    if (files.length) draft.evidence_answered = true;
    typing.remove();
    addMessage(data.reply, 'bot');
    history.push({ role: 'model', text: data.reply });
    history = history.slice(-14);
    if (data.nextStep === 'evidence') setQuickReplies([{ label: 'No tengo evidencias', value: 'No tengo evidencias para adjuntar.' }]);
    if (data.immediateRisk) setQuickReplies([{ label: 'Estoy con un adulto de confianza' }, { label: 'Necesito ayuda para ponerme a salvo' }]);
    updateProgress();
    showSummary();
    elements.saveStatus.textContent = isReady() ? 'Información lista para revisar' : 'Borrador local, aún no guardado';
  } catch (error) {
    typing.remove();
    addMessage('No pude conectarme en este momento. Tu texto no se guardó; intenta enviarlo otra vez.', 'bot error');
    console.error(error);
  } finally {
    setBusy(false);
    elements.chatInput.focus();
  }
}

function extensionOf(name) { return name.includes('.') ? name.split('.').pop().toLowerCase() : ''; }
function safeFileName(name) {
  const extension = extensionOf(name);
  const base = name.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 70) || 'evidencia';
  return `${base}.${extension}`;
}
function formatBytes(bytes) { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

function renderFiles() {
  elements.attachmentList.replaceChildren();
  files.forEach((file, index) => {
    const item = document.createElement('li');
    const icon = document.createElement('b'); icon.textContent = file.type.startsWith('image/') ? '🖼️' : file.type.startsWith('video/') ? '🎬' : '📄';
    const label = document.createElement('span'); label.textContent = `${file.name} · ${formatBytes(file.size)}`;
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Quitar'; remove.setAttribute('aria-label', `Quitar ${file.name}`);
    remove.addEventListener('click', () => { files.splice(index, 1); renderFiles(); });
    item.append(icon, label, remove); elements.attachmentList.append(item);
  });
  if (files.length) { draft.evidence_answered = true; showSummary(); }
}

function addSelectedFiles(fileList) {
  elements.attachmentError.textContent = '';
  const next = [...files];
  for (const file of fileList) {
    if (next.length >= MAX_FILES) { elements.attachmentError.textContent = `Solo puedes adjuntar ${MAX_FILES} archivos.`; break; }
    if (!ALLOWED_EXTENSIONS.has(extensionOf(file.name))) { elements.attachmentError.textContent = `El formato de ${file.name} no está permitido.`; continue; }
    if (file.size > MAX_FILE_BYTES) { elements.attachmentError.textContent = `${file.name} supera 20 MB.`; continue; }
    if (next.some(item => item.name === file.name && item.size === file.size)) continue;
    next.push(file);
  }
  if (next.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
    elements.attachmentError.textContent = 'Los adjuntos no pueden superar 50 MB en total.';
    return;
  }
  files = next; renderFiles(); elements.evidenceInput.value = '';
  if (files.length) addMessage(`Adjuntaste ${files.length} archivo(s). Se cargarán únicamente al confirmar el reporte.`, 'system');
}

function riskLevel() {
  const text = `${draft.description} ${draft.involved}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return draft.immediate_risk || /suicid|arma|abuso sexual|violacion|matar|peligro inmediato/.test(text) ? 'Crítico' : /acoso|bullying|amenaza|violencia|chantaje|golpe/.test(text) ? 'Alto' : 'Medio';
}

async function uploadFiles(userId, ticket) {
  const uploaded = [];
  for (const file of files) {
    const path = `${userId}/${ticket}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    elements.saveStatus.textContent = `Subiendo ${uploaded.length + 1} de ${files.length}: ${file.name}`;
    const { error } = await supabase.storage.from('reportes-evidencias').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (error) throw error;
    uploaded.push({ storage_path: path, nombre_original: file.name, tipo_mime: file.type || 'application/octet-stream', tamano_bytes: file.size });
  }
  return uploaded;
}

async function submitReport() {
  if (busy || !isReady() || !elements.truthConfirmation.checked) return;
  setBusy(true, 'Comprobando sesión segura…');
  let uploaded = [];
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      addMessage('Para proteger el seguimiento debes iniciar sesión. Tu borrador seguirá aquí al volver.', 'bot error');
      elements.sessionState.innerHTML = '<a href="login.html?returnTo=chat.html">Inicia sesión</a> para registrar el reporte.';
      return;
    }
    const ticket = `TK-${Date.now().toString().slice(-6)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    uploaded = await uploadFiles(session.user.id, ticket);
    elements.saveStatus.textContent = 'Guardando reporte y evidencias…';
    const conversation = history.map(item => ({ role: item.role, text: item.text, at: new Date().toISOString() }));
    const { data, error } = await supabase.rpc('registrar_reporte_con_evidencias', {
      p_ticket: ticket, p_categoria: draft.category || 'otro', p_descripcion: draft.description,
      p_ubicacion: draft.location || null, p_fecha_suceso: draft.occurred_at || null,
      p_involucrados: draft.involved, p_riesgo: riskLevel(), p_conversacion: conversation,
      p_evidencias: uploaded
    });
    if (error) throw error;
    elements.ticketResult.textContent = data?.ticket || ticket;
    elements.saveStatus.textContent = 'Reporte guardado de forma segura';
    addMessage(`Tu reporte fue registrado de forma segura. Código: ${data?.ticket || ticket}.`, 'system');
    elements.successDialog.showModal();
  } catch (error) {
    if (uploaded.length) await supabase.storage.from('reportes-evidencias').remove(uploaded.map(item => item.storage_path));
    addMessage(`No se pudo registrar el reporte: ${error.message || 'error de conexión'}. Tus datos siguen en pantalla para intentarlo otra vez.`, 'bot error');
    console.error('Error al registrar el reporte:', error);
  } finally { setBusy(false); }
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  elements.sessionState.textContent = session ? 'Sesión protegida activa. Podrás registrar y hacer seguimiento.' : 'Puedes conversar sin iniciar sesión. Para registrar el reporte se solicitará acceso.';
}

function reset() {
  history = []; files = []; draft = emptyDraft();
  elements.chatMessages.replaceChildren(); elements.attachmentList.replaceChildren(); elements.reportSummary.hidden = true;
  elements.truthConfirmation.checked = false; elements.submitReport.disabled = true; elements.saveStatus.textContent = 'Conversación aún no guardada';
  addMessage('Hola. Estoy aquí para escucharte y ayudarte a crear un reporte seguro, paso a paso. Primero: ¿te encuentras a salvo en este momento?', 'bot');
  setQuickReplies([{ label: 'Sí, estoy a salvo' }, { label: 'No, hay peligro ahora' }]); updateProgress();
}

elements.chatForm.addEventListener('submit', event => { event.preventDefault(); sendMessage(elements.chatInput.value); });
elements.evidenceInput.addEventListener('change', event => addSelectedFiles(event.target.files));
elements.truthConfirmation.addEventListener('change', () => { elements.submitReport.disabled = busy || !elements.truthConfirmation.checked; });
elements.submitReport.addEventListener('click', submitReport);
elements.editReport.addEventListener('click', () => { elements.reportSummary.hidden = true; elements.chatInput.focus(); });
elements.resetChat.addEventListener('click', reset);
elements.closeSuccess.addEventListener('click', () => elements.successDialog.close());

reset();
checkSession();
