(() => {
  const { items: ALL_ITEMS, types: TYPES, areas: RAW_AREAS, tcReach: TC_REACH } = window.D2DATA;

  const DIFF = ['Normal', 'Nightmare', 'Hell'];
  const TIER = ['', 'Normal', 'Exceptional', 'Elite'];
  const CLASS = { ama: 'Amazon', sor: 'Sorceress', nec: 'Necromancer', pal: 'Paladin', bar: 'Barbarian', dru: 'Druid', ass: 'Assassin', war: 'Warlock' };
  const MAX_MLVL = TC_REACH.length - 1;

  // Game progression: difficulty → act → area level → area id
  const AREAS = RAW_AREAS.slice().sort((a, b) => a.d - b.d || a.a - b.a || a.l - b.l || a.id - b.id);

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- mechanics ----------
  const bucket = q => Math.ceil(q / 3) * 3;
  const canDrop = (item, mlvl) => TC_REACH[Math.min(mlvl, MAX_MLVL)] >= bucket(item.q);
  const minDropMlvl = item => { for (let m = 1; m <= MAX_MLVL; m++) if (canDrop(item, m)) return m; return null; };
  const bracket = ilvl => (ilvl <= 25 ? 0 : ilvl <= 40 ? 1 : 2);
  const sockAt = (item, ilvl) => Math.min(item.gs, (TYPES[item.t].s || [0, 0, 0])[bracket(ilvl)]);
  const minIlvlForSock = (item, s) => [1, 26, 41].find(l => sockAt(item, l) >= s) ?? null;

  function settings() {
    return {
      clvl: Math.max(1, Math.min(99, parseInt($('clvl').value, 10) || 1)),
      bonus: parseInt($('mtype').value, 10) || 0,
    };
  }
  // Normal areas hold monsters of different MonStats levels; the strongest regular one decides what can drop
  const mlvlFor = (area, st) => area.l + st.bonus;
  const mlvlText = (area, st) => (area.lo !== area.l ? `${area.lo + st.bonus}–${area.l + st.bonus}` : String(area.l + st.bonus));
  const visibleItems = () => ALL_ITEMS;
  const areaLabel = a => `${DIFF[a.d]} · Act ${a.a} · ${a.n}`;

  function itemMeta(item) {
    const t = TYPES[item.t];
    const cls = t.c && CLASS[t.c] ? ` · ${CLASS[t.c]} only` : '';
    return `${esc(t.n)} · ${TIER[item.tier]}${cls}`;
  }
  const sockPips = n => n > 0
    ? `<span class="pips" role="img" aria-label="${n} socket${n > 1 ? 's' : ''}">${'<i></i>'.repeat(n)}</span>`
    : '<span class="none">none</span>';

  // ---------- tab 1: find a base ----------
  const itemByName = new Map(ALL_ITEMS.map(i => [i.n.toLowerCase(), i]));

  function fillBaseList() {
    const st = settings();
    $('baseList').innerHTML = visibleItems(st)
      .slice().sort((a, b) => a.n.localeCompare(b.n))
      .map(i => `<option value="${esc(i.n)}">${esc(TYPES[i.t].n)} · qlvl ${i.q}</option>`).join('');
  }

  function currentItem() { return itemByName.get($('baseSearch').value.trim().toLowerCase()) || null; }

  function fillSockWant(item) {
    const prev = $('sockWant').value;
    const max = item ? Math.max(...[1, 26, 41].map(l => sockAt(item, l))) : 6;
    let html = '<option value="0">Any</option>';
    for (let s = 1; s <= max; s++) html += `<option value="${s}">${s}${s === max ? ' (max)' : ''}</option>`;
    $('sockWant').innerHTML = html;
    if (item && +prev > max) $('sockWant').value = String(max);
    else if ([...$('sockWant').options].some(o => o.value === prev)) $('sockWant').value = prev;
  }

  function renderBase() {
    const st = settings();
    const item = currentItem();
    const out = $('baseResult');
    if (!item) {
      out.innerHTML = $('baseSearch').value.trim()
        ? '<p class="hint">No base with that name. Pick one from the list.</p>'
        : '<p class="hint">Type a base name to see where it drops first.</p>';
      return;
    }
    const want = parseInt($('sockWant').value, 10) || 0;
    const caps = [1, 26, 41].map(l => sockAt(item, l));
    const maxS = Math.max(...caps);
    const dropM = minDropMlvl(item);
    const sockIlvl = want ? minIlvlForSock(item, want) : 1;
    const needM = dropM == null || sockIlvl == null ? null : Math.max(dropM, sockIlvl);

    const rows = AREAS.map(a => {
      const m = mlvlFor(a, st);
      const drops = canDrop(item, m);
      const s = drops ? sockAt(item, m) : 0;
      return { a, m, drops, s, ok: drops && s >= want };
    });
    const firstDrop = rows.find(r => r.drops);
    const firstOk = rows.find(r => r.ok);
    const usable = item.rl <= st.clvl;

    let html = `
      <div class="bf-head">
        <div>
          <h3>${esc(item.n)}</h3>
          <p class="hint">${itemMeta(item)}</p>
        </div>
        <p class="bf-req ${usable ? 'ok' : 'bad'}">${item.rl ? `Required level ${item.rl}` : 'No level requirement'}${item.str ? ` · ${item.str} Str` : ''}${item.dex ? ` · ${item.dex} Dex` : ''}
          <span>${usable ? `wearable at level ${st.clvl}` : `${item.rl - st.clvl} more levels needed`}</span></p>
      </div>
      <div class="results">
        ${answerBox('Earliest drop', firstDrop, st, `needs mlvl ${dropM ?? '?'}+`)}
        ${want ? answerBox(`Earliest with ${want} socket${want > 1 ? 's' : ''}`, firstOk, st,
          sockIlvl == null ? `can't roll ${want} sockets` : `needs mlvl ${needM}+ (ilvl ${sockIlvl}+)`) : ''}
      </div>
      <div class="stats">
        <div><span class="k">Quality level</span><span class="v">${item.q}</span></div>
        <div><span class="k">Treasure class group</span><span class="v">${bucket(item.q)}</span></div>
        <div><span class="k">Drops from mlvl</span><span class="v">${dropM ?? '—'}</span></div>
        <div><span class="k">Base socket limit</span><span class="v">${item.gs || 0}</span></div>
        <div class="wide"><span class="k">Max sockets by item level</span><span class="v bf-brackets">
          <span>ilvl 1–25 ${sockPips(caps[0])}</span><span>26–40 ${sockPips(caps[1])}</span><span>41+ ${sockPips(caps[2])}</span></span></div>
      </div>
      ${maxS === 0 ? '<p class="note">This base can\'t have sockets.</p>' : ''}
      ${want && sockIlvl != null && firstOk ? `<p class="callout">Larzuk's puzzlebox, the cube socket recipes and corruption all use the same item-level caps, so the base itself must be ilvl ${sockIlvl}+ to reach ${want} socket${want > 1 ? 's' : ''}.</p>` : ''}
      <h2>Every area where it drops</h2>`;

    for (let d = 0; d < 3; d++) {
      const dr = rows.filter(r => r.a.d === d && r.drops);
      html += `<details class="mech"${dr.length && (d === (firstDrop && firstDrop.a.d)) ? ' open' : ''}>
        <summary>${DIFF[d]} <small>${dr.length ? `${dr.length} areas` : 'doesn\'t drop here'}</small></summary>`;
      if (dr.length) {
        html += `<div class="tablewrap"><table><thead><tr><th>Area</th><th>Act</th><th>mlvl</th><th>Max sockets</th></tr></thead><tbody>`;
        for (const r of dr) {
          const cls = r === firstOk && want ? 'now' : r === firstDrop ? 'first' : want && !r.ok ? 'cap' : '';
          html += `<tr class="${cls}"><td>${esc(r.a.n)}</td><td>${r.a.a}</td><td>${mlvlText(r.a, st)}</td><td>${sockPips(r.s)}</td></tr>`;
        }
        html += '</tbody></table></div>';
      }
      html += '</details>';
    }
    out.innerHTML = html;
  }

  function answerBox(title, row, st, sub) {
    if (!row) return `<div class="res"><span class="lab">${esc(title)}</span><span class="bf-area">Nowhere</span><span class="small">${esc(sub)}</span></div>`;
    return `<div class="res">
      <span class="lab">${esc(title)}</span>
      <span class="bf-area">${esc(row.a.n)}</span>
      <span class="bf-where">${DIFF[row.a.d]} · Act ${row.a.a} · mlvl ${mlvlText(row.a, st)}</span>
      <span class="bf-sock">${sockPips(row.s)}</span>
      <span class="small">${esc(sub)}</span>
    </div>`;
  }

  // ---------- tab 2: what drops here ----------
  function fillAreaSel() {
    const d = +$('areaDiff').value;
    const prev = $('areaSel').value;
    $('areaSel').innerHTML = AREAS.map((a, i) => ({ a, i })).filter(x => x.a.d === d)
      .map(x => `<option value="${x.i}">Act ${x.a.a} · ${esc(x.a.n)} (mlvl ${x.a.lo !== x.a.l ? x.a.lo + '–' : ''}${x.a.l})</option>`).join('');
    if ([...$('areaSel').options].some(o => o.value === prev)) $('areaSel').value = prev;
  }
  function fillAreaCat() {
    const used = [...new Set(ALL_ITEMS.map(i => i.t))].sort((a, b) => TYPES[a].n.localeCompare(TYPES[b].n));
    $('areaCat').innerHTML = '<option value="">All</option><option value="@sock">Socketable only</option>' +
      used.map(t => `<option value="${t}">${esc(TYPES[t].n)}${TYPES[t].c && CLASS[TYPES[t].c] ? ` (${CLASS[TYPES[t].c]})` : ''}</option>`).join('');
  }

  function renderArea() {
    const st = settings();
    const area = AREAS[+$('areaSel').value];
    const out = $('areaResult');
    if (!area) { out.innerHTML = ''; return; }
    const m = mlvlFor(area, st);
    const cat = $('areaCat').value, tier = +$('areaTier').value, minS = +$('areaMinSock').value, onlyUsable = $('areaUsable').checked;
    const list = visibleItems(st).filter(i =>
      canDrop(i, m) &&
      (!cat || (cat === '@sock' ? i.gs > 0 : i.t === cat)) &&
      (!tier || i.tier === tier) &&
      sockAt(i, m) >= minS &&
      (!onlyUsable || i.rl <= st.clvl));
    list.sort((a, b) => b.q - a.q || a.n.localeCompare(b.n));

    let html = `<div class="results">
      <div class="res"><span class="lab">Monster level</span><span class="big">${m}</span><span class="small">${area.lo !== area.l ? `range ${mlvlText(area, st)} · ` : ''}${DIFF[area.d]} · Act ${area.a}</span></div>
      <div class="res"><span class="lab">Item level</span><span class="big">${m}</span><span class="small">socket bracket ${['1–25', '26–40', '41+'][bracket(m)]}</span></div>
      <div class="res"><span class="lab">Highest qlvl</span><span class="big">${TC_REACH[Math.min(m, MAX_MLVL)]}</span><span class="small">treasure class group</span></div>
      <div class="res"><span class="lab">Bases</span><span class="big">${list.length}</span><span class="small">matching the filters</span></div>
    </div>`;
    if (!list.length) { out.innerHTML = html + '<p class="hint">Nothing matches these filters here.</p>'; return; }
    html += `<h2>Bases that drop here</h2><div class="tablewrap"><table class="bases"><thead><tr>
      <th>Base</th><th>Type</th><th>qlvl</th><th>Req lvl</th><th>Sockets here</th><th>Best possible</th></tr></thead><tbody>`;
    for (const i of list) {
      const s = sockAt(i, m);
      const best = Math.max(...[1, 26, 41].map(l => sockAt(i, l)));
      html += `<tr class="${i.rl > st.clvl ? 'cap' : ''}">
        <td><button type="button" class="linkbtn" data-base="${esc(i.n)}">${esc(i.n)}</button></td>
        <td class="bf-type">${esc(TYPES[i.t].n)} · ${TIER[i.tier]}</td>
        <td>${i.q}</td><td>${i.rl || '—'}</td>
        <td>${sockPips(s)}</td>
        <td class="bf-type">${best > s ? `${best} at ilvl ${minIlvlForSock(i, best)}+` : best ? 'already max' : '—'}</td></tr>`;
    }
    html += '</tbody></table></div>';
    out.innerHTML = html;
  }

  // ---------- wiring ----------
  function setTab(tab) {
    for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    for (const b of document.querySelectorAll('.tabs button')) b.tabIndex = b.dataset.tab === tab ? 0 : -1;
    $('view-base').hidden = $('view-base-form').hidden = tab !== 'base';
    $('view-area').hidden = $('view-area-form').hidden = tab !== 'area';
    $('calc').hidden = tab === 'how';
    $('view-how').hidden = tab !== 'how';
    render();
    saveHash();
  }
  const activeTab = () => (!$('view-how').hidden ? 'how' : $('view-area').hidden ? 'base' : 'area');

  function render() { const t = activeTab(); if (t === 'base') renderBase(); else if (t === 'area') renderArea(); }

  function saveHash() {
    const p = new URLSearchParams();
    p.set('tab', activeTab());
    if ($('baseSearch').value) p.set('base', $('baseSearch').value);
    if ($('sockWant').value !== '0') p.set('s', $('sockWant').value);
    p.set('clvl', $('clvl').value);
    if ($('mtype').value !== '0') p.set('m', $('mtype').value);
    if (activeTab() === 'area') { p.set('d', $('areaDiff').value); p.set('a', $('areaSel').value); }
    history.replaceState(null, '', '#' + p.toString());
  }
  function loadHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.get('clvl')) $('clvl').value = p.get('clvl');
    if (p.get('m')) $('mtype').value = p.get('m');
    if (p.get('base')) $('baseSearch').value = p.get('base');
    fillSockWant(currentItem());
    if (p.get('s')) $('sockWant').value = p.get('s');
    if (p.get('d')) $('areaDiff').value = p.get('d');
    fillAreaSel();
    if (p.get('a')) $('areaSel').value = p.get('a');
    return p.get('tab') || 'base';
  }

  fillBaseList();
  fillAreaCat();
  const startTab = loadHash();
  if (!$('baseSearch').value) { $('baseSearch').value = 'Monarch'; fillSockWant(currentItem()); $('sockWant').value = String($('sockWant').options.length - 1); }

  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  let lastItem = currentItem();
  $('baseSearch').addEventListener('input', () => {
    const item = currentItem();
    fillSockWant(item);
    if (item && item !== lastItem) $('sockWant').value = String(Math.max(...[1, 26, 41].map(l => sockAt(item, l))));
    lastItem = item;
    render(); saveHash();
  });
  $('baseSearch').addEventListener('focus', e => e.target.select());
  ['clvl', 'mtype', 'sockWant', 'areaCat', 'areaTier', 'areaMinSock', 'areaUsable', 'areaSel']
    .forEach(id => $(id).addEventListener('input', () => { render(); saveHash(); }));
  $('areaDiff').addEventListener('input', () => { fillAreaSel(); render(); saveHash(); });
  $('areaResult').addEventListener('click', e => {
    const a = e.target.closest('[data-base]');
    if (!a) return;
    e.preventDefault();
    $('baseSearch').value = a.dataset.base;
    fillSockWant(currentItem());
    $('sockWant').value = String($('sockWant').options.length - 1);
    setTab('base');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  setTab(startTab);
})();
