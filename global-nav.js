const NAV_ID = 'etv-global-navigation';
const FOOTER_ID = 'etv-global-footer';

const icons = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.9 8.2 7 10 4.1-1.8 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
  exit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>'
};

// Estilos de seguridad integrados: evitan que una hoja CSS ausente o tardía
// muestre el logo a tamaño original y desarme toda la página. Cuando
// global-nav.css está disponible, sus estilos completos tienen prioridad.
function installNavigationFallbackStyles() {
  if (document.getElementById('etv-nav-fallback-styles')) return;
  const style = document.createElement('style');
  style.id = 'etv-nav-fallback-styles';
  style.textContent = `@layer etv-nav-fallback {
    body.etv-global-shell{min-height:100vh;display:flex;flex-direction:column}
    body.etv-global-shell>main{flex:1 0 auto}
    body.etv-global-shell>header,.etv-original-header-hidden,.etv-original-footer-hidden{display:none!important}
    .etv-global-nav{position:sticky;top:0;z-index:1000;display:block;width:100%;height:76px;flex:0 0 76px;border-bottom:1px solid #dce6f1;background:#fff;color:#11223b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 5px 18px rgba(7,26,61,.07)}
    .etv-global-nav__inner{width:min(1260px,calc(100% - 36px));height:76px;margin:auto;display:flex;align-items:center;gap:22px}
    .etv-global-nav__brand{display:flex;align-items:center;gap:10px;min-width:190px;color:#071a3d;text-decoration:none}
    .etv-global-nav__brand img{display:block;width:44px!important;height:44px!important;max-width:44px!important;max-height:44px!important;object-fit:contain}
    .etv-global-nav__brand strong,.etv-global-nav__brand small{display:block;white-space:nowrap}.etv-global-nav__brand strong{font-size:16px;line-height:1.15}.etv-global-nav__brand small{margin-top:3px;color:#63738a;font-size:10px}
    .etv-global-nav__links{display:flex;align-items:center;min-width:0;flex:1;gap:12px}.etv-global-nav__primary{display:flex;align-items:center;gap:7px;margin:0 auto;padding:0;background:transparent}
    .etv-global-nav__primary a,.etv-session-link,.etv-session-primary{display:inline-flex;min-height:40px;align-items:center;justify-content:center;gap:7px;padding:8px 14px;border:1px solid #dce8f3;border-radius:999px;background:#fff;color:#405168;text-decoration:none;font-size:12px;font-weight:800;white-space:nowrap}
    .etv-global-nav__primary a[aria-current="page"]{background:#fff;color:#0756a6}.etv-global-nav__primary .etv-assistant-link,.etv-session-primary{background:#0756a6;color:#fff}
    .etv-assistant-link svg,.etv-logout svg,.etv-global-nav__menu svg,.etv-global-footer__security svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .etv-global-nav__session{min-width:205px;min-height:48px;display:flex;align-items:center;justify-content:flex-end;gap:7px}.etv-account-skeleton{width:180px;height:42px;display:grid;place-items:center;border-radius:10px;background:#edf3f8;color:#63738a;font-size:10px}
    .etv-account{min-width:140px;max-width:180px;min-height:46px;display:flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid #dce8f3;border-radius:11px;color:#11223b;text-decoration:none}.etv-account__avatar{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:9px;background:#0756a6;color:#fff;font-size:11px;font-weight:800}.etv-account__copy{min-width:0}.etv-account__copy strong,.etv-account__copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.etv-account__copy strong{font-size:11px}.etv-account__copy small{color:#63738a;font-size:9px}
    .etv-logout{min-width:72px;height:40px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 10px;border:1px solid #e3eaf1;border-radius:999px;background:#fff;color:#64748b;font-size:11px;font-weight:800}.etv-logout span{display:inline}.etv-global-nav__menu{display:none;width:44px;height:44px;margin-left:auto;place-items:center;border:1px solid #dce6f1;border-radius:11px;background:#fff;color:#071a3d}.etv-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .etv-global-footer{flex:0 0 auto;margin-top:auto;padding:34px max(18px,calc((100% - 1220px)/2));background:#071a3d;color:#dce9f8;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.etv-global-footer__main{display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:32px}.etv-global-footer__brand{display:flex;align-items:center;gap:10px;color:#fff;font-weight:800}.etv-global-footer__brand img{width:42px!important;height:42px!important;object-fit:contain}.etv-global-footer__summary{color:#b9cbe0;font-size:13px;line-height:1.6}.etv-global-footer h2{color:#fff;font-size:12px}.etv-global-footer ul{display:grid;gap:8px;margin:0;padding:0;list-style:none}.etv-global-footer a{color:#c6d7e9;text-decoration:none;font-size:13px}.etv-global-footer__bottom-inner{display:flex;justify-content:space-between;gap:18px;margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,.12);color:#9fb4cc;font-size:11px}.etv-global-footer__security{display:flex;align-items:center;gap:7px}
    @media(max-width:900px){.etv-global-nav,.etv-global-nav__inner{height:68px}.etv-global-nav{flex-basis:68px}.etv-global-nav__menu{display:grid}.etv-global-nav__links{display:none;position:absolute;top:68px;right:0;left:0;flex-direction:column;align-items:stretch;padding:14px 18px 20px;background:#fff}.etv-global-nav__links.is-open{display:flex}.etv-global-nav__primary{display:grid;margin:0}.etv-global-nav__session{width:100%;min-width:0}.etv-global-footer__main{grid-template-columns:1fr 1fr}}
    @media(max-width:600px){.etv-global-nav__inner{width:calc(100% - 24px)}.etv-global-nav__brand{min-width:0}.etv-global-nav__brand small{display:none}.etv-global-footer__main{grid-template-columns:1fr}.etv-global-footer__bottom-inner{flex-direction:column}}
  }`;
  document.head.append(style);
}

installNavigationFallbackStyles();

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
    logout.innerHTML = `${icons.exit}<span>Salir</span>`;
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
