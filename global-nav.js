const NAV_ID = 'etv-global-navigation';
const FOOTER_ID = 'etv-global-footer';

const icons = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.9 8.2 7 10 4.1-1.8 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
  exit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>'
};

function pageName() {
  return (location.pathname.split('/').pop() || 'index.html').toLowerCase();
}

function makeLink(href, label, className = '') {
  const element = document.createElement('a');
  element.href = href;
  element.textContent = label;
  element.className = className;
  const current = pageName();
  if (current === href || (href === 'chat.html' && current === 'reporte-seguro.html')) element.setAttribute('aria-current', 'page');
  return element;
}

function normalizeRole(role) {
  if (role === 'Admin') return 'Admin';
  if (role === 'Employee') return 'Employee';
  return 'User';
}

function initials(value) {
  const parts = String(value || 'Usuario').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
}

async function renderSessionActions(container) {
  const sessionGroup = document.createElement('div');
  sessionGroup.className = 'etv-global-nav__session is-loading';
  sessionGroup.setAttribute('aria-label', 'Estado de la cuenta');
  sessionGroup.innerHTML = '<span class="etv-account-skeleton">Comprobando cuenta</span>';
  container.append(sessionGroup);

  try {
    const { supabase } = await import('./conexion.js');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    sessionGroup.replaceChildren();
    sessionGroup.classList.remove('is-loading');

    if (!session) {
      sessionGroup.append(makeLink('login.html', 'Ingresar', 'etv-session-link'), makeLink('registro.html', 'Crear cuenta', 'etv-session-primary'));
      return;
    }

    let role = 'User';
    let name = session.user.email?.split('@')[0] || 'Usuario';
    try {
      const { data, error: profileError } = await supabase.from('perfiles').select('nombre,rol').eq('id', session.user.id).maybeSingle();
      if (profileError) throw profileError;
      role = normalizeRole(data?.rol);
      name = data?.nombre?.trim() || name;
    } catch (profileError) {
      console.warn('No se pudo completar la información de la cuenta:', profileError);
    }

    const destination = role === 'Admin' || role === 'Employee' ? 'panel-admin.html' : 'panel-usuario.html';
    const account = makeLink(destination, '', 'etv-account');
    account.setAttribute('aria-label', 'Abrir mi cuenta');
    const avatar = document.createElement('span');
    avatar.className = 'etv-account__avatar';
    avatar.textContent = initials(name);
    const accountCopy = document.createElement('span');
    accountCopy.className = 'etv-account__copy';
    const accountName = document.createElement('strong');
    accountName.textContent = name;
    const accountRole = document.createElement('small');
    accountRole.textContent = role === 'Admin' ? 'Administración' : role === 'Employee' ? 'Gestión institucional' : 'Mis denuncias';
    accountCopy.append(accountName, accountRole);
    account.append(avatar, accountCopy);

    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'etv-logout';
    logout.setAttribute('aria-label', 'Cerrar sesión');
    logout.innerHTML = `${icons.exit}<span>Cerrar</span>`;
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      await supabase.auth.signOut();
      location.assign('index.html');
    });
    sessionGroup.append(account, logout);
  } catch (error) {
    console.warn('La sesión no está disponible temporalmente:', error);
    sessionGroup.replaceChildren(makeLink('login.html', 'Ingresar', 'etv-session-link'), makeLink('registro.html', 'Crear cuenta', 'etv-session-primary'));
    sessionGroup.classList.remove('is-loading');
  }
}

function createFooter() {
  const footer = document.createElement('footer');
  footer.id = FOOTER_ID;
  footer.className = 'etv-global-footer';
  footer.innerHTML = `
    <div class="etv-global-footer__main">
      <section aria-label="Acerca de Elige Tu Vida"><div class="etv-global-footer__brand"><img src="assets/images/Escudo Elige Tu Vida Hack.png" alt=""><span>Elige Tu Vida</span></div><p class="etv-global-footer__summary">Un espacio de orientación y denuncia diseñado para escuchar, organizar la información y facilitar un seguimiento seguro.</p></section>
      <section><h2>Plataforma</h2><ul><li><a href="index.html">Inicio</a></li><li><a href="chat.html">Asistente de denuncias</a></li><li><a href="panel-usuario.html">Mis denuncias</a></li></ul></section>
      <section><h2>Información</h2><ul><li><a href="privacidad.html">Privacidad</a></li><li><a href="terminos.html">Términos de uso</a></li><li><a href="contacto.html">Contacto</a></li></ul></section>
      <section><h2>Cuenta</h2><ul><li><a href="login.html">Iniciar sesión</a></li><li><a href="registro.html">Crear cuenta</a></li><li><a href="recuperar-contrasena.html">Recuperar contraseña</a></li></ul></section>
    </div>
    <div class="etv-global-footer__bottom"><div class="etv-global-footer__bottom-inner"><span>© ${new Date().getFullYear()} Elige Tu Vida. Todos los derechos reservados.</span><span class="etv-global-footer__security">${icons.shield}<span>Protección de datos y acceso controlado</span></span></div></div>`;
  return footer;
}

async function initGlobalNavigation() {
  if (document.getElementById(NAV_ID)) return;
  document.body.classList.add('etv-global-shell');
  const navigation = document.createElement('nav');
  navigation.id = NAV_ID;
  navigation.className = 'etv-global-nav';
  navigation.setAttribute('aria-label', 'Navegación principal');
  const inner = document.createElement('div');
  inner.className = 'etv-global-nav__inner';

  const brand = makeLink('index.html', '', 'etv-global-nav__brand');
  brand.setAttribute('aria-label', 'Ir al inicio de Elige Tu Vida');
  const logo = document.createElement('img');
  logo.src = 'assets/images/Escudo Elige Tu Vida Hack.png';
  logo.alt = '';
  const brandCopy = document.createElement('span');
  brandCopy.innerHTML = '<strong>Elige Tu Vida</strong><small>Bienestar y convivencia</small>';
  brand.append(logo, brandCopy);

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'etv-global-nav__menu';
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-controls', 'etv-global-nav-links');
  const links = document.createElement('div');
  links.id = 'etv-global-nav-links';
  links.className = 'etv-global-nav__links';
  const primaryLinks = document.createElement('div');
  primaryLinks.className = 'etv-global-nav__primary';
  const assistantLink = makeLink('chat.html', 'Crear denuncia', 'etv-assistant-link');
  assistantLink.insertAdjacentHTML('afterbegin', icons.shield);
  primaryLinks.append(makeLink('index.html', 'Inicio'), assistantLink, makeLink('panel-usuario.html', 'Seguimiento'), makeLink('contacto.html', 'Ayuda'));
  links.append(primaryLinks);

  function setMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.innerHTML = `${open ? icons.close : icons.menu}<span class="etv-sr-only">${open ? 'Cerrar menú' : 'Abrir menú'}</span>`;
    links.classList.toggle('is-open', open);
    document.body.classList.toggle('etv-menu-open', open);
  }
  setMenu(false);
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });

  inner.append(brand, menu, links);
  navigation.append(inner);
  document.querySelectorAll('body > header').forEach(header => header.classList.add('etv-original-header-hidden'));
  document.querySelectorAll('body > footer').forEach(existing => existing.classList.add('etv-original-footer-hidden'));
  document.body.prepend(navigation);
  document.body.append(createFooter());
  const setScrolled = () => navigation.classList.toggle('is-scrolled', window.scrollY > 12);
  setScrolled();
  window.addEventListener('scroll', setScrolled, { passive: true });
  await renderSessionActions(links);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGlobalNavigation, { once: true });
else initGlobalNavigation();
