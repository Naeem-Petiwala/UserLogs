// Logs page helpers: the Live/Local tag, the line under "Open logs" and the Today button.
(function () {
  const cb = document.getElementById('myCheckbox'), pill = document.getElementById('modePill');
  function mode() { if (cb && pill) { pill.textContent = cb.checked ? 'Live' : 'Local'; pill.classList.toggle('live', cb.checked); } }
  if (cb) { cb.addEventListener('change', mode); mode(); }
  const p1 = document.getElementById('param1'), cf = document.getElementById('customClientField'), cbox = document.getElementById('customClientInput');
  const rep = document.getElementById('param3'), ctx = document.getElementById('ctx'), drop = document.getElementById('localDrop'), dt = document.getElementById('param2');
  // One function keeps every label in step with the real form state.
  function sync() {
    mode();
    if (drop && cb) drop.disabled = cb.checked;
    if (!ctx || !p1) return;
    const custom = cbox && !cbox.classList.contains('hidden');
    const client = custom ? cf.value.trim() : (p1.options[p1.selectedIndex] || {}).text;
    const d = dt.value ? new Date(dt.value + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const parts = [['Client', client], ['Date', d], ['Rep code', rep.value.trim() || 'not entered']].filter(p => p[1]);
    const key = JSON.stringify(parts);
    if (ctx.dataset.k === key) return;
    ctx.dataset.k = key; ctx.textContent = '';
    parts.forEach(p => { const s = document.createElement('span'), b = document.createElement('b'); b.textContent = p[0] + ' '; s.append(b, p[1]); ctx.append(s); });
  }
  if (cb) { ['input', 'change', 'click'].forEach(e => document.addEventListener(e, () => setTimeout(sync, 0))); setInterval(sync, 300); sync(); }
  const today = document.getElementById('todayBtn'), date = document.getElementById('param2');
  if (today && date) today.addEventListener('click', () => { const n = new Date(); date.value = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); });
})();
