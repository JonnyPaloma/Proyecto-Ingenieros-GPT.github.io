import { supabase } from './conexion.js';

const NAV_ID = 'etv-global-navigation';

function addStyles() {
  if (document.getElementById('etv-global-nav-styles')) return;
  const style = document.createElement('style');
  style.id = 'etv-global-nav-styles';
  style.textContent = `
    .etv-global-nav{position:relative;z-index:1000;border-bottom:1px solid #dbe4ef;background:#0b1f48;color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    .etv-global-nav__inner{width:min(1240px,calc(100% - 32px));min-height:54px;margin:auto;display:flex;align-items:center;gap:18px}
    .etv-global-nav__brand{display:flex;align-items:center;gap:8px;color:#fff;text-decoration:none;font-weight:850;white-space:nowrap}
    .etv-global-nav__brand img{width:32px;height:32px;object-fit:contain}
    .etv-global-nav__links{display:flex;align-items:center;gap:5px;margin-left:auto}
    .etv-global-nav__links a,.etv-global-nav__links button{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 11px;border:0;border-radius:8px;color:#e8f2ff;background:transparent;text-decoration:none;font:700 12.5px/1.25 inherit;cursor:pointer}
    .etv-global-nav__links a:hover,.etv-global-nav__links button:hover,.etv-global-nav__links a[aria-current="page"]{background:rgba(255,255,255,.13);color:#fff}
    .etv-global-nav__links .etv-assistant-link{background:#fff;color:#103c81}
    .etv-global-nav__links .etv-assistant-link:hover{background:#dff3ff;color:#0b1f48}
    .etv-global-nav__menu{display:none;margin-left:auto;min-height:40px;padding:8px 12px;border:1px solid rgba(255,255,255,.45);border-radius:8px;background:transparent;color:#fff;font-weight:800;cursor:pointer}
    .etv-original-header-hidden{display:none!important}
    @media(max-width:860px){.etv-global-nav__menu{display:block}.etv-global-nav__links{display:none;position:absolute;top:54px;right:0;left:0;flex-direction:column;align-items:stretch;padding:12px 16px 16px;background:#0b1f48;box-shadow:0 14px 24px rgba(11,31,72,.22)}.etv-global-nav__links.is-open{display:flex}.etv-global-nav__links a,.etv-global-nav__links button{width:100%;min-height:44px;text-align:center}.etv-global-nav__brand span{font-size:14px}}
  `;
  document.head.append(style);
}

function pageName() {
  return (location.pathname.split('/').pop() || 'index.html').toLowerCase();
}

function link(href, label, className = '') {
  const element = document.createElement('a');
  element.href = href;
  element.textContent = label;
  element.className = className;
  if (pageName() === href) element.setAttribute('aria-current', 'page');
  return element;
}

async function renderSessionActions(container) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    container.append(link('login.html', 'Ingresar'), link('registro.html', 'Crear cuenta'));
    return;
  }

  const panel = link('panel-usuario.html', 'Mis reportes');
  try {
    const { data } = await supabase.from('perfiles').select('rol').eq('id', session.user.id).maybeSingle();
    if (data?.rol === 'Admin') {
      panel.href = 'panel-admin.html';
      panel.textContent = 'Panel administrativo';
    }
  } catch (error) {
    console.warn('No se pudo determinar el panel del usuario:', error);
  }
  container.append(panel);

  const logout = document.createElement('button');
  logout.type = 'button';
  logout.textContent = 'Cerrar sesión';
  logout.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.assign('index.html');
  });
  container.append(logout);
}

async function initGlobalNavigation() {
  if (document.getElementById(NAV_ID)) return;
  addStyles();

  const navigation = document.createElement('nav');
  navigation.id = NAV_ID;
  navigation.className = 'etv-global-nav';
  navigation.setAttribute('aria-label', 'Navegación global');

  const inner = document.createElement('div');
  inner.className = 'etv-global-nav__inner';
  const brand = link('index.html', 'Elige Tu Vida', 'etv-global-nav__brand');
  brand.setAttribute('aria-label', 'Ir al inicio de Elige Tu Vida');
  const logo = document.createElement('img');
  logo.src = 'assets/images/Escudo Elige Tu Vida Hack.png';
  logo.alt = '';
  const brandText = document.createElement('span');
  brandText.textContent = 'Elige Tu Vida';
  brand.replaceChildren(logo, brandText);

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'etv-global-nav__menu';
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-controls', 'etv-global-nav-links');
  menu.textContent = 'Menú';

  const links = document.createElement('div');
  links.id = 'etv-global-nav-links';
  links.className = 'etv-global-nav__links';
  links.append(
    link('index.html', 'Inicio'),
    link('chat.html', 'Asistente Inteligente Elige Tu vida', 'etv-assistant-link'),
    link('privacidad.html', 'Privacidad'),
    link('contacto.html', 'Contacto')
  );

  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
  });
  links.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      menu.setAttribute('aria-expanded', 'false');
      links.classList.remove('is-open');
    }
  });

  inner.append(brand, menu, links);
  navigation.append(inner);
  document.querySelectorAll('body > header').forEach(header => header.classList.add('etv-original-header-hidden'));
  document.body.prepend(navigation);
  await renderSessionActions(links);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalNavigation, { once: true });
} else {
  initGlobalNavigation();
}
