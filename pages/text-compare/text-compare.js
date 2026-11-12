// Text Compare. Paste or load two texts and see exactly what changed.
// The diff engine is our own (Myers algorithm, the same idea Git uses). Nothing leaves the browser.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CAP = 3000;   // biggest number of edits the engine will search for before it gives up and shows "very different"
  const CTX = 3;      // unchanged lines kept around each change in "Only differences" and in the .diff file

  // ---- core:start (diff engine, no page code in here)
  // Turn each text key into a small number so comparing is fast.
  function ints(ka, kb) {
    const m = new Map(); let n = 0;
    const f = k => { let v = m.get(k); if (v === undefined) { v = n++; m.set(k, v); } return v; };
    return [ka.map(f), kb.map(f)];
  }

  // Myers shortest edit script between a[a0..a1) and b[b0..b1). Returns [[op, aIndex, bIndex], ...]
  // op: 0 = same, 1 = delete from a, 2 = insert from b. Returns null if more than `cap` edits are needed.
  function myers(a, b, a0, a1, b0, b1, cap) {
    const N = a1 - a0, M = b1 - b0, maxD = Math.min(N + M, cap), off = maxD + 1, NEG = -1e9;
    const V = new Int32Array(2 * maxD + 3), trace = []; let D = -1;
    for (let d = 0; d <= maxD && D < 0; d++) {
      trace.push(V.slice(off - d - 1, off + d + 2));           // remember V as it was before this round
      for (let k = -d; k <= d; k += 2) {
        let x = (k === -d || (k !== d && V[off + k - 1] < V[off + k + 1])) ? V[off + k + 1] : V[off + k - 1] + 1;
        const y0 = x - k;
        if (x < 0 || x > N || y0 < 0 || y0 > M) { V[off + k] = NEG; continue; }   // this path left the grid
        let y = y0;
        while (x < N && y < M && a[a0 + x] === b[b0 + y]) { x++; y++; }
        V[off + k] = x;
        if (x === N && y === M) { D = d; break; }
      }
    }
    if (D < 0) return null;
    const ops = []; let x = N, y = M;
    for (let d = D; d > 0; d--) {                                // walk back from the end to the start
      const sn = trace[d], g = k => sn[k + d + 1], k = x - y;
      const down = (k === -d || (k !== d && g(k - 1) < g(k + 1)));
      const pk = down ? k + 1 : k - 1, px = g(pk), py = px - pk;
      const sx = down ? px : px + 1, sy = down ? py + 1 : py;
      while (x > sx && y > sy) { x--; y--; ops.push([0, a0 + x, b0 + y]); }
      if (down) ops.push([2, -1, b0 + py]); else ops.push([1, a0 + px, -1]);
      x = px; y = py;
    }
    while (x > 0 && y > 0) { x--; y--; ops.push([0, a0 + x, b0 + y]); }
    return ops.reverse();
  }

  // Full diff of two number arrays. Equal start and end are skipped first (the usual case is a small change).
  function diffOps(a, b, cap) {
    const n = a.length, m = b.length; let s = 0;
    while (s < n && s < m && a[s] === b[s]) s++;
    let ea = n, eb = m;
    while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    const ops = []; let over = false;
    for (let k = 0; k < s; k++) ops.push([0, k, k]);
    if (ea === s) { for (let j = s; j < eb; j++) ops.push([2, -1, j]); }
    else if (eb === s) { for (let i = s; i < ea; i++) ops.push([1, i, -1]); }
    else {
      const mid = myers(a, b, s, ea, s, eb, cap);
      if (mid) { for (const o of mid) ops.push(o); }
      else { over = true; for (let i = s; i < ea; i++) ops.push([1, i, -1]); for (let j = s; j < eb; j++) ops.push([2, -1, j]); }
    }
    for (let k = 0; k < n - ea; k++) ops.push([0, ea + k, eb + k]);
    ops.over = over;
    return ops;
  }
  // ---- core:end

  // ---------- options (remembered in this browser) ----------
  const KEY = 'ul-textcompare';
  const DEF = { view: 'side', ignoreCase: false, ignoreSpace: false, ignoreBlank: false, json: false, onlyDiff: false, wrap: true, live: false, mark: 'word' };
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  const O = Object.assign({}, DEF, saved);
  if (!('view' in saved) && innerWidth < 700) O.view = 'inline';   // small screens: one column reads better
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(O)); } catch (e) {} };
  const S = { rows: [], flat: [], hunks: 0, cur: -1, open: new Set(), done: false };

  function toast(m, ok) { const t = $('alert'); t.textContent = m; t.classList.toggle('ok', !!ok); t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.display = 'none'), 2400); }
  function copy(text, msg) {
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(() => toast(msg, true), () => toast('Could not copy')); return; }
    const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select();
    try { document.execCommand('copy'); toast(msg, true); } catch (e) { toast('Could not copy'); } t.remove();
  }

  // ---------- preparing the text ----------
  // Pretty-prints JSON without changing any value (long numbers stay exactly as written). Returns null if it is not JSON.
  function fmtJson(s) {
    const t = s.trim(); if (!/^[\[{]/.test(t)) return null;
    try { JSON.parse(t); } catch (e) { return null; }
    let out = '', ind = 0, i = 0; const n = t.length, pad = () => '  '.repeat(ind);
    while (i < n) {
      const c = t[i];
      if (c === '"') { let j = i + 1; while (j < n && t[j] !== '"') { if (t[j] === '\\') j++; j++; } out += t.slice(i, j + 1); i = j + 1; continue; }
      if (c === '{' || c === '[') {
        const close = c === '{' ? '}' : ']'; let k = i + 1; while (k < n && /\s/.test(t[k])) k++;
        if (t[k] === close) { out += c + close; i = k + 1; continue; }
        ind++; out += c + '\n' + pad(); i++; continue;
      }
      if (c === '}' || c === ']') { ind--; out += '\n' + pad() + c; i++; continue; }
      if (c === ',') { out += ',\n' + pad(); i++; continue; }
      if (c === ':') { out += ': '; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      out += c; i++;
    }
    return out;
  }
  function prep(text) {
    let t = text.replace(/\r\n?/g, '\n'), bad = false;
    if (O.json) { const f = fmtJson(t); if (f !== null) t = f; else if (t.trim()) bad = true; }
    const l = t.split('\n'); if (l.length && l[l.length - 1] === '') l.pop();
    let r = l.map((x, i) => ({ t: x, no: i + 1 }));
    if (O.ignoreBlank) r = r.filter(x => x.t.trim() !== '');
    return { r, bad };
  }
  const norm = s => { if (O.ignoreSpace) s = s.replace(/\s+/g, ' ').trim(); if (O.ignoreCase) s = s.toLowerCase(); return s; };

  // Highlights the exact words (or characters) that differ inside one changed line.
  function intra(sa, sb) {
    if (O.mark === 'off' || sa.length > 3000 || sb.length > 3000) return null;
    const tk = O.mark === 'char' ? (s => Array.from(s)) : (s => s.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || []);
    const ta = tk(sa), tb = tk(sb), isWs = t => /^\s+$/.test(t);
    const key = t => (O.ignoreSpace && isWs(t)) ? ' ' : (O.ignoreCase ? t.toLowerCase() : t);
    const [ia, ib] = ints(ta.map(key), tb.map(key));
    const ops = diffOps(ia, ib, 1500); if (ops.over) return null;
    const pa = [], pb = []; let same = 0;
    const put = (arr, t, c) => { const l = arr[arr.length - 1]; if (l && l[1] === c) l[0] += t; else arr.push([t, c]); };
    for (const [o, x, y] of ops) {
      if (o === 0) { same++; put(pa, ta[x], false); put(pb, tb[y], false); }
      else if (o === 1) put(pa, ta[x], !(O.ignoreSpace && isWs(ta[x])));
      else put(pb, tb[y], !(O.ignoreSpace && isWs(tb[y])));
    }
    if (same / Math.max(ta.length, tb.length) < 0.2) return null;   // lines are too different: colouring the whole line is clearer
    return [pa, pb];
  }

  // A block of changed lines has some removed lines and some added lines. Match each removed line with the added line
  // that looks most like it (so "Version: 1.0.4" lines up with "Version: 1.0.5"), and leave the rest as pure removed / added.
  const wordSet = s => { const m = new Map(); let n = 0; for (const t of (norm(s).match(/[\p{L}\p{N}_]+/gu) || [])) { m.set(t, (m.get(t) || 0) + 1); n++; } return { m, n }; };
  const dice = (x, y) => { if (!x.n || !y.n) return 0; let c = 0; for (const [t, v] of x.m) { const w = y.m.get(t); if (w) c += Math.min(v, w); } return 2 * c / (x.n + y.n); };
  function pairBlock(dels, ins) {
    const k = dels.length, m = ins.length, out = [], pairs = [];
    if (k * m <= 40000) {
      const X = dels.map(l => wordSet(l.t)), Y = ins.map(l => wordSet(l.t)), W = m + 1;
      const sc = new Float32Array((k + 1) * W), dir = new Uint8Array((k + 1) * W);
      for (let i = 1; i <= k; i++) for (let j = 1; j <= m; j++) {
        const s = dice(X[i - 1], Y[j - 1]);
        let best = sc[(i - 1) * W + j], d = 2;                                   // skip a removed line
        if (sc[i * W + j - 1] > best) { best = sc[i * W + j - 1]; d = 3; }       // skip an added line
        if (s >= 0.3 && sc[(i - 1) * W + j - 1] + s > best) { best = sc[(i - 1) * W + j - 1] + s; d = 1; }   // pair them
        sc[i * W + j] = best; dir[i * W + j] = d;
      }
      for (let i = k, j = m; i > 0 && j > 0;) { const d = dir[i * W + j]; if (d === 1) { pairs.push([i - 1, j - 1]); i--; j--; } else if (d === 2) i--; else j--; }
      pairs.reverse();
    } else { for (let x = 0; x < Math.min(k, m); x++) pairs.push([x, x]); }   // a huge block: just pair by position
    let pi = 0, pj = 0;
    for (const [x, y] of pairs) {
      for (; pi < x; pi++) out.push({ t: 'del', a: dels[pi] });
      for (; pj < y; pj++) out.push({ t: 'ins', b: ins[pj] });
      out.push({ t: 'mod', a: dels[x], b: ins[y], p: intra(dels[x].t, ins[y].t) }); pi = x + 1; pj = y + 1;
    }
    for (; pi < k; pi++) out.push({ t: 'del', a: dels[pi] });
    for (; pj < m; pj++) out.push({ t: 'ins', b: ins[pj] });
    return out;
  }

  // ---------- compare ----------
  function compare(user) {
    const ta = $('tcA').value, tb = $('tcB').value;
    if (!ta && !tb) { if (user) toast('Add some text first.'); return; }
    const pa = prep(ta), pb = prep(tb), A = pa.r, B = pb.r;
    const [ia, ib] = ints(A.map(l => norm(l.t)), B.map(l => norm(l.t)));
    const ops = diffOps(ia, ib, CAP);
    const rows = [], flat = [];
    let i = 0;
    while (i < ops.length) {
      if (ops[i][0] === 0) { const a = A[ops[i][1]], b = B[ops[i][2]]; rows.push({ t: 'eq', a, b }); flat.push([' ', a.t]); i++; continue; }
      const dels = [], ins = [];
      while (i < ops.length && ops[i][0] !== 0) { if (ops[i][0] === 1) dels.push(A[ops[i][1]]); else ins.push(B[ops[i][2]]); i++; }
      pairBlock(dels, ins).forEach(r => rows.push(r));
      dels.forEach(d => flat.push(['-', d.t])); ins.forEach(d => flat.push(['+', d.t]));
    }
    let h = -1, prevEq = true, c = { eq: 0, del: 0, ins: 0, mod: 0 };
    rows.forEach(r => { c[r.t]++; if (r.t === 'eq') { prevEq = true; r.h = -1; } else { if (prevEq) h++; prevEq = false; r.h = h; } });
    Object.assign(S, { rows, flat, hunks: h + 1, cur: -1, counts: c, nA: A.length, nB: B.length, done: true });
    S.open.clear();

    const notes = [], bad = [pa.bad && 'Original', pb.bad && 'Changed'].filter(Boolean);
    if (bad.length) notes.push(`${bad.join(' and ')} ${bad.length > 1 ? 'are' : 'is'} not valid JSON, so ${bad.length > 1 ? 'they were' : 'it was'} compared as plain text.`);
    else if (O.json) notes.push('JSON was formatted first, so line numbers are those of the formatted text.');
    if (ops.over) notes.push('These texts are very different, so lines were not matched one by one.');
    if (rows.length > 6000 && !O.onlyDiff) notes.push('This is a large result. Turn on “Only differences” to browse faster.');
    const nt = $('tcNote'); nt.textContent = notes.join(' '); nt.hidden = !notes.length;

    stats(); render();
    if (user) {
      $('tcOut').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      if (S.hunks) go(0);
    }
  }

  function stats() {
    if (!S.done) { $('tcStats').innerHTML = ''; ['tcPrev', 'tcNext', 'tcCopy', 'tcDl'].forEach(id => ($(id).disabled = true)); pos(); return; }
    const c = S.counts, tot = S.nA + S.nB, sim = tot ? Math.round(200 * c.eq / tot) : 100;
    $('tcStats').innerHTML = S.hunks
      ? `<span class="chip">${S.hunks} difference${S.hunks > 1 ? 's' : ''}</span>` +
        (c.mod ? `<span class="chip">~ ${c.mod} changed</span>` : '') +
        (c.del ? `<span class="chip del">− ${c.del} removed</span>` : '') +
        (c.ins ? `<span class="chip add">+ ${c.ins} added</span>` : '') +
        `<span class="chip">${sim}% similar</span>`
      : '<span class="chip ok">Identical</span>';
    const on = S.done && S.hunks > 0;
    ['tcPrev', 'tcNext', 'tcCopy', 'tcDl'].forEach(id => ($(id).disabled = !on));
    pos();
  }
  const pos = () => { $('tcPos').textContent = S.done && S.hunks ? (S.cur < 0 ? `${S.hunks} total` : `${S.cur + 1} of ${S.hunks}`) : ''; };

  // ---------- drawing the result ----------
  const body = $('tcBody');
  const cell = (r, side, cls) => {
    const l = side === 'a' ? r.a : r.b;
    const parts = r.p ? (side === 'a' ? r.p[0] : r.p[1]) : null;
    const html = parts ? parts.map(([t, ch]) => ch ? `<mark>${esc(t)}</mark>` : esc(t)).join('') : esc(l.t);
    return html || '&#8203;';
  };
  function rowHtml(r) {
    const hk = r.h >= 0 ? ` data-hk="${r.h}"` : '';
    if (O.view === 'inline') {
      const dl = (cls, no1, no2, html, s) => `<tr${hk}><td class="n ${cls}">${no1}</td><td class="n ${cls}">${no2}</td><td class="c ${cls}" data-s="${s}">${html}</td></tr>`;
      if (r.t === 'eq') return dl('', r.a.no, r.b.no, cell(r, 'a'), '');
      if (r.t === 'del') return dl('del', r.a.no, '', cell(r, 'a'), '−');
      if (r.t === 'ins') return dl('add', '', r.b.no, cell(r, 'b'), '+');
      return dl('del', r.a.no, '', cell(r, 'a'), '−') + dl('add', '', r.b.no, cell(r, 'b'), '+');
    }
    const L = r.t === 'eq' ? '' : r.t === 'ins' ? 'emp' : 'del', R = r.t === 'eq' ? '' : r.t === 'del' ? 'emp' : 'add';
    return `<tr${hk}><td class="n ${L === 'del' ? 'del' : ''}">${r.a ? r.a.no : ''}</td><td class="c ${L}"${L === 'del' ? ' data-s="−"' : ''}>${r.a ? cell(r, 'a') : ''}</td>` +
           `<td class="n ${R === 'add' ? 'add' : ''}">${r.b ? r.b.no : ''}</td><td class="c ${R}"${R === 'add' ? ' data-s="+"' : ''}>${r.b ? cell(r, 'b') : ''}</td></tr>`;
  }
  function render() {
    if (!S.done) return;
    if (!S.hunks) {
      body.innerHTML = `<div class="tc-empty same"><div><strong>The two texts are identical</strong>${(O.ignoreCase || O.ignoreSpace || O.ignoreBlank || O.json) ? 'Some options are on and they hide small differences.' : 'Not a single difference was found.'}</div></div>`;
      return;
    }
    const rows = S.rows; let vis = null;
    if (O.onlyDiff) {
      vis = new Uint8Array(rows.length);
      rows.forEach((r, i) => { if (r.t !== 'eq') for (let k = Math.max(0, i - CTX); k <= Math.min(rows.length - 1, i + CTX); k++) vis[k] = 1; });
    }
    const cols = O.view === 'inline' ? '<col style="width:54px"><col style="width:54px"><col>' : '<col style="width:54px"><col><col style="width:54px"><col>';
    const span = O.view === 'inline' ? 3 : 4;
    let out = `<table class="tc-tbl">${cols}`, i = 0;
    while (i < rows.length) {
      if (vis && !vis[i] && !S.open.has(i)) {
        let j = i; while (j < rows.length && !vis[j]) j++;
        out += `<tr class="fold"><td colspan="${span}"><button type="button" class="link-btn" data-f="${i}">Show ${j - i} unchanged line${j - i > 1 ? 's' : ''}</button></td></tr>`;
        i = j; continue;
      }
      if (vis && !vis[i]) { let j = i; while (j < rows.length && !vis[j]) { out += rowHtml(rows[j]); j++; } i = j; continue; }
      out += rowHtml(rows[i]); i++;
    }
    body.innerHTML = out + '</table>';
    markCur();
  }
  function markCur() {
    body.querySelectorAll('tr.cur').forEach(e => e.classList.remove('cur'));
    if (S.cur >= 0) body.querySelectorAll(`tr[data-hk="${S.cur}"]`).forEach(e => e.classList.add('cur'));
  }
  function go(n) {
    if (!S.hunks) return; S.cur = n; markCur(); pos();
    const el = body.querySelector(`tr[data-hk="${n}"]`); if (!el) return;
    const r = el.getBoundingClientRect(), b = body.getBoundingClientRect();
    body.scrollTop += r.top - b.top - body.clientHeight / 3;
  }
  function step(d) { if (!S.hunks) return; go(S.cur < 0 ? (d > 0 ? 0 : S.hunks - 1) : (S.cur + d + S.hunks) % S.hunks); }

  // ---------- the .diff file (standard unified format, works with Git and patch) ----------
  function unified() {
    const f = S.flat, ch = []; f.forEach((l, i) => { if (l[0] !== ' ') ch.push(i); });
    if (!ch.length) return '';
    const ab = [0], bb = [0];
    f.forEach(l => { ab.push(ab[ab.length - 1] + (l[0] !== '+' ? 1 : 0)); bb.push(bb[bb.length - 1] + (l[0] !== '-' ? 1 : 0)); });
    let out = '--- original\n+++ changed\n', s = 0;
    while (s < ch.length) {
      let e = s; while (e + 1 < ch.length && ch[e + 1] - ch[e] <= 2 * CTX + 1) e++;
      const from = Math.max(0, ch[s] - CTX), to = Math.min(f.length - 1, ch[e] + CTX);
      const aC = ab[to + 1] - ab[from], bC = bb[to + 1] - bb[from];
      const aS = aC ? ab[from] + 1 : ab[from], bS = bC ? bb[from] + 1 : bb[from];
      out += `@@ -${aS}${aC === 1 ? '' : ',' + aC} +${bS}${bC === 1 ? '' : ',' + bC} @@\n`;
      for (let i = from; i <= to; i++) out += f[i][0] + f[i][1] + '\n';
      s = e + 1;
    }
    return out;
  }

  // ---------- wiring ----------
  const lines = v => { if (!v) return 0; const n = v.split('\n').length; return v.endsWith('\n') ? n - 1 : n; };
  function counts() {
    [['A', 'tcA'], ['B', 'tcB']].forEach(([k, id]) => { const v = $(id).value; $('count' + k).textContent = `${lines(v).toLocaleString()} line${lines(v) === 1 ? '' : 's'} · ${v.length.toLocaleString()} characters`; });
  }
  let lt;
  function changed() { counts(); if (O.live) { clearTimeout(lt); lt = setTimeout(() => compare(false), 350); } }
  const redo = () => { if (S.done) compare(false); };

  ['tcA', 'tcB'].forEach(id => {
    $(id).addEventListener('input', changed);
    $(id).addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); compare(true); } });
  });
  $('tcCompare').onclick = () => compare(true);

  async function loadInto(id, f) {
    if (!f) return;
    if (f.size > 20e6) { toast('That file is over 20 MB. Try a smaller one.'); return; }
    try { $(id).value = await f.text(); changed(); toast(`Loaded ${f.name}`, true); } catch (e) { toast('Could not read that file'); }
  }
  [['A', 'tcA'], ['B', 'tcB']].forEach(([k, id]) => {
    $('load' + k).onclick = () => $('file' + k).click();
    $('file' + k).onchange = e => { loadInto(id, e.target.files[0]); e.target.value = ''; };
    $('clear' + k).onclick = () => { $(id).value = ''; changed(); $(id).focus(); };
    $('paste' + k).onclick = () => navigator.clipboard.readText().then(t => { $(id).value = t; changed(); }, () => toast('Could not read the clipboard. Click in the box and press Ctrl+V.'));
    const pane = $('pane' + k), drop = pane.querySelector('.tc-drop'); let depth = 0;
    pane.addEventListener('dragenter', e => { if ([...(e.dataTransfer.types || [])].includes('Files')) { depth++; drop.classList.add('drag'); } });
    pane.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) drop.classList.remove('drag'); });
    pane.addEventListener('dragover', e => e.preventDefault());
    pane.addEventListener('drop', e => {
      e.preventDefault(); depth = 0; drop.classList.remove('drag');
      const fs = e.dataTransfer.files; if (!fs.length) return;
      if (fs.length >= 2) { loadInto('tcA', fs[0]); loadInto('tcB', fs[1]); } else loadInto(id, fs[0]);
    });
  });

  $('tcSwap').onclick = () => { const a = $('tcA'), b = $('tcB'), v = a.value; a.value = b.value; b.value = v; counts(); redo(); };
  $('tcClearAll').onclick = () => {
    $('tcA').value = ''; $('tcB').value = ''; counts(); S.done = false; S.hunks = 0; S.cur = -1;
    $('tcNote').hidden = true; empty(); stats();
  };
  $('tcSample').onclick = () => {
    $('tcA').value = 'Welcome to Text Compare.\nThis tool finds what changed between two texts.\n\nLine 4 stays the same.\nThe quick brown fox jumps over the lazy dog.\nThis line will be removed.\nVersion: 1.0.4\nStatus: pending\n';
    $('tcB').value = 'Welcome to Text Compare!\nThis tool finds what changed between two texts.\n\nLine 4 stays the same.\nThe quick red fox jumps over the lazy dog.\nVersion: 1.0.5\nStatus: approved\nA brand new line was added here.\n';
    counts(); compare(true);
  };

  // result toolbar
  const paintTabs = () => { [['viewSide', 'side'], ['viewInline', 'inline']].forEach(([id, v]) => { const e = $(id); e.classList.toggle('on', O.view === v); e.setAttribute('aria-selected', O.view === v); }); };
  $('viewSide').onclick = () => { O.view = 'side'; persist(); paintTabs(); render(); };
  $('viewInline').onclick = () => { O.view = 'inline'; persist(); paintTabs(); render(); };
  $('tcPrev').onclick = () => step(-1);
  $('tcNext').onclick = () => step(1);
  $('tcCopy').onclick = () => { const u = unified(); if (!u) return toast('Nothing to copy. The texts are identical.'); copy(u, 'Diff copied'); };
  $('tcDl').onclick = () => {
    const u = unified(); if (!u) return toast('Nothing to download. The texts are identical.');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: 'text/plain' })); a.download = 'text-compare.diff'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('tcHide').onclick = () => { const h = $('tcIn').hidden = !$('tcIn').hidden; $('tcHide').textContent = h ? 'Show text boxes' : 'Hide text boxes'; };
  body.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; S.open.add(+b.dataset.f); const keep = body.scrollTop; render(); body.scrollTop = keep; });
  document.addEventListener('keydown', e => { if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && S.done && S.hunks) { e.preventDefault(); step(e.key === 'ArrowDown' ? 1 : -1); } });

  // options
  const applyWrap = () => body.classList.toggle('nowrap', !O.wrap);
  const CHK = { optCase: 'ignoreCase', optSpace: 'ignoreSpace', optBlank: 'ignoreBlank', optJson: 'json', optOnly: 'onlyDiff', optWrap: 'wrap', optLive: 'live' };
  Object.entries(CHK).forEach(([id, k]) => {
    const e = $(id); e.checked = !!O[k];
    e.addEventListener('change', () => {
      O[k] = e.checked; persist();
      if (k === 'wrap') applyWrap();
      else if (k === 'onlyDiff') { S.open.clear(); render(); }
      else if (k === 'live') { if (O.live && ($('tcA').value || $('tcB').value)) compare(false); }
      else redo();
    });
  });
  $('selMark').value = O.mark;
  $('selMark').onchange = e => { O.mark = e.target.value; persist(); redo(); };

  function empty() { body.innerHTML = '<div class="tc-empty"><div>Paste text into both boxes and press <strong>Compare</strong>.<br>Or click <strong>Sample</strong> to see how it looks.</div></div>'; }
  paintTabs(); applyWrap(); counts(); empty(); stats();
})();
