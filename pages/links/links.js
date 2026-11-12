(function () {
  const $ = id => document.getElementById(id), data = window.LINKS_DATA;
  const rows = [];   // {el, text, sec} for searching
  const copyIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9h10v10H9zM5 15V5h10"/></svg>';

  function toast(msg, ok) {
    const t = $('alert'); t.textContent = msg; t.classList.toggle('ok', !!ok); t.style.display = 'block';
    clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.display = 'none'), 2500);
  }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // build the page from the data list
  data.forEach((sec, i) => {
    const box = el('details', 'row');
    const sum = el('summary', 'sub-heading'); sum.append(el('span', '', sec.title), el('span', 'count', sec.items.length));
    const body = el('div', 'content');
    sec.items.forEach(item => {
      const r = el('div', 'link-row' + (item.url ? '' : ' no-link')), info = el('div', 'info');
      const name = el('div', 'name', item.name), note = el('div', 'note', item.note);
      info.append(name, note);
      if (sec.kind === 'copy' && item.url) { const u = el('div', 'url', item.url); u.title = item.url; info.append(u); }
      const btn = el('button', 'table-button', sec.kind === 'copy' ? 'Copy link' : item.url ? 'Open link' : 'No link yet');
      btn.type = 'button';
      if (!item.url) { btn.setAttribute('aria-disabled', 'true'); }
      else btn.addEventListener('click', () => {
        if (sec.kind === 'copy') navigator.clipboard.writeText(item.url).then(() => toast('Link copied', true), () => toast('Could not copy the link'));
        else window.open(item.url, '_blank', 'noopener');
      });
      r.append(info, btn); body.append(r);
      rows.push({ r, name, note, text: (item.name + ' ' + item.note).toLowerCase(), box, sec: sec.id });
    });
    // accordion: opening one section closes the others (while searching, sections open freely)
    sum.addEventListener('click', e => {
      e.preventDefault();
      const willOpen = !box.open;
      if (!$('searchBar').value.trim()) document.querySelectorAll('.row').forEach(o => { o.open = false; });
      box.open = willOpen;
    });
    box.append(sum, body); $('container').append(box);
  });

  // search: plain text matching, highlights built with DOM nodes (no HTML injection, no regex)
  function mark(node, text, q) {
    node.textContent = '';
    const low = text.toLowerCase(); let from = 0, at;
    while (q && (at = low.indexOf(q, from)) !== -1) {
      node.append(text.slice(from, at)); node.append(el('mark', '', text.slice(at, at + q.length))); from = at + q.length;
    }
    node.append(text.slice(from));
  }
  function search() {
    const q = $('searchBar').value.trim().toLowerCase(); let total = 0;
    document.querySelectorAll('.row').forEach(box => { box.dataset.hits = 0; });
    rows.forEach(x => {
      const hit = !q || x.text.includes(q); x.r.hidden = !hit;
      const items = data.find(s => s.id === x.sec).items, it = items[[...x.r.parentNode.children].indexOf(x.r)];
      mark(x.name, it.name, hit ? q : ''); mark(x.note, it.note, hit ? q : '');
      if (hit) { total++; x.box.dataset.hits = +x.box.dataset.hits + 1; }
    });
    document.querySelectorAll('.row').forEach(box => { box.hidden = !!q && box.dataset.hits === '0'; box.open = !!q && box.dataset.hits !== '0'; });
    $('noResults').hidden = !q || total > 0;
    $('noResults').textContent = `Nothing matches “${$('searchBar').value.trim()}”.`;
  }
  $('searchBar').addEventListener('input', search);
  $('clearButton').addEventListener('click', () => { $('searchBar').value = ''; search(); $('searchBar').focus(); });
  $('searchBar').addEventListener('keydown', e => { if (e.key === 'Escape') $('clearButton').click(); });
})();
