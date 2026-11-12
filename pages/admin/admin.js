// DEMO admin: edits a draft in memory only. Nothing is saved anywhere yet (Firebase comes next).
(function () {
  const $ = id => document.getElementById(id), C = window.LOG_CONFIG, L = window.LINKS_DATA;
  const clone = o => JSON.parse(JSON.stringify(o)), esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const published = { clients: clone(C.clients), storages: clone(C.storages), localEnvs: clone(C.localEnvs), rules: [
    { name: 'Sun clients: iOS and Android on Live use the sunInt storage', clients: [...C.sunIntClients], types: ['ios', 'android'], env: 'Live', storage: 'sunInt', skip: true },
    { name: 'Sun clients: open links without a file check', clients: [...C.sunIntClients], types: ['all'], env: 'Both', storage: '', skip: true }], logTypes: clone(C.logTypes), links: clone(L) };
  let draft = clone(published), ops = 0, tab = 'clients', cl = 'live', q = '';
  const ic = d => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const EDIT = ic('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'), DEL = ic('M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14'), PLUS = ic('M12 5v14M5 12h14');
  const URLRE = /^(https?|itms-services):\/\//;

  // ---------- toast, dialog ----------
  function toast(m, ok) { const t = $('alert'); t.textContent = m; t.classList.toggle('ok', !!ok); t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => (t.style.display = 'none'), 2600); }
  // fields: {k,label,type:text|select|checks|textarea,opts,hint,ph,req,check(v,all)->msg}
  function form(title, fields, vals, onSave, o = {}) {
    const dlg = $('dlg'); $('dlgTitle').textContent = title;
    $('dlgBody').innerHTML = (o.text ? `<p style="color:var(--text-2)">${esc(o.text)}</p>` : '') + fields.map(f => {
      const v = vals[f.k] ?? '', id = 'f_' + f.k; let inp;
      if (f.type === 'select') inp = `<select id="${id}">${f.opts.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
      else if (f.type === 'checks') inp = `<div class="checks" id="${id}">${f.opts.map(x => `<label><input type="checkbox" value="${x[0]}" ${(v || []).includes(x[0]) ? 'checked' : ''}>${x[1]}</label>`).join('')}</div>`;
      else if (f.type === 'combo') inp = `<input id="${id}" list="${id}_l" value="${esc(v)}" placeholder="${esc(f.ph || '')}" autocomplete="off"><datalist id="${id}_l">${f.opts.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
      else inp = `<input id="${id}" value="${esc(v)}" placeholder="${esc(f.ph || '')}" autocomplete="off">`;
      return `<div class="fld"><label for="${id}">${f.label}</label>${inp}${f.hint ? `<div class="hint">${f.hint}</div>` : ''}<div class="err" id="e_${f.k}" hidden></div></div>`;
    }).join('');
    $('dlgExtra').innerHTML = o.extra ? o.extra.html : ''; $('dlgSave').textContent = o.ok || 'Save'; $('dlgSave').className = 'btn ' + (o.danger ? 'danger' : 'primary');
    const read = () => Object.fromEntries(fields.map(f => [f.k, f.type === 'checks' ? [...$('f_' + f.k).querySelectorAll('input:checked')].map(i => i.value) : $('f_' + f.k).value.trim()]));
    if (o.extra) o.extra.bind(read);
    $('dlgForm').onsubmit = e => {
      e.preventDefault(); const v = read(); let bad = false;
      fields.forEach(f => { const m = (f.req && !(f.type === 'checks' ? v[f.k].length : v[f.k]) ? 'Required.' : '') || (f.check && v[f.k] ? f.check(v[f.k], v) : ''); const el = $('e_' + f.k); el.hidden = !m; el.textContent = m; bad = bad || !!m; });
      if (!bad) { dlg.close(); onSave(v); }
    };
    dlg.showModal(); const first = $('dlgBody').querySelector('input,select'); if (first) first.focus();
  }
  const confirmDlg = (text, ok, fn) => form('Are you sure?', [], {}, fn, { text, ok, danger: true });
  $('dlgCancel').onclick = () => $('dlg').close();

  // ---------- draft + tracking ----------
  function mutate(fn) { fn(); ops++; render(); }
  function dirty() { return JSON.stringify(draft) !== JSON.stringify(published); }
  function bar() { const d = dirty(); $('bar').hidden = !d; if (d) $('opCount').textContent = `${ops} unsaved change${ops > 1 ? 's' : ''}`; else ops = 0; }
  const rowBtns = (i, k, mv) => `<td class="act-cell">${mv ? `<button class="icon-btn" data-m="up:${k}:${i}" aria-label="Move up" title="Move up">↑</button><button class="icon-btn" data-m="down:${k}:${i}" aria-label="Move down" title="Move down">↓</button>` : ''}<button class="icon-btn" data-e="${k}:${i}" aria-label="Edit" title="Edit">${EDIT}</button><button class="icon-btn del" data-d="${k}:${i}" aria-label="Delete" title="Delete">${DEL}</button></td>`;
  const table = (heads, rows) => rows.length ? `<table class="tbl"><thead><tr>${heads.map(h => `<th class="${h[1] || ''}">${h[0]}</th>`).join('')}<th></th></tr></thead><tbody>${rows.join('')}</tbody></table>` : '<div class="empty">Nothing here yet.</div>';
  const unique = (list, key, self) => v => list.some((x, i) => i !== self && String(x[key] ?? x[0]).toLowerCase() === v.toLowerCase()) ? 'Already exists.' : '';

  // ---------- panels ----------
  const P = {
    clients() {
      const list = draft.clients[cl], rows = list.map((c, i) => [c, i]).filter(([c]) => !q || (c[0] + c[1]).toLowerCase().includes(q.toLowerCase()));
      return head('Clients', 'The clients shown in the dropdown on the logs page, for Live and for Local.', 'Add client', 'add:clients') +
        `<div class="tools"><label class="segmented" id="clSeg" style="cursor:default"><span class="seg ${cl === 'live' ? 'on' : ''}" data-cl="live" style="cursor:pointer;${cl === 'live' ? 'background:var(--primary);color:var(--on-primary)' : ''}">Live (${draft.clients.live.length})</span><span class="seg" data-cl="local" style="cursor:pointer;${cl === 'local' ? 'background:var(--primary);color:var(--on-primary)' : ''}">Local (${draft.clients.local.length})</span></label>` +
        `<input id="q" type="search" placeholder="Search clients…" value="${esc(q)}" aria-label="Search clients"></div><div class="card">` +
        table([['Name'], ['Client ID']], rows.map(([c, i]) => `<tr><td>${esc(c[1])}</td><td class="mono">${esc(c[0])}</td>${rowBtns(i, 'clients')}</tr>`)) + '</div>';
    },
    env() {
      return head('Environments & storage', 'Where each environment’s files live, and which clients are routed somewhere else. Wrong addresses here break links, so edit with care.') +
        `<div class="card"><h3>Storage accounts <button class="btn sm" data-a="add:storage">${PLUS} Add</button></h3>` +
        table([['Key'], ['Address']], Object.entries(draft.storages).map(([k, u], i) => `<tr><td class="mono">${esc(k)}</td><td class="mono">${esc(u)}</td>${rowBtns(i, 'storage')}</tr>`)) + '</div>' +
        `<div class="card"><h3>Local environments <button class="btn sm" data-a="add:env">${PLUS} Add</button></h3>` +
        table([['Name'], ['Value', 'hide-sm'], ['Storage'], ['Skips file check', 'hide-sm']], draft.localEnvs.map((e, i) => `<tr><td>${esc(e.text)}</td><td class="mono hide-sm">${esc(e.value)}</td><td class="mono">${esc(e.storage)}</td><td class="hide-sm">${e.direct ? 'Yes' : 'No'}</td>${rowBtns(i, 'env')}</tr>`)) + '</div>' +
        `<div class="card"><h3>Client routing rules <button class="btn sm" data-a="add:rules">${PLUS} Add rule</button></h3><p class="hint" style="margin:-4px 0 12px">Use a rule when some clients keep their files in a different storage. Rules are read top to bottom, and the first rule that sets a storage wins.</p>` +
        table([['Rule'], ['Clients', 'hide-sm'], ['Where it applies', 'hide-sm'], ['Storage']], draft.rules.map((r, i) => `<tr><td>${esc(r.name)}</td><td class="mono hide-sm">${esc(r.clients.join(', '))}</td><td class="hide-sm">${r.env} · ${r.types.includes('all') ? 'all log types' : esc(r.types.join(', '))}</td><td>${r.storage ? `<span class="mono">${esc(r.storage)}</span>` : 'normal'}${r.skip ? ' · no file check' : ''}</td>${rowBtns(i, 'rules', 1)}</tr>`)) + '</div>';
    },
    types() {
      const nm = { client: 'client', date: 'date', rep: 'rep code' };
      return head('Log types', 'Each log button on the logs page. The address template decides the final link.', 'Add log type', 'add:types') + '<div class="card">' +
        table([['Button'], ['Group', 'hide-sm'], ['Needs', 'hide-sm'], ['Address template']], draft.logTypes.map((t, i) => `<tr><td>${esc(t.label)}</td><td class="hide-sm">${esc(t.group)}</td><td class="hide-sm">${t.needs.map(n => nm[n]).join(', ')}</td><td class="mono">${esc(t.path)}</td>${rowBtns(i, 'types')}</tr>`)) + '</div>';
    },
    links() {
      return head('Links', 'What appears on the Important Links page. Sections are the cards; add as many as you need.', 'Add link', 'add:links', ['Add section', 'add:section']) + (draft.links.length ? '' : '<div class="empty">No sections yet. Add a section first.</div>') + draft.links.map((s, si) => `<div class="card"><h3><span>${esc(s.title)} <span class="badge">${s.kind === 'copy' ? 'Copy' : 'Open'}</span></span><span><button class="icon-btn" data-e="section:${si}" aria-label="Rename section" title="Edit section">${EDIT}</button><button class="icon-btn del" data-d="section:${si}" aria-label="Delete section" title="Delete section">${DEL}</button></span></h3>` +
        table([['Name'], ['Note', 'hide-sm'], ['Address']], s.items.map((it, ii) => `<tr><td>${esc(it.name)}</td><td class="hide-sm">${esc(it.note)}</td><td class="mono">${it.url ? esc(it.url.length > 46 ? it.url.slice(0, 46) + '…' : it.url) : '<span class="badge">No link yet</span>'}</td>${rowBtns(si + ':' + ii, 'links')}</tr>`)) + '</div>').join('');
    }
  };
  function head(t, p, btn, act, b2) { return `<div class="panel-head"><div><h2>${t}</h2><p>${p}</p></div><span class="bar-btns">${b2 ? `<button class="btn" data-a="${b2[1]}">${PLUS} ${b2[0]}</button>` : ''}${btn ? `<button class="btn primary" data-a="${act}">${PLUS} ${btn}</button>` : ''}</span></div>`; }

  // ---------- add / edit / delete ----------
  const idF = (list, self) => ({ k: 'id', label: 'Client ID', req: 1, hint: 'Letters and numbers, as used in the storage path.', check: (v) => /^[\w-]+$/.test(v) ? unique(list, 0, self)(v) : 'Use letters, numbers, - or _ only.' });
  const urlF = (k = 'url', req = 1) => ({ k, label: 'Address', req, ph: 'https://…', check: v => URLRE.test(v) ? '' : 'Must start with https://' });
  const sample = { client: 'danone', CLIENT: 'DANONE', date: '04-11-2026', ymd: '20261104', rep: 'D0037' };
  function typeForm(i) {
    const OPT1 = 'Follow the environment', OPT2 = 'Pre env uses Pre storage, all others use UAT';
    const t0 = i == null ? { label: '', group: 'iOS', needs: ['client', 'date', 'rep'], path: '' } : draft.logTypes[i], t = { ...t0, local: t0.localMap ? OPT2 : OPT1 };
    const extra = { html: `<div class="tokens" id="tk">${Object.keys(sample).map(k => `<button type="button" data-t="{${k}}">{${k}}</button>`).join('')}</div><div class="pv" id="pv"></div>`,
      bind: read => { const pv = () => { $('pv').textContent = 'Example: ' + draft.storages.live + '/' + $('f_path').value.replace(/\{(\w+)\}/g, (m, n) => sample[n] ?? m); };
        $('f_path').addEventListener('input', pv); $('tk').onclick = e => { if (e.target.dataset.t) { $('f_path').value += e.target.dataset.t; pv(); } }; pv(); } };
    form(i == null ? 'Add log type' : 'Edit log type', [
      { k: 'label', label: 'Button name', req: 1, ph: 'e.g. CP3 logs' },
      { k: 'group', label: 'Group', type: 'combo', req: 1, opts: [...new Set(draft.logTypes.map(x => x.group))], hint: 'Pick an existing group, or type a new name to create one. A group disappears when its last button is deleted.' },
      { k: 'needs', label: 'Fields that must be filled', type: 'checks', req: 1, opts: [['client', 'Client'], ['date', 'Date'], ['rep', 'Rep code']] },
      { k: 'path', label: 'Address template', req: 1, hint: 'The part after the storage address. Tap a token below to insert it.' },
      { k: 'local', label: 'Storage on Local', type: 'select', opts: [OPT1, OPT2], hint: 'Most buttons follow the chosen Local environment. API-style logs use a fixed rule.' }], t,
      v => mutate(() => { const n = { ...(i == null ? {} : draft.logTypes[i]), label: v.label, group: v.group, needs: v.needs, path: v.path }; if (v.local === OPT2) n.localMap = { preENV: 'pre', default: 'uat' }; else delete n.localMap; i == null ? draft.logTypes.push(n) : (draft.logTypes[i] = n); }), { extra });
  }
  function linkForm(si, ii) {
    const it = ii == null ? { name: '', note: '', url: '', sec: draft.links[si ?? 0].title } : { ...draft.links[si].items[ii], sec: draft.links[si].title };
    form(ii == null ? 'Add link' : 'Edit link', [
      { k: 'sec', label: 'Section', type: 'select', opts: draft.links.map(s => s.title) },
      { k: 'name', label: 'Name', req: 1 }, { k: 'note', label: 'Note', hint: 'Short description shown under the name.' },
      { ...urlF('url', 0), hint: 'Leave empty to show the row greyed out as “No link yet”.', check: v => URLRE.test(v) ? '' : 'Must start with https://' }], it,
      v => mutate(() => { const ns = draft.links.findIndex(s => s.title === v.sec), item = { name: v.name, note: v.note, url: v.url || null };
        if (ii != null && ns === si) draft.links[si].items[ii] = item; else { if (ii != null) draft.links[si].items.splice(ii, 1); draft.links[ns].items.push(item); } }));
  }
  const handlers = {
    'add:clients': () => form('Add client', [{ k: 'name', label: 'Name', req: 1, ph: 'e.g. DANONE' }, idF(draft.clients[cl], -1)], {}, v => mutate(() => draft.clients[cl].push([v.id, `${v.name} (${v.id})`]))),
    'edit:clients': i => { const c = draft.clients[cl][i]; form('Edit client', [{ k: 'name', label: 'Name', req: 1 }, idF(draft.clients[cl], +i)], { name: c[1].replace(/\s*\([^)]*\)\s*$/, ''), id: c[0] }, v => mutate(() => (draft.clients[cl][i] = [v.id, `${v.name} (${v.id})`]))); },
    'del:clients': i => confirmDlg(`Delete ${draft.clients[cl][i][1]}? It disappears from the logs page dropdown once you publish.`, 'Delete', () => mutate(() => draft.clients[cl].splice(i, 1))),
    'add:storage': () => form('Add storage account', [{ k: 'key', label: 'Key', req: 1, hint: 'A short name, e.g. uat2.', check: v => draft.storages[v] ? 'Already exists.' : '' }, urlF('url')], {}, v => mutate(() => (draft.storages[v.key] = v.url))),
    'edit:storage': i => { const [k, u] = Object.entries(draft.storages)[i]; form('Edit storage address', [urlF('url')], { url: u }, v => mutate(() => (draft.storages[k] = v.url))); },
    'del:storage': i => { const k = Object.keys(draft.storages)[i]; confirmDlg(`Delete the “${k}” storage? Environments or log types using it will stop working.`, 'Delete', () => mutate(() => delete draft.storages[k])); },
    'add:env': () => envForm(null), 'edit:env': i => envForm(+i),
    'del:env': i => confirmDlg(`Delete ${draft.localEnvs[i].text}?`, 'Delete', () => mutate(() => draft.localEnvs.splice(i, 1))),
    'add:rules': () => ruleForm(null), 'edit:rules': i => ruleForm(+i),
    'del:rules': i => confirmDlg(`Delete the rule “${draft.rules[i].name}”?`, 'Delete', () => mutate(() => draft.rules.splice(i, 1))),
    'add:section': () => sectionForm(null), 'edit:section': i => sectionForm(+i),
    'del:section': i => confirmDlg(`Delete the section “${draft.links[i].title}” and its ${draft.links[i].items.length} link(s)?`, 'Delete', () => mutate(() => draft.links.splice(i, 1))),
    'add:types': () => typeForm(null), 'edit:types': i => typeForm(+i),
    'del:types': i => confirmDlg(`Delete the “${draft.logTypes[i].label}” button?`, 'Delete', () => mutate(() => draft.logTypes.splice(i, 1))),
    'add:links': () => draft.links.length ? linkForm(0, null) : toast('Add a section first.'), 'edit:links': k => { const [s, i] = k.split(':'); linkForm(+s, +i); },
    'del:links': k => { const [s, i] = k.split(':').map(Number); confirmDlg(`Delete “${draft.links[s].items[i].name}”?`, 'Delete', () => mutate(() => draft.links[s].items.splice(i, 1))); }
  };
  function ruleForm(i) {
    const r0 = i == null ? { name: '', clients: [], types: ['all'], env: 'Live', storage: '', skip: false } : draft.rules[i];
    form(i == null ? 'Add routing rule' : 'Edit routing rule', [
      { k: 'name', label: 'Rule name', req: 1, ph: 'e.g. Acme keeps iOS logs in the archive storage' },
      { k: 'clients', label: 'Client IDs', req: 1, hint: 'Separate several with commas.' },
      { k: 'types', label: 'Applies to', type: 'checks', req: 1, opts: [['all', 'All log types'], ...draft.logTypes.map(t => [t.id, t.label])] },
      { k: 'env', label: 'Environment', type: 'select', opts: ['Live', 'Local', 'Both'] },
      { k: 'storage', label: 'Storage to use', type: 'select', opts: ['Normal', ...Object.keys(draft.storages)], hint: '“Normal” keeps the usual storage for that environment.', check: (v, all) => v === 'Normal' && all.skip === 'No' ? 'Pick a storage, or turn on “open without checking”, otherwise the rule does nothing.' : '' },
      { k: 'skip', label: 'Open without checking the file exists', type: 'select', opts: ['No', 'Yes'] }],
      { ...r0, clients: r0.clients.join(', '), storage: r0.storage || 'Normal', skip: r0.skip ? 'Yes' : 'No' },
      v => mutate(() => { const n = { name: v.name, clients: v.clients.split(',').map(x => x.trim().toLowerCase()).filter(Boolean), types: v.types, env: v.env, storage: v.storage === 'Normal' ? '' : v.storage, skip: v.skip === 'Yes' }; i == null ? draft.rules.push(n) : (draft.rules[i] = n); }));
  }
  function sectionForm(i) {
    const s0 = i == null ? { title: '', kind: 'open' } : draft.links[i];
    form(i == null ? 'Add section' : 'Edit section', [
      { k: 'title', label: 'Section name', req: 1, ph: 'e.g. Team contacts', check: v => draft.links.some((x, n) => n !== i && x.title.toLowerCase() === v.toLowerCase()) ? 'Already exists.' : '' },
      { k: 'kind', label: 'Button on each link', type: 'select', opts: ['Open link', 'Copy link'], hint: '“Open link” opens a page. “Copy link” copies the address to the clipboard.' }],
      { title: s0.title, kind: s0.kind === 'copy' ? 'Copy link' : 'Open link' },
      v => mutate(() => { const kind = v.kind === 'Copy link' ? 'copy' : 'open'; if (i == null) draft.links.push({ id: v.title.toLowerCase().replace(/\W+/g, '-'), title: v.title, kind, items: [] }); else Object.assign(draft.links[i], { title: v.title, kind }); }));
  }
  function envForm(i) {
    const e = i == null ? { text: '', value: '', storage: Object.keys(draft.storages)[0], direct: false } : draft.localEnvs[i];
    form(i == null ? 'Add local environment' : 'Edit local environment', [{ k: 'text', label: 'Name', req: 1, ph: 'e.g. PRE ENV' },
      { k: 'value', label: 'Value', req: 1, hint: 'Used internally. Keep it short, no spaces.', check: v => draft.localEnvs.some((x, n) => n !== i && x.value === v) ? 'Already exists.' : '' },
      { k: 'storage', label: 'Storage', type: 'select', opts: Object.keys(draft.storages) },
      { k: 'direct', label: 'Open links without checking the file exists', type: 'select', opts: ['No', 'Yes'] }], { ...e, direct: e.direct ? 'Yes' : 'No' },
      v => mutate(() => { const n = { text: v.text, value: v.value, storage: v.storage, ...(v.direct === 'Yes' ? { direct: true } : {}) }; i == null ? draft.localEnvs.push(n) : (draft.localEnvs[i] = n); }));
  }

  // ---------- render + events ----------
  function render() {
    const counts = { clients: draft.clients.live.length + draft.clients.local.length, env: draft.localEnvs.length + draft.rules.length, types: draft.logTypes.length, links: draft.links.reduce((n, s) => n + s.items.length, 0) };
    document.querySelectorAll('.tab').forEach(t => { t.setAttribute('aria-selected', t.dataset.tab === tab); t.querySelector('span').textContent = counts[t.dataset.tab]; });
    const keep = document.activeElement && document.activeElement.id === 'q';
    $('panel').innerHTML = P[tab](); bar();
    if (keep) { const i = $('q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-tab],[data-a],[data-e],[data-d],[data-cl],[data-m]'); if (!t) return;
    if (t.dataset.m) { const [d, k, i] = t.dataset.m.split(':'), j = +i + (d === 'up' ? -1 : 1), l = draft[k]; if (j >= 0 && j < l.length) mutate(() => ([l[i], l[j]] = [l[j], l[i]])); }
    else if (t.dataset.tab) { tab = t.dataset.tab; q = ''; render(); }
    else if (t.dataset.cl) { cl = t.dataset.cl; render(); }
    else if (t.dataset.a) { const [a, k] = t.dataset.a.split(':'); handlers[a + ':' + k](); }
    else if (t.dataset.e) { const [k, i] = [t.dataset.e.split(':')[0], t.dataset.e.slice(t.dataset.e.indexOf(':') + 1)]; handlers['edit:' + k](i); }
    else if (t.dataset.d) { const k = t.dataset.d.split(':')[0], i = t.dataset.d.slice(t.dataset.d.indexOf(':') + 1); handlers['del:' + k](i); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'q') { q = e.target.value; render(); } });
  $('signIn').onclick = () => { $('gate').hidden = true; $('app').hidden = false; $('user').hidden = false; render(); };
  $('signOut').onclick = () => { $('gate').hidden = false; $('app').hidden = true; $('user').hidden = true; };
  $('publish').onclick = () => confirmDlg('Publish all changes to the live pages? (Demo: nothing is really saved yet.)', 'Publish', () => { Object.assign(published, clone(draft)); ops = 0; toast('Published (demo)', true); render(); });
  $('discard').onclick = () => confirmDlg('Discard all unsaved changes?', 'Discard', () => { draft = clone(published); ops = 0; render(); toast('Changes discarded', true); });
  $('dlgSave').addEventListener('click', () => {});
})();
