// JSON Viewer screen. The engine is in jv-core.js and jv-tools.js.
(function () {
  const J = window.JV, { O, Lex } = J, $ = id => document.getElementById(id);
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const S = { docs: [], cur: 0, value: undefined, valid: false, tab: 'viewer', root: null, sel: null, mode: 'find', matches: [], mi: -1, b: '', conv: 'csv', xmlRoot: 'root', note: '' };
  const unit = () => { const x = $('jvIndent').value; return x === 'tab' ? '\t' : ' '.repeat(+x); };
  const size = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const body = $('jvBody'), doc = () => S.docs[S.cur];
  function toast(m, ok) { const t = $('alert'); t.textContent = m; t.classList.toggle('ok', !!ok); t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.display = 'none'), 2600); }
  const copy = (t, msg) => navigator.clipboard.writeText(t).then(() => toast(msg || 'Copied', true), () => toast('Could not copy'));
  function save(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  function dialog(title, nodes, ok, onOk, opt = {}) {
    const d = $('jvDlg'); $('jvDlgTitle').textContent = title; const b = $('jvDlgBody'); b.innerHTML = ''; nodes.forEach(n => b.append(n));
    const err = $('jvDlgErr'); err.hidden = true; $('jvDlgOk').textContent = ok || 'OK'; $('jvDlgOk').hidden = !onOk; $('jvDlgNo').textContent = onOk ? 'Cancel' : 'Close';
    $('jvDlgForm').onsubmit = async e => { e.preventDefault(); if (!onOk) return d.close(); try { const r = await onOk(); if (r !== false) d.close(); } catch (x) { err.textContent = x.message; err.hidden = false; } };
    $('jvDlgNo').onclick = () => d.close(); d.showModal(); const f = b.querySelector('input,textarea'); if (f) f.focus();
  }
  const field = (label, ctl) => { const w = el('div'); w.append(Object.assign(el('label'), { textContent: label }), ctl); return w; };

  // ---------- documents (tabs on the left) ----------
  let nextId = 1;
  function newDoc(text, title) { const d = { id: nextId++, title: title || 'Untitled ' + (S.docs.length + 1), text: text || '', hist: [] }; S.docs.push(d); return d; }
  function renderDocs() {
    const bar = $('jvDocs'); bar.innerHTML = '';
    S.docs.forEach((d, i) => {
      const t = el('div', 'jv-doc' + (i === S.cur ? ' on' : '')); t.setAttribute('role', 'tab'); t.append(el('span', '', d.title)); t.title = d.title;
      if (S.docs.length > 1) { const x = el('b', '', '×'); x.title = 'Close'; x.onclick = e => { e.stopPropagation(); closeDoc(i); }; t.append(x); }
      t.onclick = () => switchDoc(i); bar.append(t);
    });
    const add = el('button', 'jv-docadd', '+'); add.type = 'button'; add.title = 'New tab'; add.setAttribute('aria-label', 'New tab'); add.onclick = () => { switchDoc(S.docs.indexOf(newDoc(''))); $('jvIn').focus(); }; bar.append(add);
    const r = el('label', 'jv-rem'), cb = el('input'); cb.type = 'checkbox'; cb.checked = localStorage.getItem('jv-remember') === '1'; cb.onchange = () => { try { if (cb.checked) { localStorage.setItem('jv-remember', '1'); persist(); } else { localStorage.removeItem('jv-remember'); localStorage.removeItem('jv-docs'); } } catch (e) {} };
    r.title = 'Keeps your tabs in this browser only. Turn it off to delete the saved copy.'; r.append(cb, 'Remember tabs'); bar.append(r);
  }
  function switchDoc(i) { doc().text = $('jvIn').value; S.cur = i; $('jvIn').value = doc().text; S.note = ''; renderDocs(); check(); undoState(); }
  function closeDoc(i) { if (S.docs.length < 2) return; S.docs.splice(i, 1); S.cur = Math.min(S.cur >= i ? Math.max(0, S.cur - (S.cur === i ? 0 : 1)) : S.cur, S.docs.length - 1); $('jvIn').value = doc().text; renderDocs(); check(); undoState(); persist(); }
  let pt; function persist() { if (localStorage.getItem('jv-remember') !== '1') return; clearTimeout(pt); pt = setTimeout(() => { try { doc().text = $('jvIn').value; localStorage.setItem('jv-docs', JSON.stringify(S.docs.map(d => ({ title: d.title, text: d.text })))); } catch (e) { toast('Too big to remember in this browser'); } }, 600); }

  // ---------- reading the input ----------
  function status(cls, node) { const s = $('jvStatus'); s.className = 'jv-status ' + cls; s.innerHTML = ''; s.append(node); }
  function empty(msg) { body.innerHTML = ''; body.append(el('div', 'jv-empty', msg)); S.root = null; S.sel = null; $('jvPath').hidden = true; $('jvMeta').innerHTML = ''; }
  function check() {
    const raw = $('jvIn').value.replace(/^\uFEFF/, ''); S.value = undefined; S.valid = false; S.matches = []; S.mi = -1;
    if (!raw.trim()) { status('', document.createTextNode('Paste or load some JSON to start.')); renderTab(); return; }
    try {
      S.value = J.parse(raw); S.valid = true; status('ok', document.createTextNode(S.note || 'Valid JSON')); S.note = '';
    } catch (e) {
      const { line, col, start } = J.lineCol(raw, e.pos == null ? 0 : e.pos), box = el('div'); box.append(el('div', '', `Line ${line}, column ${col}: ${e.message}.`));
      const end = raw.indexOf('\n', start), ln = raw.slice(start, end === -1 ? undefined : end).replace(/\r$/, ''), from = Math.max(0, col - 60), pre = el('pre');
      pre.textContent = (from ? '…' : '') + ln.slice(from, from + 120) + '\n' + ' '.repeat(col - 1 - from + (from ? 1 : 0)) + '^'; box.append(pre);
      const g = el('button', 'btn sm', 'Go to the error'); g.type = 'button'; g.onclick = () => { const ta = $('jvIn'); ta.focus(); ta.setSelectionRange(e.pos, Math.min(e.pos + 1, ta.value.length)); ta.scrollTop = Math.max(0, (line - 4) * parseFloat(getComputedStyle(ta).lineHeight)); };
      const f = el('button', 'btn sm', 'Try to fix'); f.type = 'button'; f.onclick = fixIt; f.style.marginLeft = '8px'; box.append(g, f); status('bad', box);
    }
    renderTab(); persist();
  }
  let tm; const later = () => { clearTimeout(tm); tm = setTimeout(check, $('jvIn').value.length > 2e6 ? 700 : 250); };

  // ---------- changing the text from a button (with undo) ----------
  function undoState() { $('jvUndo').disabled = !doc().hist.length; }
  function commit(text, idxPath) {
    const ta = $('jvIn'); if (ta.value !== text) { doc().hist.push(ta.value); if (doc().hist.length > 30) doc().hist.shift(); ta.value = text; }
    check(); undoState(); if (idxPath && S.tab === 'viewer') reveal(idxPath);
  }
  const need = () => { if (!S.valid) { toast('Fix the error first.'); return false; } return true; };
  function fixIt() {
    const raw = $('jvIn').value.replace(/^\uFEFF/, '');
    try { J.parse(raw); toast('Nothing to fix. The JSON is valid.'); return; } catch (e) {}
    const fx = {};
    try { const v = J.parse(raw, { lenient: true, fixes: fx }), names = { comments: 'comments removed', trailingCommas: 'trailing commas removed', singleQuotes: 'single-quoted texts converted', unquotedKeys: 'keys given quotes', pythonWords: 'True/False/None converted' };
      S.note = 'Repaired: ' + Object.entries(fx).map(([k, n]) => `${n} ${names[k]}`).join(', '); commit(J.write(v, unit())); }
    catch (e) { const { line, col } = J.lineCol(raw, e.pos || 0); toast(`Could not repair it automatically. Line ${line}, column ${col}: ${e.message}.`); }
  }
  const actions = {
    format: () => need() && (S.note = 'Formatted', commit(J.write(S.value, unit()))),
    minify: () => need() && (S.note = 'Minified', commit(J.write(S.value, ''))),
    sort: () => need() && (S.note = 'Keys sorted A to Z', commit(J.write(J.sortKeys(S.value), unit()))),
    undo: () => { const d = doc(); if (!d.hist.length) return; $('jvIn').value = d.hist.pop(); check(); undoState(); }
  };

  // ---------- the tree ----------
  const CH = 100, STR = 3000;
  function mk(t) { const m = document.createElement('mark'); m.textContent = t; return m; }
  function mark(node, text, hl) {
    const low = hl.cs ? text : text.toLowerCase(), q = hl.cs ? hl.q : hl.q.toLowerCase(); let from = 0, at, n = 0; node.textContent = '';
    while (n < 30 && (at = low.indexOf(q, from)) !== -1) { node.append(text.slice(from, at), mk(text.slice(at, at + q.length))); from = at + q.length; n++; }
    node.append(text.slice(from));
  }
  function tok(cls, text, ctx, part) { const s = el('span', cls), h = ctx && ctx.hl; if (h && (part === 'k' ? h.scope !== 'values' : part === 'v' ? h.scope !== 'keys' : false)) mark(s, text, h); else s.textContent = text; return s; }
  function jnode(key, v, comma, depth, ctx, parent, i, k) {
    ctx.n++;
    const row = el('div', 'jrow'); row._p = parent; row._i = i; row._k = k; row._v = v; row._ro = ctx.ro; row._rows = [];
    const cm = () => comma && row.append(tok('jp', ','));
    if (key !== null) row.append(tok('jk', JSON.stringify(key), ctx, 'k'), tok('jp', ': '));
    if (v === null) { row.append(tok('jn', 'null', ctx, 'v')); cm(); return row; }
    if (typeof v === 'string') {
      const long = v.length > STR, s = tok('js', long ? JSON.stringify(v.slice(0, STR)).slice(0, -1) : JSON.stringify(v), ctx, 'v'); row.append(s);
      if (long) { const b = el('button', 'jmore', `… +${(v.length - STR).toLocaleString()} more characters`); b.type = 'button'; b.onclick = e => { e.stopPropagation(); s.textContent = JSON.stringify(v); b.remove(); }; row.append(b); }
      cm(); return row;
    }
    if (typeof v === 'number' || typeof v === 'boolean' || v instanceof Lex) { row.append(tok(typeof v === 'boolean' ? 'jb' : 'jv', v instanceof Lex ? v.s : String(v), ctx, 'v')); cm(); return row; }
    const isArr = Array.isArray(v), len = isArr ? v.length : v.e.length;
    if (!len) { row.append(tok('jp', isArr ? '[]' : '{}')); cm(); return row; }
    const kids = el('div', 'jc'), fold = el('button', 'fold', '▾'), more = el('button', 'jmore'); fold.type = more.type = 'button';
    let shown = 0, built = false;
    const showMore = () => {
      const end = Math.min(shown + CH, len);
      for (let n = shown; n < end; n++) { const r = isArr ? jnode(null, v[n], n < len - 1, depth + 1, ctx, row, n, undefined) : jnode(v.e[n][0], v.e[n][1], n < len - 1, depth + 1, ctx, row, n, v.e[n][0]); row._rows.push(r); kids.append(r); }
      shown = end; more.hidden = shown >= len; more.textContent = `Show ${Math.min(CH, len - shown)} more (${len - shown} left)`;
    };
    const build = () => { if (!built) { built = true; showMore(); } };
    more.onclick = e => { e.stopPropagation(); showMore(); }; more.hidden = true;
    row._set = open => { row.classList.toggle('col', !open); if (open) build(); fold.setAttribute('aria-expanded', String(open)); };
    row._need = n => { build(); while (shown <= n && shown < len) showMore(); };
    fold.onclick = e => { e.stopPropagation(); row._set(row.classList.contains('col')); }; fold.setAttribute('aria-label', 'Fold or unfold');
    row._set(depth === 0 || (ctx.n < ctx.limit && ((ctx.all && len <= CH) || (depth <= 1 && len <= 15))));
    row.append(fold, tok('jp', isArr ? '[' : '{'), tok('jsum', ` ${len} ${isArr ? 'items' : 'keys'} `), kids, more, tok('jp', isArr ? ']' : '}')); cm(); return row;
  }
  function drawTree(value, o = {}) {
    body.innerHTML = ''; const t = el('div', 'jtree'), total = J.count(value, 1e7);
    S.root = jnode(null, value, false, 0, { n: 0, limit: 4000, all: total <= 400, hl: o.hl || null, ro: !!o.ro }, null, undefined, undefined); t.append(S.root); body.append(t); S.sel = null; $('jvPath').hidden = true;
  }
  function expandAll() { if (!S.root) return; const q = [S.root]; let n = 0; while (q.length && n < 4000) { const r = q.shift(); if (r._set) { r._set(true); n++; r._rows.forEach(c => c._set && q.push(c)); } } if (q.length) toast('Opened the first 4,000 rows. Open the rest one by one.'); }
  function collapseAll() { if (!S.root) return; const walk = r => { r._rows.forEach(walk); if (r._set) r._set(false); }; walk(S.root); S.root._set && S.root._set(true); }
  const stepsOf = row => { const s = []; for (let r = row; r && r._p; r = r._p) s.unshift(r._k !== undefined ? r._k : r._i); return s; };
  const idxOf = row => { const s = []; for (let r = row; r && r._p; r = r._p) s.unshift(r._i); return s; };
  function select(row) {
    if (S.sel) S.sel.classList.remove('sel'); S.sel = row; row.classList.add('sel');
    const ro = row._ro, isRoot = !row._p, path = ro ? (isRoot ? '' : String(row._k)) : J.pathText(stepsOf(row));
    $('jvPathText').textContent = ro && isRoot ? '(query results)' : path; $('jvPath').hidden = false;
    $('pEdit').hidden = $('pAdd').hidden = $('pDel').hidden = ro; $('pDel').disabled = isRoot; $('pAdd').disabled = !J.isCont(row._v); $('pCopyPath').disabled = ro && isRoot;
  }
  body.addEventListener('click', e => { const r = e.target.closest('.jrow'); if (r && S.root) select(r); });
  body.addEventListener('dblclick', e => { const r = e.target.closest('.jrow'); if (r && !r._ro && S.root) { select(r); editRow(r); } });
  function reveal(idx) {   // open the way down to a node (building rows as needed), select it and scroll to it
    let row = S.root; if (!row) return null;
    for (const i of idx) { if (!row._set) return null; row._set(true); row._need(i); row = row._rows[i]; if (!row) return null; }
    select(row); row.scrollIntoView({ block: 'center' }); return row;
  }

  // ---------- find and query ----------
  const hl = () => (S.mode === 'find' && $('jvQ').value) ? { q: $('jvQ').value, cs: $('jvCase').checked, scope: $('jvScope').value } : null;
  function runFind() {
    if (S.tab !== 'viewer') return;   // the search box only works on the Viewer tab
    const q = $('jvQ').value, cnt = $('jvCount'); cnt.className = 'jv-count'; S.matches = []; S.mi = -1;
    if (!S.valid) { cnt.textContent = ''; return; }
    if (S.mode === 'query') {
      if (!q.trim()) { cnt.textContent = ''; drawTree(S.value); return; }
      try {
        const res = J.query(S.value, q); cnt.textContent = `${res.total.toLocaleString()} result${res.total === 1 ? '' : 's'}${res.total > res.length ? ` (first ${res.length})` : ''}`;
        const o = new O(res.map(r => [r.path, r.v])); drawTree(o, { ro: true }); expandAll();
      } catch (e) { cnt.className = 'jv-count bad'; cnt.textContent = e.message; }
      return;
    }
    if (!q) { cnt.textContent = ''; drawTree(S.value); return; }
    S.matches = J.find(S.value, q, { cs: $('jvCase').checked, scope: $('jvScope').value });
    cnt.textContent = S.matches.length ? `${S.matches.length >= 5000 ? '5,000+' : S.matches.length} found` : 'No match';
    drawTree(S.value, { hl: hl() }); if (S.matches.length) jump(0);
  }
  function jump(n) {
    if (!S.matches.length) return; S.mi = (n + S.matches.length) % S.matches.length; const m = S.matches[S.mi];
    body.querySelectorAll('.curm').forEach(x => x.classList.remove('curm')); const row = reveal(m.idx); if (!row) return;
    const t = m.where === 'key' ? row.querySelector(':scope > .jk') : row.querySelector(':scope > .js,:scope > .jv,:scope > .jb,:scope > .jn'); if (t) t.classList.add('curm');
    $('jvCount').textContent = `${S.mi + 1} of ${S.matches.length >= 5000 ? '5,000+' : S.matches.length}`;
  }
  let ft; const laterFind = () => { clearTimeout(ft); ft = setTimeout(runFind, 250); };
  const setMode = m => { S.mode = m; $('mFind').classList.toggle('on', m === 'find'); $('mQuery').classList.toggle('on', m === 'query'); $('jvQ').placeholder = m === 'find' ? 'Search keys and values…  ( / )' : 'JSONPath, for example $.items[*].price  or  $..name'; $('jvScope').hidden = $('jvCase').parentElement.hidden = m === 'query'; $('jvPrev').hidden = $('jvNext').hidden = m === 'query'; runFind(); };

  // ---------- edit, add, delete ----------
  function at(idx) { let parent = null, v = S.value; for (const i of idx) { parent = v; v = Array.isArray(v) ? v[i] : v.e[i][1]; } return { parent, v, i: idx[idx.length - 1] }; }
  function setAt(idx, nv) { if (!idx.length) { S.value = nv; return; } const { parent, i } = at(idx); if (Array.isArray(parent)) parent[i] = nv; else parent.e[i][1] = nv; }
  const parseVal = t => { try { return J.parse(t.trim() === '' ? 'null' : t); } catch (e) { const { line, col } = J.lineCol(t, e.pos || 0); throw new Error(`The value is not valid JSON. Line ${line}, column ${col}: ${e.message}.`); } };
  function editRow(row) {
    const idx = idxOf(row), { parent, v } = at(idx), isObjChild = parent instanceof O, keyIn = el('input'), valIn = el('textarea'); keyIn.value = isObjChild ? parent.e[row._i][0] : ''; valIn.value = J.write(v, '  '); valIn.spellcheck = false;
    const nodes = []; if (isObjChild) nodes.push(field('Key', keyIn)); nodes.push(field('Value (JSON: text in "quotes", numbers, true, false, null, {…} or […])', valIn));
    dialog('Edit', nodes, 'Save', () => { const nv = parseVal(valIn.value); setAt(idx, nv); if (isObjChild) at(idx).parent.e[row._i][0] = keyIn.value; S.note = 'Edited ' + J.pathText(stepsOf(row)); commit(J.write(S.value, unit()), idx); });
  }
  function addRow(row) {
    const idx = idxOf(row), c = row._v, isObj = c instanceof O, keyIn = el('input'), valIn = el('textarea'); valIn.value = 'null'; valIn.spellcheck = false;
    const nodes = []; if (isObj) nodes.push(field('New key', keyIn)); nodes.push(field('Value (JSON)', valIn));
    dialog(isObj ? 'Add a property' : 'Add an item', nodes, 'Add', () => { if (isObj && !keyIn.value) throw new Error('Type a key name.'); const nv = parseVal(valIn.value); const target = idx.length ? at(idx).v : S.value; if (isObj) target.e.push([keyIn.value, nv]); else target.push(nv); const ni = idx.concat((isObj ? target.e.length : target.length) - 1); S.note = 'Added to ' + J.pathText(stepsOf(row)); commit(J.write(S.value, unit()), ni); });
  }
  function deleteRow(row) {
    const idx = idxOf(row); if (!idx.length) return; const { parent, i } = at(idx); if (Array.isArray(parent)) parent.splice(i, 1); else parent.e.splice(i, 1);
    S.note = 'Deleted ' + J.pathText(stepsOf(row)) + '. Use Undo to bring it back.'; commit(J.write(S.value, unit()), idx.slice(0, -1));
  }
  $('pCopyPath').onclick = () => S.sel && copy($('jvPathText').textContent, 'Path copied');
  $('pCopyVal').onclick = () => S.sel && copy(J.write(S.sel._v, '  '), 'Value copied');
  $('pEdit').onclick = () => S.sel && editRow(S.sel); $('pAdd').onclick = () => S.sel && addRow(S.sel); $('pDel').onclick = () => S.sel && deleteRow(S.sel);

  // ---------- tabs on the right ----------
  function tab(t) {
    if (S.tab === 'compare' && $('jvB')) S.b = $('jvB').value; S.tab = t;
    [['tabV', 'viewer'], ['tabT', 'text'], ['tabC', 'compare'], ['tabX', 'convert']].forEach(([id, n]) => { $(id).classList.toggle('on', n === t); $(id).setAttribute('aria-selected', n === t); });
    $('jvFind').hidden = t !== 'viewer'; $('jvExp').hidden = $('jvCol').hidden = t !== 'viewer'; $('jvCopy').hidden = $('jvDl').hidden = t === 'compare'; renderTab();
  }
  function renderTab() {
    const meta = $('jvMeta'); meta.innerHTML = ''; $('jvPath').hidden = true; S.sel = null;
    if (S.tab === 'compare') return drawCompare();
    if (!S.valid) { S.root = null; return empty($('jvIn').value.trim() ? 'Fix the error on the left and the result will appear.' : 'Your JSON will appear here.'); }
    const v = S.value, len = Array.isArray(v) ? v.length : v instanceof O ? v.e.length : null, total = J.count(v, 1e7);
    meta.append(Object.assign(el('span', 'chip ok'), { textContent: J.kind(v) + (len !== null ? ` · ${len.toLocaleString()} ${Array.isArray(v) ? 'items' : 'keys'}` : '') }), el('span', 'chip', `${total >= 1e7 ? '10,000,000+' : total.toLocaleString()} values`), el('span', 'chip', size(new Blob([$('jvIn').value]).size)));
    if (S.tab === 'viewer') { if ($('jvQ').value) runFind(); else drawTree(v); }
    else if (S.tab === 'text') { body.innerHTML = ''; S.root = null; const txt = J.write(v, unit()), p = el('pre'); p.textContent = txt.length > 5e6 ? txt.slice(0, 5e6) + '\n… (first 5 million characters shown, Download has everything)' : txt; body.append(p); }
    else drawConvert();
  }
  function outputText() {
    if (!S.valid) return null;
    if (S.tab === 'convert') { const o = convert(); return { text: o.text, name: 'converted.' + o.ext, type: 'text/plain' }; }
    return { text: J.write(S.value, unit()), name: 'formatted.json', type: 'application/json' };
  }

  // ---------- compare ----------
  function drawCompare() {
    body.innerHTML = ''; S.root = null; const w = el('div', 'cmp'), top = el('div'), h = el('div', 'cmp-h'), ta = el('textarea'), res = el('div', 'cmp-res');
    ta.id = 'jvB'; ta.value = S.b; ta.spellcheck = false; ta.placeholder = 'Paste the second JSON (B) here. The JSON on the left is A.';
    const bt = el('span'); bt.style.display = 'flex'; bt.style.gap = '6px';
    const mkb = (t, f) => { const b = el('button', 'btn sm', t); b.type = 'button'; b.onclick = f; bt.append(b); };
    mkb('Load file', () => { const i = document.createElement('input'); i.type = 'file'; i.onchange = async () => { if (i.files[0]) { ta.value = await i.files[0].text(); run(); } }; i.click(); });
    mkb('Swap A and B', () => { const a = $('jvIn').value; S.b = ta.value; ta.value = a; commit(S.b); S.b = ta.value; run(); }); mkb('Clear B', () => { ta.value = ''; run(); });
    h.append(el('span', '', 'Compare with (JSON B)'), bt); top.append(h, ta); w.append(top, res); body.append(w);
    const run = () => { S.b = ta.value; res.innerHTML = ''; if (!S.valid) { res.append(el('div', 'jv-empty', 'Fix the JSON on the left (A) first.')); return; } if (!ta.value.trim()) { res.append(el('div', 'jv-empty', 'Paste JSON B above to see the differences.')); return; }
      let b; try { b = J.parse(ta.value.replace(/^\uFEFF/, '')); } catch (e) { const { line, col } = J.lineCol(ta.value, e.pos || 0); res.append(el('div', 'jv-err', `JSON B, line ${line}, column ${col}: ${e.message}.`)); return; }
      const d = J.diff(S.value, b), cnt = t => d.filter(x => x.type === t).length, sum = el('div', 'cmp-sum');
      if (!d.length) { res.append(el('div', 'jv-empty', 'The two documents are the same. Key order is ignored.')); return; }
      sum.append(el('span', 'chip', `${cnt('changed')} changed`), el('span', 'chip', `${cnt('added')} added`), el('span', 'chip', `${cnt('removed')} removed`), d.length >= 5000 ? el('span', 'chip', 'first 5,000 shown') : '');
      const short = v => { const t = J.write(v, ''); return t.length > 200 ? t.slice(0, 200) + '…' : t; }; res.append(sum);
      d.forEach(x => { const r = el('div', 'dif'); r.append(el('span', 'tag ' + x.type, x.type), el('span', 'p', x.path)); if (x.type !== 'added') { const o = el('div', 'v old', '− ' + short(x.a)); r.append(o); } if (x.type !== 'removed') { const n = el('div', 'v new', '+ ' + short(x.b)); r.append(n); } res.append(r); });
    }; let rt; ta.oninput = () => { clearTimeout(rt); rt = setTimeout(run, 300); }; run();
  }

  // ---------- convert ----------
  function convert() {
    if (S.conv === 'yaml') return { text: J.toYAML(S.value), ext: 'yaml' };
    if (S.conv === 'xml') return { text: J.toXML(S.value, S.xmlRoot), ext: 'xml' };
    return { text: J.toCSV(S.value), ext: 'csv' };
  }
  function drawConvert() {
    body.innerHTML = ''; S.root = null; const w = el('div', 'cnv'), bar = el('div', 'cnv-bar'), seg = el('div', 'jv-mode'), out = el('pre');
    [['csv', 'CSV'], ['yaml', 'YAML'], ['xml', 'XML']].forEach(([k, l]) => { const b = el('button', S.conv === k ? 'on' : '', l); b.type = 'button'; b.onclick = () => { S.conv = k; drawConvert(); }; seg.append(b); }); bar.append(seg);
    if (S.conv === 'xml') { const r = el('input'); r.value = S.xmlRoot; r.setAttribute('aria-label', 'Root element name'); r.onchange = () => { S.xmlRoot = r.value || 'root'; drawConvert(); }; bar.append(el('small', '', 'Root name'), r); }
    bar.append(el('small', '', { csv: 'Lists of objects become rows. Nested keys become a.b columns.', yaml: 'Text is quoted only when it needs to be.', xml: 'Lists repeat the element. Keys are cleaned to valid names.' }[S.conv]));
    const t = convert().text; out.textContent = t.length > 5e6 ? t.slice(0, 5e6) + '\n… (first 5 million characters shown, Download has everything)' : t; w.append(bar, out); body.append(w);
  }

  // ---------- loading ----------
  async function loadFile(f) {
    if (!f) return; if (f.size > 60e6) return toast('That file is over 60 MB. Try a smaller one.');
    const t = await f.text(), d = doc(); if (d.text.trim() || $('jvIn').value.trim()) { d.text = $('jvIn').value; const nd = newDoc(t, f.name); S.cur = S.docs.indexOf(nd); } else { d.title = f.name; }
    $('jvIn').value = t; doc().text = t; renderDocs(); check(); undoState(); toast(`Loaded ${f.name} (${size(f.size)})`, true);
  }
  async function loadLink(url) {
    let r; try { r = await fetch(url, { cache: 'no-store' }); } catch (e) { throw new Error('Could not reach that link. The website must allow other websites to read it (CORS). Download the file and use Load file instead.'); }
    if (!r.ok) throw new Error(`The link answered with an error (${r.status}).`); const t = await r.text(); const name = decodeURIComponent((new URL(url).pathname.split('/').pop()) || 'link');
    doc().text = $('jvIn').value; const nd = $('jvIn').value.trim() ? newDoc(t, name) : (doc().title = name, doc()); S.cur = S.docs.indexOf(nd); $('jvIn').value = t; nd.text = t; renderDocs(); check(); undoState(); toast('Loaded ' + name, true);
  }
  function linkDialog() { const u = el('input'); u.type = 'url'; u.placeholder = 'https://example.com/data.json'; dialog('Load JSON from a link', [field('Address', u), el('p', 'jv-sub', 'Works when the website allows other websites to read it.')], 'Load', () => { if (!/^https?:\/\//i.test(u.value)) throw new Error('Type a full address starting with https://'); return loadLink(u.value); }); }
  function helpDialog() {
    const dl = el('dl', 'kbd-list'); [['Ctrl / ⌘ + Enter', 'Format'], ['Ctrl / ⌘ + Shift + M', 'Minify'], ['/', 'Go to the search box'], ['Enter / Shift + Enter', 'Next / previous match'], ['Esc', 'Clear the search'], ['Alt + 1 to 4', 'Viewer, Text, Compare, Convert'], ['Double-click a row', 'Edit it'], ['?', 'Show this list']].forEach(([k, d]) => { const t = el('dt'), kb = el('kbd', '', k); t.append(kb); dl.append(t, el('dd', '', d)); });
    dialog('Keyboard shortcuts', [dl]);
  }

  // ---------- wiring ----------
  $('jvIn').addEventListener('input', () => { later(); });
  $('jvIn').addEventListener('keydown', e => { const m = e.ctrlKey || e.metaKey; if (m && e.key === 'Enter') { e.preventDefault(); actions.format(); } else if (m && e.shiftKey && e.key.toLowerCase() === 'm') { e.preventDefault(); actions.minify(); } });
  $('jvFormat').onclick = actions.format; $('jvMin').onclick = actions.minify; $('jvSort').onclick = () => actions.sort(); $('jvFix').onclick = fixIt; $('jvUndo').onclick = actions.undo;
  $('jvIndent').onchange = () => { if (S.valid && (S.tab === 'text' || S.tab === 'convert')) renderTab(); };
  $('jvSample').onclick = () => { const s = '{\n  "id": 1048576,\n  "name": "Sample order",\n  "paid": true,\n  "discount": null,\n  "total": 1249.5,\n  "tags": ["demo", "json"],\n  "customer": { "name": "Asha Rao", "email": "asha@example.com", "address": { "city": "Pune", "pin": "411001" } },\n  "items": [\n    { "sku": "A-100", "qty": 2, "price": 499.75 },\n    { "sku": "B-220", "qty": 1, "price": 250 }\n  ]\n}'; S.note = ''; commit(s); };
  $('jvClear').onclick = () => { S.note = ''; commit(''); $('jvIn').focus(); };
  $('jvLoad').onclick = () => $('jvFile').click(); $('jvFile').onchange = e => { loadFile(e.target.files[0]); e.target.value = ''; }; $('jvLink').onclick = linkDialog; $('jvHelp').onclick = helpDialog;
  $('tabV').onclick = () => tab('viewer'); $('tabT').onclick = () => tab('text'); $('tabC').onclick = () => tab('compare'); $('tabX').onclick = () => tab('convert');
  $('jvExp').onclick = expandAll; $('jvCol').onclick = collapseAll;
  $('jvCopy').onclick = () => { const o = outputText(); o ? copy(o.text) : toast('There is no valid JSON to copy.'); };
  $('jvDl').onclick = () => { const o = outputText(); o ? save(o.name, o.text, o.type) : toast('There is no valid JSON to download.'); };
  $('mFind').onclick = () => setMode('find'); $('mQuery').onclick = () => setMode('query');
  $('jvQ').addEventListener('input', laterFind); $('jvCase').onchange = $('jvScope').onchange = runFind;
  $('jvQ').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); S.mode === 'find' && S.matches.length ? jump(S.mi + (e.shiftKey ? -1 : 1)) : runFind(); } else if (e.key === 'Escape') { $('jvQ').value = ''; runFind(); } });
  $('jvNext').onclick = () => jump(S.mi + 1); $('jvPrev').onclick = () => jump(S.mi - 1);
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName); if ($('jvDlg').open) return;
    if (e.altKey && /^[1-4]$/.test(e.key)) { e.preventDefault(); tab(['viewer', 'text', 'compare', 'convert'][+e.key - 1]); }
    else if (!typing && e.key === '/') { e.preventDefault(); if (S.tab !== 'viewer') tab('viewer'); $('jvQ').focus(); $('jvQ').select(); }
    else if (!typing && e.key === '?') { e.preventDefault(); helpDialog(); }
  });
  // drop a file anywhere on the page
  let drag = 0; const drop = $('jvDrop');
  addEventListener('dragenter', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { drag++; drop.classList.add('drag'); } });
  addEventListener('dragleave', () => { drag = Math.max(0, drag - 1); if (!drag) drop.classList.remove('drag'); });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => { e.preventDefault(); drag = 0; drop.classList.remove('drag'); loadFile(e.dataTransfer.files[0]); });

  // ---------- start ----------
  (function start() {
    let saved = null; try { if (localStorage.getItem('jv-remember') === '1') saved = JSON.parse(localStorage.getItem('jv-docs') || 'null'); } catch (e) {}
    if (saved && saved.length) saved.forEach(d => newDoc(d.text, d.title)); else newDoc('', 'Untitled 1');
    S.cur = 0; $('jvIn').value = doc().text; renderDocs(); setMode('find'); tab('viewer'); check(); undoState();
    const u = new URLSearchParams(location.search).get('url'); if (u) loadLink(u).catch(e => toast(e.message));
  })();
})();
