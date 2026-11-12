// JSON Viewer engine, part 1: parser, writer and small helpers. No page code in here.
// Our own parser (not JSON.parse): keeps key order and the exact text of numbers, gives clear errors,
// and has a "repair" mode that accepts common mistakes (comments, trailing commas, single quotes, unquoted keys, True/None).
(function (W) {
  class O { constructor(e) { this.e = e; } }      // an object as [key, value] pairs in the original order
  class Lex { constructor(s) { this.s = s; } }    // a number that would change as a JS number (1.0, 12345678901234567890), kept as written

  function parse(src, opt) {
    opt = opt || {}; const lenient = !!opt.lenient, fx = opt.fixes = opt.fixes || {}, bump = k => { fx[k] = (fx[k] || 0) + 1; };
    let i = 0; const n = src.length, NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y, ID = /[A-Za-z_$][\w$]*/y;
    const fail = (m, p = i) => { const e = new Error(m); e.pos = p; throw e; };
    const show = c => c === undefined ? 'the end of the text' : `"${c}"`;
    function ws() {
      for (;;) {
        while (i < n) { const c = src.charCodeAt(i); if (c === 32 || c === 10 || c === 13 || c === 9) i++; else break; }
        if (lenient && src[i] === '/') {
          if (src[i + 1] === '/') { const e = src.indexOf('\n', i); i = e === -1 ? n : e + 1; bump('comments'); continue; }
          if (src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); if (e === -1) fail('A comment is never closed. The closing */ is missing'); i = e + 2; bump('comments'); continue; }
        }
        break;
      }
    }
    function str() {
      const st = i, q = src[i]; i++;
      if (q === "'") {   // single quotes (repair mode only)
        let out = '';
        while (i < n) { const c = src[i]; if (c === '\\') { const d = src[i + 1]; out += d === "'" ? "'" : '\\' + d; i += 2; continue; } if (c === "'") { i++; bump('singleQuotes'); try { return JSON.parse('"' + out.replace(/(^|[^\\])(\\\\)*"/g, m => m.slice(0, -1) + '\\"') + '"'); } catch (e) { fail('Invalid escape sequence in this text', st); } } if (c === '"') out += '\\"'; else if (c === '\n') fail('A line break is inside the text', i); else out += c; i++; }
        fail("This text is never closed. A closing ' is missing", st);
      }
      let esc = false;
      while (i < n) {
        const c = src.charCodeAt(i);
        if (c === 92) { esc = true; i += 2; continue; }
        if (c === 34) { i++; if (!esc) return src.slice(st + 1, i - 1); try { return JSON.parse(src.slice(st, i)); } catch (e) { fail('Invalid escape sequence in this text', st); } }
        if (c < 32) fail('A line break or control character is inside the text. Write it as \\n', i);
        i++;
      }
      fail('This text is never closed. A closing quote " is missing', st);
    }
    const word = w => src.startsWith(w, i) && !/[\w$]/.test(src[i + w.length] || '');
    function val() {
      ws(); if (i >= n) fail('The text ends too early. A value is missing');
      const c = src[i];
      if (c === '{') return obj(); if (c === '[') return arr(); if (c === '"' || (lenient && c === "'")) return str();
      if (c === '-' || (c >= '0' && c <= '9')) { NUM.lastIndex = i; const m = NUM.exec(src); if (!m) fail('This is not a valid number'); i += m[0].length; const v = Number(m[0]); return String(v) === m[0] ? v : new Lex(m[0]); }
      if (word('true')) { i += 4; return true; } if (word('false')) { i += 5; return false; } if (word('null')) { i += 4; return null; }
      if (lenient) { if (word('True')) { i += 4; bump('pythonWords'); return true; } if (word('False')) { i += 5; bump('pythonWords'); return false; } if (word('None')) { i += 4; bump('pythonWords'); return null; } if (word('undefined')) { i += 9; bump('pythonWords'); return null; } }
      if (c === "'") fail("Text must use double quotes \" not single quotes '");
      fail(`Unexpected ${show(c)}. A value (text, number, true, false, null, { or [) was expected`);
    }
    function obj() {
      i++; const e = []; ws(); if (src[i] === '}') { i++; return new O(e); }
      for (;;) {
        ws(); let k;
        if (src[i] === '}' && lenient && e.length) { i++; bump('trailingCommas'); return new O(e); }
        if (src[i] === '"' || (lenient && src[i] === "'")) k = str();
        else if (lenient && (ID.lastIndex = i, ID.test(src) && (ID.lastIndex = i, true))) { ID.lastIndex = i; k = ID.exec(src)[0]; i += k.length; bump('unquotedKeys'); }
        else fail(src[i] === '}' ? 'There is a comma before the closing }. Remove it' : src[i] === "'" ? "Property names need double quotes \" not single quotes '" : `Expected a property name in double quotes, found ${show(src[i])}`);
        ws(); if (src[i] !== ':') fail(`Expected ":" after the property name, found ${show(src[i])}`); i++;
        e.push([k, val()]); ws();
        if (src[i] === ',') { i++; continue; } if (src[i] === '}') { i++; return new O(e); }
        fail(`Expected "," or "}" after the value, found ${show(src[i])}. A comma may be missing`);
      }
    }
    function arr() {
      i++; const a = []; ws(); if (src[i] === ']') { i++; return a; }
      for (;;) {
        ws(); if (src[i] === ']') { if (lenient && a.length) { i++; bump('trailingCommas'); return a; } fail('There is a comma before the closing ]. Remove it'); }
        a.push(val()); ws();
        if (src[i] === ',') { i++; continue; } if (src[i] === ']') { i++; return a; }
        fail(`Expected "," or "]" after the value, found ${show(src[i])}. A comma may be missing`);
      }
    }
    const v = val(); ws(); if (i < n) fail('There is extra text after the JSON value. A JSON document holds only one value'); return v;
  }
  function lineCol(src, pos) { let line = 1, last = -1, k = -1; while ((k = src.indexOf('\n', k + 1)) !== -1 && k < pos) { line++; last = k; } return { line, col: pos - last, start: last + 1 }; }
  function write(v, unit) {
    const out = [];
    (function w(v, lvl) {
      if (v === null) out.push('null'); else if (typeof v === 'string') out.push(JSON.stringify(v)); else if (typeof v === 'number' || typeof v === 'boolean') out.push(String(v)); else if (v instanceof Lex) out.push(v.s);
      else {
        const isArr = Array.isArray(v), len = isArr ? v.length : v.e.length, open = isArr ? '[' : '{', close = isArr ? ']' : '}';
        if (!len) { out.push(open + close); return; }
        const pad = unit ? '\n' + unit.repeat(lvl + 1) : ''; out.push(open);
        for (let k = 0; k < len; k++) { out.push((k ? ',' : '') + pad); if (isArr) w(v[k], lvl + 1); else { out.push(JSON.stringify(v.e[k][0]) + (unit ? ': ' : ':')); w(v.e[k][1], lvl + 1); } }
        out.push((unit ? '\n' + unit.repeat(lvl) : '') + close);
      }
    })(v, 0);
    return out.join('');
  }
  function sortKeys(v) { return Array.isArray(v) ? v.map(sortKeys) : v instanceof O ? new O(v.e.map(([k, x]) => [k, sortKeys(x)]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) : v; }
  const kind = v => v === null ? 'null' : Array.isArray(v) ? 'Array' : v instanceof O ? 'Object' : v instanceof Lex || typeof v === 'number' ? 'Number' : typeof v === 'string' ? 'String' : 'Boolean';
  const num = v => v instanceof Lex ? Number(v.s) : v;
  function count(v, cap) { let n = 0; const st = [v]; while (st.length && n < cap) { const x = st.pop(); n++; if (Array.isArray(x)) for (let k = 0; k < x.length; k++) st.push(x[k]); else if (x instanceof O) for (let k = 0; k < x.e.length; k++) st.push(x.e[k][1]); } return n; }
  W.JV = { O, Lex, parse, write, lineCol, sortKeys, kind, num, count };
})(window);
