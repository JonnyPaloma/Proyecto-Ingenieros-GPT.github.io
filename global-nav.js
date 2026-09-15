const NAV_ID = 'etv-global-navigation';
const FOOTER_ID = 'etv-global-footer';

const icons = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.9 8.2 7 10 4.1-1.8 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>'
};

function addStyles() {
  if (document.getElementById('etv-global-nav-styles')) return;
  const style = document.createElement('style');
  style.id = 'etv-global-nav-styles';
  style.textContent = `
    :root{--etv-navy:#071a3d;--etv-blue:#0756a6;--etv-blue-strong:#06448a;--etv-sky:#eaf5ff;--etv-ink:#11223b;--etv-muted:#5c6b7f;--etv-line:#dce6f1;--etv-surface:#fff;--etv-radius:16px;--etv-shadow:0 18px 50px rgba(7,26,61,.10)}
    *,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth}
    body.etv-global-shell{min-height:100vh;display:flex;flex-direction:column;color:var(--etv-ink)}body.etv-global-shell>main{flex:1 0 auto}
    .etv-global-nav{position:sticky;top:0;z-index:1000;border-bottom:1px solid rgba(220,230,241,.9);background:rgba(255,255,255,.94);color:var(--etv-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;backdrop-filter:blur(16px);box-shadow:0 4px 18px rgba(7,26,61,.06)}
    .etv-global-nav__inner{width:min(1220px,calc(100% - 36px));min-height:72px;margin:auto;display:flex;align-items:center;gap:24px}.etv-global-nav__brand{display:flex;align-items:center;gap:10px;color:var(--etv-navy);text-decoration:none;font-weight:850;letter-spacing:-.02em;white-space:nowrap}.etv-global-nav__brand img{width:42px;height:42px;object-fit:contain;filter:drop-shadow(0 5px 9px rgba(7,26,61,.12))}
    .etv-global-nav__links{display:flex;align-items:center;gap:3px;margin-left:auto}.etv-global-nav__links a,.etv-global-nav__links button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:9px 12px;border:0;border-radius:10px;color:#35455c;background:transparent;text-decoration:none;font:750 13px/1.25 inherit;cursor:pointer;transition:background .2s,color .2s,transform .2s}.etv-global-nav__links a:hover,.etv-global-nav__links button:hover,.etv-global-nav__links a[aria-current="page"]{background:#edf5fd;color:var(--etv-blue)}.etv-global-nav__links a:focus-visible,.etv-global-nav__links button:focus-visible{outline:3px solid rgba(7,86,166,.25);outline-offset:2px}.etv-global-nav__links .etv-assistant-link{margin-left:4px;background:var(--etv-blue);color:#fff;box-shadow:0 8px 18px rgba(7,86,166,.18)}.etv-global-nav__links .etv-assistant-link:hover,.etv-global-nav__links .etv-assistant-link[aria-current="page"]{background:var(--etv-blue-strong);color:#fff;transform:translateY(-1px)}.etv-assistant-link svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.etv-global-nav__session{display:flex;align-items:center;gap:3px;margin-left:5px;padding-left:8px;border-left:1px solid var(--etv-line)}
    .etv-global-nav__menu{display:none;width:44px;height:44px;margin-left:auto;padding:10px;border:1px solid var(--etv-line);border-radius:11px;background:#fff;color:var(--etv-navy);cursor:pointer}.etv-global-nav__menu svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}.etv-original-header-hidden,.etv-original-footer-hidden{display:none!important}.etv-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .etv-global-footer{flex:0 0 auto;margin-top:auto;background:var(--etv-navy);color:#dce9f8;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.etv-global-footer__main{width:min(1220px,calc(100% - 36px));margin:auto;padding:52px 0 34px;display:grid;grid-template-columns:minmax(260px,1.5fr) repeat(3,minmax(150px,1fr));gap:38px}.etv-global-footer__brand{display:flex;align-items:center;gap:11px;margin-bottom:14px;color:#fff;font-weight:850;font-size:18px}.etv-global-footer__brand img{width:44px;height:44px;object-fit:contain}.etv-global-footer__summary{max-width:430px;margin:0;color:#b9cbe0;font-size:14px;line-height:1.7}.etv-global-footer h2{margin:5px 0 15px;color:#fff;font-size:13px;letter-spacing:.08em;text-transform:uppercase}.etv-global-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}.etv-global-footer a{color:#c6d7e9;text-decoration:none;font-size:14px;transition:color .2s}.etv-global-footer a:hover{color:#fff;text-decoration:underline;text-underline-offset:4px}.etv-global-footer__bottom{border-top:1px solid rgba(255,255,255,.12)}.etv-global-footer__bottom-inner{width:min(1220px,calc(100% - 36px));min-height:62px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:20px;color:#9fb4cc;font-size:12px}.etv-global-footer__security{display:flex;align-items:center;gap:8px}.etv-global-footer__security svg{width:17px;height:17px;fill:none;stroke:#7fc7ff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    body.etv-global-shell :where(input:not([type="checkbox"]):not([type="radio"]),textarea,select){max-width:100%;transition:border-color .2s,box-shadow .2s,background .2s}body.etv-global-shell :where(input:not([type="checkbox"]):not([type="radio"]),textarea,select):focus{outline:none;border-color:var(--etv-blue)!important;box-shadow:0 0 0 4px rgba(7,86,166,.12)!important}body.etv-global-shell :where(.card,.form-card,.formcard,.content-card,.summary-card){transition:transform .24s,box-shadow .24s,border-color .24s}body.etv-global-shell :where(.card,.form-card,.formcard,.content-card,.summary-card):hover{border-color:#c8d9ea;box-shadow:var(--etv-shadow)}
    @media(max-width:960px){.etv-global-nav__menu{display:grid;place-items:center}.etv-global-nav__links{display:none;position:absolute;top:72px;right:0;left:0;max-height:calc(100vh - 72px);overflow:auto;flex-direction:column;align-items:stretch;padding:14px 18px 20px;background:rgba(255,255,255,.98);border-bottom:1px solid var(--etv-line);box-shadow:0 20px 35px rgba(7,26,61,.12)}.etv-global-nav__links.is-open{display:flex}.etv-global-nav__links a,.etv-global-nav__links button{width:100%;min-height:46px;text-align:center}.etv-global-nav__links .etv-assistant-link{margin:5px 0 0}.etv-global-nav__session{display:grid;width:100%;margin:7px 0 0;padding:12px 0 0;border-left:0;border-top:1px solid var(--etv-line)}.etv-global-footer__main{grid-template-columns:1.3fr 1fr;gap:34px}}
    @media(max-width:600px){.etv-global-nav__inner{width:min(100% - 24px,1220px);min-height:64px}.etv-global-nav__brand img{width:37px;height:37px}.etv-global-nav__brand span{font-size:15px}.etv-global-nav__links{top:64px}.etv-global-footer__main{width:min(100% - 32px,1220px);padding:40px 0 28px;grid-template-columns:1fr;gap:28px}.etv-global-footer__bottom-inner{width:min(100% - 32px,1220px);padding:18px 0;flex-direction:column;align-items:flex-start}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
  `;
  document.head.append(style);
}

