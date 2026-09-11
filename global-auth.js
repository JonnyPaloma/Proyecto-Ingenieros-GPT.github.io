// Centraliza el control de sesión y el acceso a los paneles de Elige Tu Vida.
// Este módulo usa perfiles.rol como fuente de autorización: no confíes en
// user_metadata para decisiones de seguridad porque el usuario puede editarlo.
import { supabase } from './conexion.js';

const AUTH_PAGES = new Set(['login.html', 'registro.html', 'register.html']);
const PROFILE_SELECTOR = '[data-profile-route], .user-badge-container';
let profileRedirectInProgress = false;

function currentPageName() {
  const page = window.location.pathname.split('/').pop();
  return (page || 'index.html').toLowerCase();
}

function isAuthPage() {
  return AUTH_PAGES.has(currentPageName());
}

function revealPage() {
  document.documentElement.classList.remove('auth-guard-pending');
}

function dashboardForRole(role) {
  return role === 'Admin' ? 'panel-admin.html' : 'panel-usuario.html';
}

async function getRole(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('No fue posible consultar el rol del perfil:', error.message);
    return 'User';
  }

  return data?.rol === 'Admin' ? 'Admin' : 'User';
}

async function redirectToDashboard(session) {
  const role = await getRole(session.user.id);
  const destination = dashboardForRole(role);

  if (currentPageName() !== destination) {
    window.location.replace(destination);
  }
}

async function guardAuthPage() {
  if (!isAuthPage()) {
    revealPage();
    return;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (session) {
      await redirectToDashboard(session);
      return;
    }
  } catch (error) {
    // Una caída temporal de red no debe dejar el formulario oculto para siempre.
    console.warn('No fue posible validar la sesión:', error?.message || error);
  }

  revealPage();
}

async function handleProfileRoute(event) {
  event.preventDefault();
  if (profileRedirectInProgress) return;

  profileRedirectInProgress = true;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;

    if (!session) {
      window.location.assign('login.html');
      return;
    }

    await redirectToDashboard(session);
  } catch (error) {
    console.error('No fue posible abrir el panel:', error);
  } finally {
    profileRedirectInProgress = false;
  }
}

function enhanceProfileControls(root = document) {
  if (root.matches?.(PROFILE_SELECTOR)) enhanceProfileControl(root);
  root.querySelectorAll?.(PROFILE_SELECTOR).forEach((element) => {
    enhanceProfileControl(element);
  });
}

function enhanceProfileControl(element) {
  if (element.dataset.profileRouteReady === 'true') return;

  element.dataset.profileRouteReady = 'true';
  element.dataset.profileRoute = 'true';
  element.setAttribute('aria-label', 'Abrir mi panel');
  element.style.cursor = 'pointer';

  if (element.tagName !== 'A' && element.tagName !== 'BUTTON') {
    element.setAttribute('role', 'link');
    element.tabIndex = 0;
  }
}

function startProfileRouting() {
  enhanceProfileControls();

  // Los avatares se crean después de la carga de sesión en varias páginas.
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) enhanceProfileControls(node);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('click', (event) => {
    const profileControl = event.target.closest(PROFILE_SELECTOR);
    if (profileControl) handleProfileRoute(event);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const profileControl = event.target.closest(PROFILE_SELECTOR);
    if (profileControl) handleProfileRoute(event);
  });
}

// Se expone solo para que otros módulos puedan reutilizar el redireccionamiento
// tras un inicio de sesión exitoso, sin duplicar la consulta de roles.
window.EligeTuVidaAuth = Object.freeze({ redirectToDashboard });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startProfileRouting, { once: true });
} else {
  startProfileRouting();
}

guardAuthPage();
