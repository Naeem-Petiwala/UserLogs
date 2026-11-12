// Native Logs: asks the backend for logs and shows them as a timeline.
(function () {
  const C = window.LOG_CONFIG, N = C.nativeLog, $ = id => document.getElementById(id);
  const S = { logs: [], view: [], shown: 0, ctrl: null, order: 'desc', modules: {}, curMods: [], q: '', lvl: '', after: null, state: {}, req: null, meta: null };
  const CHUNK = 40;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const COPY = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9h10v10H9zM5 15V5h10"/></svg>';
  function toast(m, ok) { const t = $('alert'); t.textContent = m; t.classList.toggle('ok', !!ok); t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.display = 'none'), 2600); }
  const copy = text => navigator.clipboard.writeText(text).then(() => toast('Copied', true), () => toast('Could not copy'));

  // ---------- form ----------
  const isLive = () => $('nlLive').checked;
  const custom = () => !$('customClientInput').classList.contains('hidden');
  const clientId = () => (custom() ? $('customClientField').value : $('param1').value).trim().toUpperCase();
  const typeObj = () => N.types.find(t => t.value === $('nlType').value);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const shift = n => { const d = $('nlDate'), t = new Date((d.value || today()) + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); d.value = t.toISOString().slice(0, 10); };
  function fillClients() {
    const sel = $('param1'), keep = sel.value;
    sel.innerHTML = '<option value="">Select client</option>' + C.clients[isLive() ? 'live' : 'local'].map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
    if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
  }
  function missing() {
    const m = []; if (!clientId()) m.push('client'); if (!$('nlRep').value.trim()) m.push('repcode'); if (!$('nlType').value) m.push('type'); if (!$('nlDate').value) m.push('date'); return m;
  }
  function refresh() {
    const m = missing();
    $('show').setAttribute('aria-disabled', m.length ? 'true' : 'false');
    $('hint').textContent = m.length ? `Still needed: ${m.join(', ')}.` : '';
  }

  // ---------- the backend ----------
  async function post(url, body, sig) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: sig });
    if (r.status === 404) return { notFound: true };
    if (r.status === 401 || r.status === 403) throw new Error(`The server needs a login for this request (${r.status}).`);
    if (!r.ok) { let m = ''; try { const j = await r.json(); m = [j.message, j.error].filter(Boolean).join(': '); } catch (e) {} throw new Error(`The server answered with an error (${r.status})${m ? ': ' + m : ''}.`); }
    return r.json();
  }
  const range = (date, type) => type.range === 'utc'
    ? [new Date(`${date}T00:00:00+05:30`).toISOString(), new Date(`${date}T23:59:59.999+05:30`).toISOString()]   // one IST day, written in UTC
    : [date, date];
  async function loadModules() {
    const id = clientId(), env = isLive() ? 'live' : 'local', key = env + id, inp = $('nlModule');
    S.curMods = []; if (!id) { inp.placeholder = 'Pick a client first'; return; }
    if (!S.modules[key]) {
      inp.placeholder = 'Loading modules (can take up to 20 seconds)…';
      try { const d = await post(N.api[env].module, { clientId: id }); S.modules[key] = (d && (d.data || d.modules)) || []; }
      catch (e) { S.modules[key] = []; inp.placeholder = 'Could not load modules (you can still search)'; return; }
    }
    if (id !== clientId()) return;
    S.curMods = S.modules[key]; inp.placeholder = S.curMods.length ? 'All modules (type to search)' : 'No modules found for this client';
  }
  const prep = l => ({ ...l, _t: +parseTs(l.timestamp) || 0 });
  // Fetch pages one after another. While the backend returns a searchAfter value there is more, so ask again with it.
  async function pull(after) {
    const q = S.req; S.ctrl = new AbortController(); let pages = 0, stopped = false, failed = null;
    loading();
    try {
      do {
        const d = await post(q.url, { ...q.base, search_after: after }, S.ctrl.signal);
        if (d.notFound) { after = null; break; }
        S.logs.push(...(d.data || []).map(prep)); after = d.searchAfter || d.search_after || null; pages++; loading();
      } while (after && pages < N.maxPages);
    } catch (err) {
      if (err.name === 'AbortError') stopped = true;
      else failed = err.message === 'Failed to fetch' ? 'The browser was not allowed to talk to the server (a CORS block), or the server could not be reached. The server has to allow requests from this website before this page can use it.' : err.message;
    }
    S.ctrl = null; S.after = after; S.state = { stopped, failed, cap: !!after && !stopped && !failed };
  }
  async function show() {
    if (missing().length) return refresh();
    const env = isLive() ? 'live' : 'local', t = typeObj(), [s, e] = range($('nlDate').value, t);
    const base = { clientId: clientId(), type: t.value, startDate: s, endDate: e, repcode: $('nlRep').value.trim().toUpperCase() };
    const mod = $('nlModule').value.trim(); if (mod) base.moduleType = mod;
    S.req = { url: N.api[env].search, base }; S.logs = []; S.q = ''; S.lvl = ''; S.order = 'desc'; $('nlErr').hidden = true;
    S.meta = { client: base.clientId, rep: base.repcode, type: t.value, date: $('nlDate').value, module: mod };
    await pull(null);
    if (S.state.failed && !S.logs.length) { placeholder('Nothing loaded yet.'); $('nlErr').textContent = S.state.failed; $('nlErr').hidden = false; return; }
    results(); indexLater();
  }
  async function loadRest() { await pull(S.after); results(); indexLater(); }
  function placeholder(t) { const r = $('results'); r.innerHTML = ''; r.append(Object.assign(el('div', 'state'), { textContent: t })); }
  function loading() {
    const r = $('results'); r.innerHTML = '';
    const c = el('div', 'state'); c.append(el('div', 'spin'), el('div', '', S.logs.length ? `Loaded ${S.logs.length} logs so far…` : 'Fetching logs…'));
    const b = el('button', 'btn danger sm', 'Cancel'); b.type = 'button'; b.onclick = () => S.ctrl && S.ctrl.abort(); c.append(b); r.append(c);
  }

  // ---------- timestamps ----------
  const parseTs = ts => new Date(String(ts).replace(/(\.\d{3})\d+/, '$1'));
  const FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  function fmtTs(ts) {
    const d = parseTs(ts); if (isNaN(d)) return String(ts);
    const p = Object.fromEntries(FMT.formatToParts(d).map(x => [x.type, x.value]));
    return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}:${p.second}.${String(d.getMilliseconds()).padStart(3, '0')} ${p.dayPeriod.toLowerCase()} IST`;
  }

  // ---------- results ----------
  const msgText = l => typeof l.message === 'string' ? l.message : JSON.stringify(l.message, null, 2);
  const hay = l => l._s !== undefined ? l._s : (l._s = ((l.module || '') + ' ' + (typeof l.message === 'string' ? l.message : JSON.stringify(l.message))).toLowerCase());
  function indexLater() {   // prepares the search text of every log a little at a time while you read
    const set = S.logs; let i = 0;
    (function step() { const end = performance.now() + 10; while (i < set.length && performance.now() < end) hay(set[i++]); if (i < set.length && set === S.logs) setTimeout(step, 0); })();
  }
  function filtered() {
    const q = S.q.toLowerCase(), v = S.logs.filter(l => (!S.lvl || l.message_type === S.lvl) && (!q || hay(l).includes(q)));
    return v.sort((a, b) => S.order === 'desc' ? b._t - a._t : a._t - b._t);
  }
  function results() {
    const m = S.meta, r = $('results'), st = S.state; r.innerHTML = '';
    if (!S.logs.length) { const c = el('div', 'state'); c.append(el('div', '', st.stopped ? 'Stopped before any logs were loaded.' : 'No logs found for these details.'), el('div', 'nl-hint', st.stopped ? 'Press Show logs to try again.' : 'Check the repcode, date and type, or try another module.')); r.append(c); return; }
    const head = el('div', 'rhead'), chips = el('div', 'chips');
    chips.append(el('span', 'chip ok', `${S.logs.length} logs`), el('span', 'chip', m.client), el('span', 'chip', m.rep), el('span', 'chip', m.type), el('span', 'chip', m.date));
    if (m.module) chips.append(el('span', 'chip', m.module));
    const dl = el('div', 'chips'), bt = el('button', 'btn sm'), bj = el('button', 'btn sm'); bt.type = bj.type = 'button';
    bt.onclick = () => download('txt'); bj.onclick = () => download('json'); dl.append(bt, bj); head.append(chips, dl); r.append(head);
    if (S.after) {   // the backend still has more logs than we have loaded
      const bn = el('div', 'banner'), why = st.stopped ? 'You stopped loading.' : st.failed ? `Loading stopped part-way (${st.failed})` : `Paused after ${N.maxPages} pages.`;
      const b = el('button', 'btn sm', 'Load the rest'); b.type = 'button'; b.onclick = loadRest;
      bn.append(el('span', '', `${why} ${S.logs.length} logs loaded, the server has more.`), b); r.append(bn);
    }
    const tb = el('div', 'tb'), q = el('input'); q.type = 'search'; q.placeholder = 'Search in these logs…'; q.setAttribute('aria-label', 'Search logs'); q.autocomplete = 'off'; q.value = S.q;
    const lv = el('select'); lv.setAttribute('aria-label', 'Level'); lv.innerHTML = '<option value="">All levels</option>' + [...new Set(S.logs.map(l => l.message_type).filter(Boolean))].map(x => `<option>${x}</option>`).join(''); lv.value = S.lvl;
    const so = el('button', 'btn sm', S.order === 'desc' ? 'Newest first' : 'Oldest first'); so.type = 'button';
    const cnt = el('span', 'nl-hint'); tb.append(q, lv, so, cnt); r.append(tb);
    const list = el('div', 'nl-list'); r.append(list);
    const draw = () => { S.view = filtered(); S.shown = 0; list.innerHTML = ''; list.scrollTop = 0; next(); };
    const next = () => {
      S.view.slice(S.shown, S.shown + CHUNK).forEach(l => list.append(entry(l))); S.shown = Math.min(S.shown + CHUNK, S.view.length);
      cnt.textContent = S.view.length === S.logs.length ? '' : `${S.view.length} of ${S.logs.length} match`;
      bt.textContent = `Download .txt (${S.view.length})`; bj.textContent = `Download .json (${S.view.length})`;
      bt.title = bj.title = `Downloads all ${S.view.length} loaded logs that match the search and level, not only the ones on screen.`;
      if (!S.view.length) list.append(el('div', 'state', 'No logs match your search.'));
      else if (S.shown < S.view.length && list.scrollHeight <= list.clientHeight) next();
    };
    list.onscroll = () => { if (S.shown < S.view.length && list.scrollTop + list.clientHeight > list.scrollHeight - 400) next(); };   // load more as you scroll
    let tm; q.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { S.q = q.value.trim(); draw(); }, 300); };
    lv.onchange = () => { S.lvl = lv.value; draw(); };
    so.onclick = () => { S.order = S.order === 'desc' ? 'asc' : 'desc'; so.textContent = S.order === 'desc' ? 'Newest first' : 'Oldest first'; draw(); };
    draw();
  }
  function mark(node, text, q) {
    node.textContent = ''; if (!q) { node.textContent = text; return; }
    const low = text.toLowerCase(), ql = q.toLowerCase(); let from = 0, at, n = 0;
    while (n < 30 && (at = low.indexOf(ql, from)) !== -1) { node.append(text.slice(from, at), el('mark', '', text.slice(at, at + q.length))); from = at + q.length; n++; }
    node.append(text.slice(from));
  }
  // ---- colored, foldable JSON (built from DOM nodes, so log text can never inject HTML) ----
  // Logs can hold lists with thousands of entries. To keep the page fast:
  //  - a box only builds about 1500 nodes up front (bud.n); everything else is built when you unfold it,
  //  - lists with more than 100 entries start folded and show 100 at a time,
  //  - search never unfolds a big list by itself, it only says "has matches" on the fold line.
  const CH = 100;
  function has(v, ql, b) {   // bounded search inside a value, true as soon as one match is seen
    if (b.n-- <= 0) return false;
    if (v !== null && typeof v === 'object') { for (const k in v) { if (k.toLowerCase().includes(ql) || has(v[k], ql, b)) return true; if (b.n <= 0) return false; } return false; }
    return String(v).toLowerCase().includes(ql);
  }
  function tok(cls, text, q) { const s = el('span', cls); mark(s, text, q); return s; }
  function jnode(key, v, q, comma, bud) {
    bud.n--;
    const row = el('div', 'jrow'), cm = () => comma && row.append(el('span', 'jp', ','));
    if (key !== null) row.append(tok('jk', JSON.stringify(key), q), el('span', 'jp', ': '));
    if (v === null || typeof v !== 'object') {
      row.append(v === null ? tok('jn', 'null', q) : typeof v === 'string' ? tok('js', JSON.stringify(v), q) : tok(typeof v === 'boolean' ? 'jb' : 'jv', String(v), q)); cm(); return row;
    }
    const arr = Array.isArray(v), ent = arr ? v.map(x => [null, x]) : Object.entries(v);
    if (!ent.length) { row.append(el('span', 'jp', arr ? '[]' : '{}')); cm(); return row; }
    const ql = q ? q.toLowerCase() : '', hit = ql && has(v, ql, { n: 4000 });
    const kids = el('div', 'jc'), fold = el('button', 'fold', '▾'), more = el('button', 'jmore'); fold.type = more.type = 'button';
    let shown = 0, built = false;
    const showMore = () => {
      const end = Math.min(shown + CH, ent.length); for (let i = shown; i < end; i++) kids.append(jnode(ent[i][0], ent[i][1], q, i < ent.length - 1, bud));
      shown = end; more.hidden = shown >= ent.length; more.textContent = `Show ${Math.min(CH, ent.length - shown)} more (${ent.length - shown} left)`;
    };
    const build = () => { if (!built) { built = true; showMore(); } };
    more.onclick = showMore; more.hidden = true;
    const open = bud.n > 0 && (ent.length <= 15 || (hit && ent.length <= CH));   // small lists open, medium lists open when they match
    if (open) build(); else row.classList.add('col');
    fold.setAttribute('aria-expanded', String(open)); fold.setAttribute('aria-label', 'Fold or unfold');
    fold.onclick = () => { const c = row.classList.toggle('col'); if (!c) build(); fold.setAttribute('aria-expanded', String(!c)); };
    row.append(fold, el('span', 'jp', arr ? '[' : '{'), el('span', 'jsum', ` ${ent.length} ${arr ? 'items' : 'keys'}${hit && !open ? ' · has matches' : ''} `), kids, more, el('span', 'jp', arr ? ']' : '}')); cm(); return row;
  }
  function pane(title, value) {   // the text for the copy button is made only when you click it
    const w = el('div'), h = el('div', 'pane-h'), b = el('button', 'copy'); b.type = 'button'; b.innerHTML = COPY; b.title = 'Copy'; b.setAttribute('aria-label', 'Copy ' + title.toLowerCase());
    const plain = () => value !== null && typeof value === 'object' ? JSON.stringify(value, null, 2) : value === undefined ? '' : String(value);
    b.onclick = () => copy(plain());
    h.append(el('span', '', title), b); w.append(h);
    if (value !== null && typeof value === 'object') { const box = el('div', 'json'); box.append(jnode(null, value, S.q, false, { n: 1500 })); w.append(box); }
    else { const t = plain(), p = el('pre'); if (!t) p.className = 'empty'; mark(p, t || '(empty)', t ? S.q : ''); w.append(p); }
    return w;
  }
  function entry(l) {
    const a = el('article', 'log'), h = el('div', 'lh'), t = el('time', '', fmtTs(l.timestamp)); t.title = String(l.timestamp);
    h.append(t); if (l.message_type) h.append(el('span', 'lvl ' + l.message_type, l.message_type));
    h.append(el('code', 'mod', l.module || ''));
    const b = el('button', 'copy'); b.type = 'button'; b.innerHTML = COPY; b.title = 'Copy this log'; b.setAttribute('aria-label', 'Copy this log'); b.onclick = () => copy(`${fmtTs(l.timestamp)} ${l.module}\n${msgText(l)}`); h.append(b); a.append(h);
    const m = l.message, web = m && typeof m === 'object' && ('Request' in m || 'Response' in m), ps = el('div', 'panes' + (web ? '' : ' one'));
    if (web) ps.append(pane('Request', m.Request), pane('Response', m.Response));
    else ps.append(pane('Message', m));
    a.append(ps); return a;
  }
  function download(kind) {   // uses every loaded log that matches the search and level, not just the rendered ones
    const v = filtered(), m = S.meta, name = `${m.client}_${m.rep}_${m.date}_${m.type}.${kind}`;
    const body = kind === 'json' ? JSON.stringify(v, (k, x) => (k === '_t' || k === '_s' ? undefined : x), 2)
      : v.map(l => `[${fmtTs(l.timestamp)}] [${l.message_type || ''}] ${l.module || ''}\n${msgText(l)}\n`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Downloaded ${v.length} logs${S.after ? ' (the server has more, press Load the rest first)' : ''}`, !S.after);
  }

  // ---------- module picker ----------
  function combo() {
    const inp = $('nlModule'), list = $('modList'), clr = $('modClear'); let opts = [], act = -1;
    const parts = m => { const i = m.lastIndexOf('/'); return i > 0 && i < m.length - 1 ? [m.slice(i + 1), m.slice(0, i)] : [m, '']; };
    function draw() {
      const q = inp.value.trim().toLowerCase(); opts = ['', ...S.curMods.filter(m => !q || m.toLowerCase().includes(q)).slice(0, 150)]; list.innerHTML = '';
      opts.forEach((m, i) => { const o = el('div', 'opt' + (i === act ? ' on' : '') + (m ? '' : ' none')); o.dataset.i = i; o.setAttribute('role', 'option');
        if (!m) o.append(el('b', '', 'All modules')); else { const [a, b] = parts(m); o.append(el('b', '', a)); if (b) o.append(el('small', '', b)); o.title = m; } list.append(o); });
      if (opts.length === 1 && q) list.append(el('div', 'opt none', 'No module matches. It will be sent as typed.'));
    }
    function place() {
      const r = inp.getBoundingClientRect(), below = innerHeight - r.bottom - 12, up = below < 120 && r.top > below;
      list.style.left = r.left + 'px'; list.style.width = r.width + 'px'; list.style.maxHeight = Math.max(120, Math.min(280, up ? r.top - 12 : below)) + 'px';
      if (up) { list.style.top = 'auto'; list.style.bottom = innerHeight - r.top + 4 + 'px'; } else { list.style.bottom = 'auto'; list.style.top = r.bottom + 4 + 'px'; }
    }
    const close = () => { list.hidden = true; inp.setAttribute('aria-expanded', 'false'); };
    const open = () => { if (!S.curMods.length) return close(); draw(); list.hidden = false; place(); inp.setAttribute('aria-expanded', 'true'); };
    const pick = v => { inp.value = v; clr.hidden = !v; close(); refresh(); };
    let quiet = false; inp.addEventListener('focus', () => { if (quiet) return; act = -1; open(); }); inp.addEventListener('click', () => { if (list.hidden) open(); });
    inp.addEventListener('input', () => { act = -1; clr.hidden = !inp.value; open(); });
    inp.addEventListener('blur', close);
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (list.hidden) open(); act = Math.max(0, Math.min(opts.length - 1, act + (e.key === 'ArrowDown' ? 1 : -1))); draw(); const on = list.querySelector('.on'); on && on.scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' && !list.hidden && act >= 0) { e.preventDefault(); e.stopPropagation(); pick(opts[act]); }
      else if (e.key === 'Escape') close();
    });
    list.addEventListener('mousedown', e => { e.preventDefault(); const o = e.target.closest('.opt[data-i]'); if (o) pick(opts[+o.dataset.i]); });
    clr.addEventListener('click', () => { pick(''); quiet = true; inp.focus(); quiet = false; });   // keep focus without reopening the list
    ['resize', 'scroll'].forEach(ev => addEventListener(ev, e => { if (!list.hidden && !list.contains(e.target)) close(); }, true));
  }

  // ---------- wiring ----------
  function init() {
    $('nlType').innerHTML = '<option value="">Select type</option>' + N.types.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
    $('nlDate').value = today(); fillClients(); refresh(); combo();
    placeholder('Choose the details on the left and press Show logs.');
    const resetMod = () => { $('nlModule').value = ''; $('modClear').hidden = true; };
    $('nlLive').addEventListener('change', () => { $('nlEnvTxt').textContent = isLive() ? 'Live service' : 'Local service'; fillClients(); resetMod(); loadModules(); refresh(); });
    $('param1').addEventListener('change', () => { resetMod(); loadModules(); refresh(); });
    let mt; $('customClientField').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); clearTimeout(mt); mt = setTimeout(() => { resetMod(); loadModules(); }, 500); refresh(); });
    $('customClientBtn').addEventListener('click', () => {
      const off = $('customClientInput').classList.toggle('hidden'); $('dropdownClientInput').classList.toggle('hidden');
      $('customClientBtn').textContent = off ? 'Enter a custom client ID' : 'Choose from the list'; $('customClientField').value = ''; resetMod(); loadModules(); refresh();
    });
    $('prevDay').onclick = () => { shift(-1); refresh(); }; $('nextDay').onclick = () => { shift(1); refresh(); };
    ['input', 'change'].forEach(e => $('nlForm').addEventListener(e, refresh));
    $('show').addEventListener('click', show);
    $('nlForm').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); show(); } });
  }
  init();
})();
