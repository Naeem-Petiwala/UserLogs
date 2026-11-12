// JSON Viewer engine, part 2: find, JSONPath queries, compare and converters. No page code in here.
(function (W) {
  const { O, Lex, write, num } = W.JV;
  const isObj = v => v instanceof O, isArr = Array.isArray, isCont = v => isObj(v) || isArr(v);
  const len = v => isArr(v) ? v.length : v.e.length;
  const childAt = (v, i) => isArr(v) ? v[i] : v.e[i][1];
  const keyAt = (v, i) => isArr(v) ? undefined : v.e[i][0];
  const plain = v => v === null ? 'null' : typeof v === 'string' ? v : v instanceof Lex ? v.s : String(v);

  // ---------- path text: $.items[0].sku ----------
  const IDENT = /^[A-Za-z_$][\w$]*$/;
  function pathText(steps) { return '$' + steps.map(s => typeof s === 'number' ? `[${s}]` : IDENT.test(s) ? '.' + s : `['${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}']`).join(''); }

  // ---------- find: every key or value that contains the text, in document order ----------
  // returns [{idx:[child positions], where:'key'|'value'}]
  function findOrdered(root, q, o) {
    const out = [], cap = o.cap || 5000; if (!q) return out;
    const cs = !!o.cs, nq = cs ? q : q.toLowerCase(), hit = t => (cs ? t : t.toLowerCase()).includes(nq), wantK = o.scope !== 'values', wantV = o.scope !== 'keys';
    (function walk(v, idx) {
      if (out.length >= cap) return;
      if (!isCont(v)) { if (wantV && hit(plain(v))) out.push({ idx, where: 'value' }); return; }
      for (let k = 0, L = len(v); k < L && out.length < cap; k++) {
        const ci = idx.concat(k);
        if (isObj(v) && wantK && hit(v.e[k][0])) out.push({ idx: ci, where: 'key' });
        walk(childAt(v, k), ci);
      }
    })(root, []);
    return out;
  }

  // ---------- JSONPath (the common parts: $ . .. [n] ['k'] [*] [a:b:c] [?(filter)]) ----------
  function compileFilter(src) {
    let i = 0; const s = src, err = m => { throw new Error(m); };
    const skip = () => { while (s[i] === ' ') i++; };
    function readPath() {   // @.a.b['c'][0]
      const parts = []; i++;
      for (;;) {
        if (s[i] === '.') { const m = /^[^.\s\[\]=!<>&|()]+/.exec(s.slice(i + 1)); if (!m) err('A name is missing after "."'); parts.push(m[0]); i += 1 + m[0].length; }
        else if (s[i] === '[') { const m = /^\[(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(\d+))\]/.exec(s.slice(i)); if (!m) err('Use ["name"] or [number] here'); parts.push(m[3] !== undefined ? +m[3] : (m[1] !== undefined ? m[1] : m[2])); i += m[0].length; }
        else break;
      }
      return v => { let x = v; for (const p of parts) { if (x === undefined || x === null) return undefined; if (typeof p === 'number') x = isArr(x) ? x[p] : undefined; else x = isObj(x) ? (x.e.find(e => e[0] === p) || [])[1] : undefined; } return x; };
    }
    function prim() {
      skip(); const c = s[i];
      if (c === '(') { i++; const f = or(); skip(); if (s[i] !== ')') err('A closing ) is missing'); i++; return f; }
      if (c === '@') return readPath();
      if (c === "'" || c === '"') { const m = new RegExp('^' + c + '((?:[^' + c + '\\\\]|\\\\.)*)' + c).exec(s.slice(i)); if (!m) err('A text is never closed'); i += m[0].length; const t = m[1].replace(/\\(.)/g, '$1'); return () => t; }
      const m = /^(-?\d+(?:\.\d+)?|true|false|null)/.exec(s.slice(i)); if (!m) err(`Unexpected "${c === undefined ? 'end' : c}" in the filter`); i += m[0].length;
      const lit = m[0] === 'true' ? true : m[0] === 'false' ? false : m[0] === 'null' ? null : Number(m[0]); return () => lit;
    }
    const norm = x => x instanceof Lex ? Number(x.s) : x;
    function cmp() {
      skip(); if (s[i] === '!' && s[i + 1] !== '=') { i++; const f = cmp(); return v => !f(v); }
      const a = prim(); skip(); const m = /^(==|!=|<=|>=|<|>)/.exec(s.slice(i)); if (!m) return v => { const x = a(v); return x !== undefined && x !== null && x !== false; };   // just @.path means "it exists"
      i += m[0].length; const b = prim(), op = m[0];
      return v => { const x = norm(a(v)), y = norm(b(v)); if (op === '==') return x === y; if (op === '!=') return x !== y; if (x === undefined || y === undefined || x === null || y === null) return false; return op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y; };
    }
    function and() { let f = cmp(); for (;;) { skip(); if (s.startsWith('&&', i)) { i += 2; const g = cmp(), h = f; f = v => h(v) && g(v); } else return f; } }
    function or() { let f = and(); for (;;) { skip(); if (s.startsWith('||', i)) { i += 2; const g = and(), h = f; f = v => h(v) || g(v); } else return f; } }
    const f = or(); skip(); if (i < s.length) err(`Unexpected "${s[i]}" in the filter`); return f;
  }
  function compilePath(expr) {
    const s = expr.trim(), steps = []; let i = 0, err = m => { throw new Error(m); };
    if (s[0] !== '$') err('A query starts with $, for example $.items[*].price');
    i = 1;
    while (i < s.length) {
      let rec = false;
      if (s.startsWith('..', i)) { rec = true; i += 2; } else if (s[i] === '.') i++; else if (s[i] !== '[') err(`Unexpected "${s[i]}"`);
      if (s[i] === '[') {
        let d = 0, j = i, q = null;
        for (; j < s.length; j++) { const c = s[j]; if (q) { if (c === '\\') j++; else if (c === q) q = null; } else if (c === "'" || c === '"') q = c; else if (c === '[' || c === '(') d++; else if (c === ']' || c === ')') { d--; if (!d) break; } }
        if (j >= s.length) err('A closing ] is missing');
        const inner = s.slice(i + 1, j).trim(); i = j + 1; let m;
        if (inner === '*') steps.push({ t: 'wild', rec });
        else if (inner[0] === '?') { let f = inner.slice(1).trim(); if (f[0] === '(' && f[f.length - 1] === ')') f = f.slice(1, -1); steps.push({ t: 'filter', f: compileFilter(f), rec }); }
        else if (m = /^-?\d+(\s*,\s*-?\d+)*$/.exec(inner)) steps.push({ t: 'idx', k: inner.split(',').map(Number), rec });
        else if (m = /^(-?\d*)\s*:\s*(-?\d*)\s*(?::\s*(-?\d*))?$/.exec(inner)) steps.push({ t: 'slice', a: m[1] === '' ? null : +m[1], b: m[2] === '' ? null : +m[2], c: m[3] ? +m[3] : 1, rec });
        else if (/^(['"]).*\1(\s*,\s*(['"]).*\3)*$/.test(inner)) steps.push({ t: 'key', k: [...inner.matchAll(/(['"])((?:[^\\]|\\.)*?)\1/g)].map(x => x[2].replace(/\\(.)/g, '$1')), rec });
        else err('Cannot read [' + inner + ']');
      } else if (s[i] === '*') { steps.push({ t: 'wild', rec }); i++; }
      else { const m = /^[^.\[\]\s]+/.exec(s.slice(i)); if (!m) err('A name is missing'); steps.push({ t: 'key', k: [m[0]], rec }); i += m[0].length; }
    }
    return steps;
  }
  function query(root, expr, cap) {
    const steps = compilePath(expr); cap = cap || 1000;
    let nodes = [{ v: root, p: [] }];
    const kids = (n, fn) => { const v = n.v; if (isArr(v)) v.forEach((x, k) => fn(x, k, k)); else if (isObj(v)) v.e.forEach(([key, x], k) => fn(x, key, k)); };
    const descend = (n, out) => { out.push(n); kids(n, (x, key) => descend({ v: x, p: n.p.concat(key) }, out)); };
    for (const st of steps) {
      const base = []; if (st.rec) nodes.forEach(n => descend(n, base)); else base.push(...nodes);
      const next = [];
      for (const n of base) {
        const v = n.v;
        if (st.t === 'wild') kids(n, (x, key) => next.push({ v: x, p: n.p.concat(key) }));
        else if (st.t === 'key') { if (isObj(v)) for (const want of st.k) v.e.forEach(([key, x]) => { if (key === want) next.push({ v: x, p: n.p.concat(key) }); }); }
        else if (st.t === 'idx') { if (isArr(v)) for (let k of st.k) { if (k < 0) k += v.length; if (k >= 0 && k < v.length) next.push({ v: v[k], p: n.p.concat(k) }); } }
        else if (st.t === 'slice') { if (isArr(v)) { const L = v.length, c = st.c || 1; let a = st.a === null ? 0 : st.a < 0 ? Math.max(0, L + st.a) : Math.min(st.a, L), b = st.b === null ? L : st.b < 0 ? Math.max(0, L + st.b) : Math.min(st.b, L); for (let k = a; c > 0 ? k < b : false; k += c) next.push({ v: v[k], p: n.p.concat(k) }); } }
        else if (st.t === 'filter') kids(n, (x, key) => { if (st.f(x)) next.push({ v: x, p: n.p.concat(key) }); });
      }
      nodes = next; if (nodes.length > 200000) nodes.length = 200000;
    }
    const res = nodes.slice(0, cap).map(n => ({ path: pathText(n.p), v: n.v })); res.total = nodes.length; return res;
  }

  // ---------- compare two documents ----------
  function diff(a, b, cap) {
    const out = [], max = cap || 5000;
    const same = (x, y) => (typeof num(x) === 'number' && typeof num(y) === 'number') ? num(x) === num(y) || (x instanceof Lex && y instanceof Lex && x.s === y.s) : x === y;
    (function walk(x, y, steps) {
      if (out.length >= max) return;
      if (isObj(x) && isObj(y)) {
        const my = new Map(y.e.map(([k, v]) => [k, v])), seen = new Set();
        for (const [k, v] of x.e) { seen.add(k); if (my.has(k)) walk(v, my.get(k), steps.concat(k)); else out.push({ type: 'removed', path: pathText(steps.concat(k)), a: v }); }
        for (const [k, v] of y.e) if (!seen.has(k)) out.push({ type: 'added', path: pathText(steps.concat(k)), b: v });
      } else if (isArr(x) && isArr(y)) {
        const L = Math.max(x.length, y.length);
        for (let k = 0; k < L; k++) { if (k >= x.length) out.push({ type: 'added', path: pathText(steps.concat(k)), b: y[k] }); else if (k >= y.length) out.push({ type: 'removed', path: pathText(steps.concat(k)), a: x[k] }); else walk(x[k], y[k], steps.concat(k)); }
      } else if (!same(x, y)) out.push({ type: 'changed', path: pathText(steps), a: x, b: y });
    })(a, b, []);
    return out;
  }

  // ---------- converters ----------
  function flat(v, prefix, into) {
    if (isObj(v) && v.e.length) v.e.forEach(([k, x]) => flat(x, prefix ? prefix + '.' + k : k, into));
    else if (isArr(v) || isObj(v)) into.push([prefix || 'value', write(v, '')]);
    else into.push([prefix || 'value', v === null ? '' : plain(v)]);
    return into;
  }
  function toCSV(root) {
    const rows = (isArr(root) ? root : [root]).map(r => flat(r, '', [])), head = [], seen = new Set();
    rows.forEach(r => r.forEach(([k]) => { if (!seen.has(k)) { seen.add(k); head.push(k); } }));
    const q = s => /[",\n\r]|^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    return [head.map(q).join(',')].concat(rows.map(r => { const m = new Map(r); return head.map(h => q(m.has(h) ? m.get(h) : '')).join(','); })).join('\r\n');
  }
  const yBare = /^(?![-?:,\[\]{}#&*!|>'"%@`\s])(?!.*(?::\s|\s#|\s$))(?!(?:true|false|null|yes|no|on|off|y|n|~)$)(?![+-]?(?:\d|\.\d))[^\n]+$/i;
  const yStr = s => yBare.test(s) && s.trim() === s ? s : JSON.stringify(s);
  const yScalar = v => v === null ? 'null' : typeof v === 'string' ? yStr(v) : plain(v);
  function toYAML(root) {
    function lines(v, ind) {
      const pad = '  '.repeat(ind), out = [];
      if (isArr(v)) { if (!v.length) return [pad + '[]']; v.forEach(x => { if (isCont(x) && len(x)) { const sub = lines(x, ind + 1); sub[0] = pad + '- ' + sub[0].slice(pad.length + 2); out.push(...sub); } else out.push(pad + '- ' + (isCont(x) ? (isArr(x) ? '[]' : '{}') : yScalar(x))); }); return out; }
      if (isObj(v)) { if (!v.e.length) return [pad + '{}']; v.e.forEach(([k, x]) => { const key = yStr(k); if (isCont(x) && len(x)) { out.push(pad + key + ':'); out.push(...lines(x, ind + 1)); } else out.push(pad + key + ': ' + (isCont(x) ? (isArr(x) ? '[]' : '{}') : yScalar(x))); }); return out; }
      return [pad + yScalar(v)];
    }
    return lines(root, 0).join('\n') + '\n';
  }
  function toXML(root, rootName) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), nm = s => { s = String(s).replace(/[^A-Za-z0-9_.-]/g, '_'); return /^[A-Za-z_]/.test(s) ? s : '_' + s; };
    function el(name, v, ind) {
      const pad = '  '.repeat(ind), n = nm(name);
      if (isArr(v)) return v.length ? v.map(x => el(name, x, ind)).join('\n') : pad + `<${n}/>`;
      if (isObj(v)) return v.e.length ? pad + `<${n}>\n` + v.e.map(([k, x]) => el(k, x, ind + 1)).join('\n') + `\n${pad}</${n}>` : pad + `<${n}/>`;
      return v === null ? pad + `<${n}/>` : pad + `<${n}>${esc(plain(v))}</${n}>`;
    }
    const r = nm(rootName || 'root');
    const body = isArr(root) ? `<${r}>\n` + (root.length ? root.map(x => el('item', x, 1)).join('\n') + '\n' : '') + `</${r}>` : isObj(root) ? el(r, root, 0) : el(r, root, 0);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + body + '\n';
  }
  Object.assign(W.JV, { pathText, find: findOrdered, query, diff, toCSV, toYAML, toXML, plain, isObj, isArr, isCont, len, childAt, keyAt });
})(window);
