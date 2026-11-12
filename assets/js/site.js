/* Site shell: builds the header, the page menu, the theme switch and the footer on every page.
   TO ADD A PAGE: 1) add one line to PAGES below.  2) create pages/<name>/index.html and put
   <body data-page="<id>"> and <script src="../../assets/js/site.js"></script> at the top of its body.
   (See README.md for a copy-and-paste page template.) */
(function () {
  const SITE = { name: 'User Logs', version: '4.0', author: 'Naeem', linkedin: 'https://www.linkedin.com/in/naeempetiwala' };
  const PAGES = [
    { id: 'logs',        label: 'Logs',              href: 'index.html' },
    { id: 'native-logs', label: 'Native Logs',       href: 'pages/native-logs/index.html' },
    { id: 'builds',      label: 'Native Builds',     href: 'pages/builds/index.html' },
    { id: 'links',       label: 'Important Links',   href: 'pages/links/index.html' },
    { id: 'json',        label: 'JSON Viewer',       href: 'pages/json-viewer/index.html' },
    { id: 'compare',     label: 'Text Compare',      href: 'pages/text-compare/index.html' },
    { id: 'sql',         label: 'SQL Script Viewer', href: 'pages/sql/index.html' },
    { id: 'aes',         label: 'AES Tool',          href: 'pages/aes/index.html' }
  ];
  const ADMIN = { id: 'admin', label: 'Admin', href: 'pages/admin/index.html' };

  const root = new URL('../../', document.currentScript.src);       // site folder, found from this file's own address
  const here = document.body.dataset.page, url = p => new URL(p, root).href;
  const link = (p, extra) => `<a class="nav-link${extra || ''}${p.id === here ? ' active' : ''}" href="${url(p.href)}"${p.id === here ? ' aria-current="page"' : ''}>`;

  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML =
    `<a class="brand" href="${url('index.html')}"><span class="brand-mark">UL</span>${SITE.name}</a>` +
    `<nav class="tool-nav" aria-label="Pages">${PAGES.map(p => link(p) + p.label + '</a>').join('')}</nav>` +
    link(ADMIN, ' admin-link') + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Admin</a>' +
    '<button type="button" class="theme-btn" id="themeBtn" title="Switch theme" aria-label="Switch theme"><svg id="themeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></svg></button>';
  document.body.prepend(header);

  // theme switch (the choice is remembered in the browser)
  const rootEl = document.documentElement, icon = document.getElementById('themeIcon');
  const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  const MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  const paint = () => { icon.innerHTML = rootEl.dataset.theme === 'dark' ? MOON : SUN; };
  paint();
  document.getElementById('themeBtn').addEventListener('click', () => {
    rootEl.dataset.theme = rootEl.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('ul-theme', rootEl.dataset.theme); } catch (e) {}
    paint();
  });

  // footer
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.site-foot')) return;
    const f = document.createElement('footer'); f.className = 'site-foot';
    f.innerHTML = `<a href="${SITE.linkedin}" target="_blank" rel="noopener">Made by ${SITE.author}</a><span>Version ${SITE.version}</span>`;
    document.body.append(f);
  });
})();
