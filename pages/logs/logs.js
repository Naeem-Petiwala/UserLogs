// Logic for the User Logs page. Data comes from config.js; nothing about clients or URLs is hard-coded here.
(function () {
  const C = window.LOG_CONFIG, $ = id => document.getElementById(id);
  const byId = Object.fromEntries(C.logTypes.map(t => [t.id, t]));
  const SEND = 'M7 17 17 7M8 7h9v9', COPY = 'M9 9h10v10H9zM5 15V5h10';

  // ---- 1. read the form -> one state object ----
  function readState() {
    const custom = !$('customClientInput').classList.contains('hidden');
    return { live: $('myCheckbox').checked, localEnv: $('localDrop').value, custom,
      client: custom ? $('customClientField').value : $('param1').value, date: $('param2').value, rep: $('param3').value };
  }
  const dmy = d => { const p = d.split('-'); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d; };
  const ymd = d => { const p = d.split('-'); return p.length === 3 ? p.join('') : d; };
  function tokens(s) {
    const client = encodeURIComponent(s.client).toLowerCase();
    return { client, CLIENT: client.toUpperCase(), date: dmy(s.date), ymd: ymd(s.date), rep: encodeURIComponent(s.rep.toUpperCase()) };
  }
  const fill = (tpl, k) => tpl.replace(/\{(\w+)\}/g, (_, n) => k[n]);

  // ---- 2. state -> URL (pure, no page access) ----
  function urlFor(type, s) {
    const k = tokens(s), sun = C.sunIntClients.includes(k.client);
    let store, direct = false;
    if (s.live) store = type.sunInt && sun ? 'sunInt' : 'live';
    else {
      const env = C.localEnvs.find(e => e.value === s.localEnv) || C.localEnvs[0];
      if (type.localMap) store = type.localMap[env.value] || type.localMap.default;
      else { store = env.storage; direct = !!env.direct; }
    }
    return { url: C.storages[store] + '/' + fill(type.path, k), direct: direct || sun }; // sunInt clients are never checked
  }
  function missingFor(needs, s) {
    const m = [];
    if (needs.includes('client') && !s.client.trim()) m.push('client');
    if (needs.includes('date') && !s.date) m.push('date');
    if (needs.includes('rep') && !s.rep.trim()) m.push('rep code');
    return m;
  }
  // an "action" is one button: which links it opens and what it still needs
  const actions = () => [
    ...C.logTypes.map(t => ({ id: t.id, group: t.group, label: t.label, needs: t.needs, live: false, copy: true,
      links: s => [urlFor(t, s)] })),
    { id: 'all', label: C.all.label, needs: C.all.needs, live: true, head: true, sync: true,
      links: s => C.all.opens.map(i => urlFor(byId[i], s)) },
    { id: 'obj', label: C.reportObject.label, needs: C.reportObject.needs, live: true, head: true, direct: true,
      links: s => { const k = tokens(s); const c = s.custom ? k.client : encodeURIComponent(s.client);
        return [{ url: C.storages.live + '/' + fill(C.reportObject.path, { client: c, rep: encodeURIComponent(s.rep) }), direct: true }]; } }
  ];
  const ACTIONS = actions();

  // ---- 3. screen ----
  const svg = d => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  function build() {
    const groups = {};
    ACTIONS.filter(a => a.group).forEach(a => (groups[a.group] = groups[a.group] || []).push(a));
    $('groups').innerHTML = Object.entries(groups).map(([g, list]) => `<div class="group"><div class="group-head">${g}</div><div class="group-btns">` +
      list.map(a => `<div class="act"><button type="button" class="downloadBtn" data-a="${a.id}">${a.label}</button>` +
        `<button type="button" class="copy-btn" data-copy="${a.id}" aria-label="Copy ${a.label} link" title="Copy link">${svg(COPY)}</button></div>`).join('') + '</div></div>').join('');
    const pill = $('modePill');
    ACTIONS.filter(a => a.head).forEach(a => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'downloadBtn' + (a.id === 'all' ? ' primary' : ''); b.dataset.a = a.id; b.textContent = a.label;
      pill.before(b);
    });
  }
  let hintDefault = '';
  function render() {
    const s = readState(), live = s.live; let need = new Set(), ready = [];
    document.querySelectorAll('[data-a]').forEach(b => {
      const a = ACTIONS.find(x => x.id === b.dataset.a), m = missingFor(a.needs, s);
      b.hidden = a.live && !live; b.setAttribute('aria-disabled', m.length ? 'true' : 'false'); b.dataset.missing = m.join(' and ');
      if (!b.hidden) { m.forEach(x => need.add(x)); if (!m.length) ready.push(a.label); }
      const c = document.querySelector(`[data-copy="${a.id}"]`);
      if (c) c.setAttribute('aria-disabled', m.length ? 'true' : 'false');
    });
    hintDefault = need.size ? `Still needed: ${[...need].join(', ')}.${ready.length ? ' Ready now: ' + ready.join(', ') + '.' : ''}` : 'Hover or focus a button to see its link.';
    if (!$('previewUrl').dataset.pinned) $('previewUrl').textContent = hintDefault;
  }
  let tm; const later = () => { clearTimeout(tm); tm = setTimeout(render, 0); };

  // ---- 4. actions ----
  function toast(msg, ok) {
    const t = $('alert'); t.textContent = msg; t.classList.toggle('ok', !!ok); t.style.display = 'block';
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.display = 'none'), 3000);
  }
  function resolve(id) {
    const a = ACTIONS.find(x => x.id === id), s = readState(), m = missingFor(a.needs, s);
    return { a, s, m, links: m.length ? [] : a.links(s) };
  }
  function run(id) {
    const { a, s, m, links } = resolve(id);
    if (m.length) return toast(`Add the ${m.join(' and ')} first.`);
    const openAll = () => links.forEach(l => window.open(l.url, '_blank'));
    if (a.sync || a.direct || links[0].direct) return openAll();
    const k = tokens(s);
    fetch(links[0].url).then(r => {
      if (r.body && r.body.cancel) r.body.cancel();
      r.ok ? openAll() : toast(`Logs for ${k.rep}_${k.client}_${k.date} not found`);
    }).catch(openAll); // if the browser blocks the check, just open the link
  }
  function copy(id) {
    const { m, links } = resolve(id);
    if (m.length) return toast(`Add the ${m.join(' and ')} first.`);
    navigator.clipboard.writeText(links.map(l => l.url).join('\n')).then(() => toast('Link copied', true), () => toast('Could not copy the link'));
  }
  function preview(id) {
    const { m, links } = resolve(id), p = $('previewUrl');
    p.dataset.pinned = '1';
    p.textContent = m.length ? `Needs the ${m.join(' and ')}` : links[0].url + (links.length > 1 ? `  (+${links.length - 1} more)` : '');
  }
  function unpreview() { const p = $('previewUrl'); delete p.dataset.pinned; p.textContent = hintDefault; }

  // ---- 5. lists and controls ----
  function fillClients() {
    const sel = $('param1'), keep = sel.value, list = C.clients[$('myCheckbox').checked ? 'live' : 'local'];
    sel.innerHTML = list.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
    if (list.some(c => c[0] === keep)) sel.value = keep;
  }
  const dayShift = n => { const d = $('param2'), t = new Date((d.value || today()) + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); d.value = t.toISOString().slice(0, 10); };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const stepClient = n => { const s = $('param1'); s.selectedIndex = (s.selectedIndex + n + s.options.length) % s.options.length; };

  function init() {
    build();
    $('localDrop').innerHTML = C.localEnvs.map(e => `<option value="${e.value}">${e.text}</option>`).join('');
    $('param2').value = today(); fillClients();
    $('myCheckbox').addEventListener('change', () => { $('dropdownContainer').classList.toggle('hidden', $('myCheckbox').checked); fillClients(); render(); });
    $('customClientBtn').addEventListener('click', () => {
      const on = $('customClientInput').classList.toggle('hidden');
      $('dropdownClientInput').classList.toggle('hidden'); $('customClientBtn').classList.toggle('active');
      $('customClientBtn').textContent = on ? 'Enter a custom client ID' : 'Choose from the list';
      if (on) $('customClientField').value = '';
    });
    $('customClientField').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    $('backArrow').addEventListener('click', () => dayShift(-1));
    $('forwardArrow').addEventListener('click', () => dayShift(1));
    $('downArrow').addEventListener('click', () => stepClient(-1));
    $('upArrow').addEventListener('click', () => stepClient(1));
    // keyboard shortcuts work only when you are not typing in a field
    document.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowLeft') dayShift(-1); else if (e.key === 'ArrowRight') dayShift(1);
      else if (e.key === 'ArrowUp') { e.preventDefault(); stepClient(-1); } else if (e.key === 'ArrowDown') { e.preventDefault(); stepClient(1); }
    });
    const form = $('urlForm');
    form.addEventListener('click', e => {
      const b = e.target.closest('[data-a],[data-copy]'); if (!b) return;
      b.dataset.a ? run(b.dataset.a) : copy(b.dataset.copy);
    });
    ['mouseover', 'focusin'].forEach(ev => form.addEventListener(ev, e => { const b = e.target.closest('[data-a],[data-copy]'); if (b) preview(b.dataset.a || b.dataset.copy); }));
    ['mouseout', 'focusout'].forEach(ev => form.addEventListener(ev, e => { if (e.target.closest('[data-a],[data-copy]')) unpreview(); }));
    ['input', 'change', 'click'].forEach(ev => document.addEventListener(ev, later));
    render();
  }
  init();
})();