function pageName() { return (location.pathname.split('/').pop() || 'index.html').toLowerCase(); }

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

async function renderSessionActions(container) {
  const sessionGroup = document.createElement('div');
  sessionGroup.className = 'etv-global-nav__session';
  let supabase;
  try {
    ({ supabase } = await import('./conexion.js'));
  } catch (error) {
    console.warn('La sesión no está disponible temporalmente:', error);
    sessionGroup.append(makeLink('login.html', 'Ingresar'), makeLink('registro.html', 'Crear cuenta'));
    container.append(sessionGroup);
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    sessionGroup.append(makeLink('login.html', 'Ingresar'), makeLink('registro.html', 'Crear cuenta'));
    container.append(sessionGroup);
    return;
  }

  let role = 'User';
  try {
    const { data, error } = await supabase.from('perfiles').select('rol').eq('id', session.user.id).maybeSingle();
    if (error) throw error;
    role = normalizeRole(data?.rol);
  } catch (error) {
    console.warn('No se pudo determinar el rol de la sesión:', error);
  }

  sessionGroup.append(makeLink(
    role === 'Admin' || role === 'Employee' ? 'panel-admin.html' : 'panel-usuario.html',
    role === 'Admin' ? 'Administración' : role === 'Employee' ? 'Gestión' : 'Mis denuncias'
  ));
  const logout = document.createElement('button');
  logout.type = 'button';
  logout.textContent = 'Cerrar sesión';
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    await supabase.auth.signOut();
    location.assign('index.html');
  });
  sessionGroup.append(logout);
  container.append(sessionGroup);
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
  addStyles();
  document.body.classList.add('etv-global-shell');
  const navigation = document.createElement('nav');
  navigation.id = NAV_ID;
  navigation.className = 'etv-global-nav';
  navigation.setAttribute('aria-label', 'Navegación principal');
  const inner = document.createElement('div');
  inner.className = 'etv-global-nav__inner';
  const brand = makeLink('index.html', 'Elige Tu Vida', 'etv-global-nav__brand');
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
  const links = document.createElement('div');
  links.id = 'etv-global-nav-links';
  links.className = 'etv-global-nav__links';
  const assistantLink = makeLink('chat.html', 'Asistente de denuncias', 'etv-assistant-link');
  assistantLink.insertAdjacentHTML('afterbegin', icons.shield);
  links.append(makeLink('index.html', 'Inicio'), assistantLink, makeLink('privacidad.html', 'Privacidad'), makeLink('contacto.html', 'Contacto'));

  function setMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.innerHTML = `${open ? icons.close : icons.menu}<span class="etv-sr-only">${open ? 'Cerrar menú' : 'Abrir menú'}</span>`;
    links.classList.toggle('is-open', open);
  }
  setMenu(false);
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
  inner.append(brand, menu, links);
  navigation.append(inner);
  document.querySelectorAll('body > header').forEach(header => header.classList.add('etv-original-header-hidden'));
  document.querySelectorAll('body > footer').forEach(footer => footer.classList.add('etv-original-footer-hidden'));
  document.body.prepend(navigation);
  document.body.append(createFooter());
  await renderSessionActions(links);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGlobalNavigation, { once: true });
else initGlobalNavigation();
