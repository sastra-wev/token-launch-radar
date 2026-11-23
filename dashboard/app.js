// Token Launch Radar — the page. Renders window.RADAR, the dataset main.ts writes beside this page
// from the same board it writes to board.json, so the page and the board can never disagree.
// No framework, no fetch, no network: filter, sort, open a protocol, read how its price was built
// from the market's own multiples, or re-rank the whole board under your own momentum weight in
// the sandbox — everything happens here, from the sealed snapshot.
'use strict';

const R = window.RADAR;
const M = R.model;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtUsd(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}
function fmtPct(n) {
  if (n === null || n === undefined) return '—';
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
}
function fmtMult(n) { return '×' + Number(n).toFixed(2); }
function fmtAge(days) {
  if (days === null || days === undefined) return 'unknown';
  if (days < 60) return days + ' days';
  if (days < 730) return Math.round(days / 30.4) + ' months';
  return (days / 365.25).toFixed(1) + ' years';
}

/* Peer counts: how many of the market's traded protocols stand behind a row's price. The board
   states the count itself, not a verdict on it. */
function peerText(n) {
  if (n === 0) return 'market median — no traded peers in category';
  return n + ' traded peer' + (n === 1 ? '' : 's') + ' in category';
}
const peerColor = (n) => (n >= 8 ? '#3fb68b' : n >= 3 ? '#58a6ff' : n >= 1 ? '#f0b429' : '#8b98a5');

/* The sandbox model: a row's implied value under a momentum weight and a value scale, from the
   components the stated model stored on the row. At the stated weights it returns the board's own
   figures exactly, so the default view is board.json itself. */
const state = { q: '', cat: '', chain: '', band: '', wl: false, sort: 'implied', gw: M.growth_weight, scale: 1 };
function sandboxImplied(row, w, scale) {
  const m = row.model;
  return Math.max(1, Math.round(row.tvl_usd * m.base_multiple * scale * (1 + (m.growth_pct / 100) * w) * m.maturity_multiplier * m.breadth_multiplier));
}
function shown(row) {
  if (state.gw === M.growth_weight && state.scale === 1) {
    return { v: row.implied_value_usd, lo: row.implied_low_usd, hi: row.implied_high_usd };
  }
  const m = row.model;
  const f = state.scale * (1 + (m.growth_pct / 100) * state.gw) / (1 + (m.growth_pct / 100) * M.growth_weight);
  return {
    v: sandboxImplied(row, state.gw, state.scale),
    lo: Math.max(1, Math.round(row.implied_low_usd * f)),
    hi: Math.max(1, Math.round(row.implied_high_usd * f)),
  };
}

/* ---------- header, KPIs, spotlight ---------- */
$('asof').textContent = 'Snapshot ' + R.as_of + ' · sealed';
$('modelver').textContent = 'Model ' + R.model_version;
$('kpis').innerHTML = [
  [R.stats.protocols, 'protocols in the snapshot'],
  [R.stats.pre_token, 'record no token'],
  [R.stats.board_size, 'ranked on the board'],
  [R.stats.watchlist_size + ' / ' + R.stats.watchlist_size, 'watchlist covered in full'],
  [R.stats.peers, 'traded peers set the prices'],
  [fmtUsd(R.stats.board_implied_total), 'total implied launch value'],
].map(([b, s]) => `<div class="kpi"><b>${b}</b><span>${s}</span></div>`).join('');

$('spot').innerHTML = R.rows.slice(0, 5).map((r) => {
  return `<div class="spotcard" data-slug="${esc(r.slug)}">
    <span class="rk">#${r.rank} ON THE BOARD</span>
    <h3>${esc(r.name)}</h3>
    <span class="cat">${esc(r.category ?? 'Uncategorised')} · TVL ${fmtUsd(r.tvl_usd)}</span>
    <div class="imp">${fmtUsd(r.implied_value_usd)}</div>
    <span class="rng">range ${fmtUsd(r.implied_low_usd)} – ${fmtUsd(r.implied_high_usd)} · ${fmtMult(r.implied_value_usd / r.tvl_usd)} of TVL</span>
    <div class="meta">
      <span class="badge">${fmtPct(r.change_7d)} in 7d</span>
      <span class="badge">tokenless ${fmtAge(r.age_days)}</span>
      <span class="badge"><span class="dot" style="background:${peerColor(r.model.category_peers)}"></span>${peerText(r.model.category_peers)}</span>
      ${r.on_watchlist ? '<span class="badge gold">★ watchlist</span>' : ''}
    </div></div>`;
}).join('');
for (const c of $('spot').children) c.addEventListener('click', () => { location.hash = '#/p/' + c.dataset.slug; });

$('peerlegend').innerHTML =
  '<span><b>Peers</b> — the traded protocols in a row\u2019s own category whose market-cap / TVL ratios set its price, ' +
  'each shrunk toward the whole market\u2019s median with ' + M.shrink_peers + ' phantom peers. A row priced from few peers is not ' +
  'hidden or relabelled: its count stands on the row, and its stated range widens with the peers\u2019 spread.</span>';

/* ---------- board ---------- */
const cats = [...new Set(R.rows.map((r) => r.category).filter(Boolean))].sort();
$('fcat').innerHTML += cats.map((c) => `<option>${esc(c)}</option>`).join('');
const chains = [...new Set(R.rows.flatMap((r) => r.chains))].sort();
$('fchain').innerHTML += chains.map((c) => `<option>${esc(c)}</option>`).join('');

const BANDS = { b1: (v) => v >= 1e9, m100: (v) => v >= 1e8 && v < 1e9, m10: (v) => v >= 1e7 && v < 1e8, sub10: (v) => v < 1e7 };
function visibleRows() {
  const q = state.q.toLowerCase();
  const band = BANDS[state.band];
  const rows = R.rows.filter((r) =>
    (!q || r.name.toLowerCase().includes(q) || r.slug.includes(q) || (r.category || '').toLowerCase().includes(q)) &&
    (!state.cat || r.category === state.cat) &&
    (!state.chain || r.chains.includes(state.chain)) &&
    (!band || band(shown(r).v)) &&
    (!state.wl || r.on_watchlist));
  const by = {
    implied: (a, b) => shown(b).v - shown(a).v,
    tvl: (a, b) => b.tvl_usd - a.tvl_usd,
    growth: (a, b) => (b.change_7d ?? -1e9) - (a.change_7d ?? -1e9),
    age: (a, b) => (b.age_days ?? M.unknown_age_days) - (a.age_days ?? M.unknown_age_days),
    multiple: (a, b) => shown(b).v / b.tvl_usd - shown(a).v / a.tvl_usd,
    name: (a, b) => a.name.localeCompare(b.name),
  }[state.sort];
  return rows.sort(by);
}

function renderBoard() {
  const rows = visibleRows();
  $('shown').textContent =
    `Showing ${rows.length} of ${R.stats.board_size} ranked protocols` +
    (state.gw !== M.growth_weight || state.scale !== 1 ? ' — re-ranked under your sandbox weights; ranks and values are yours, not the board\u2019s.' : '.');
  $('rows').innerHTML = rows.map((r, i) => {
    const s = shown(r);
    return `<tr data-slug="${esc(r.slug)}">
      <td class="num rank">${i + 1}</td>
      <td class="name"><b>${esc(r.name)}</b>${r.on_watchlist ? '<span class="wl">★ watchlist</span>' : ''}<span class="slug">${esc(r.slug)}</span></td>
      <td>${esc(r.category ?? '—')}</td>
      <td>${r.chains.slice(0, 3).map((c) => `<span class="chain">${esc(c)}</span>`).join('')}${r.chains.length > 3 ? `<span class="chain">+${r.chains.length - 3}</span>` : ''}</td>
      <td class="num">${fmtUsd(r.tvl_usd)}</td>
      <td class="num ${r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg'}">${fmtPct(r.change_7d)}</td>
      <td class="num implied"><b>${fmtUsd(s.v)}</b><span class="sub">${fmtUsd(s.lo)} – ${fmtUsd(s.hi)}</span></td>
      <td class="num">${fmtMult(s.v / r.tvl_usd)}</td>
      <td class="ev"><span class="dot" style="background:${peerColor(r.model.category_peers)}"></span>${r.model.category_peers === 0 ? 'market median' : `<b>${r.model.category_peers}</b> traded peer${r.model.category_peers === 1 ? '' : 's'}`}</td>
      <td class="arrow">›</td></tr>`;
  }).join('');
  for (const tr of $('rows').children) tr.addEventListener('click', () => { location.hash = '#/p/' + tr.dataset.slug; });
}

$('q').addEventListener('input', (e) => { state.q = e.target.value; renderBoard(); });
$('fcat').addEventListener('change', (e) => { state.cat = e.target.value; renderBoard(); });
$('fchain').addEventListener('change', (e) => { state.chain = e.target.value; renderBoard(); });
$('fband').addEventListener('change', (e) => { state.band = e.target.value; renderBoard(); });
$('fwl').addEventListener('change', (e) => { state.wl = e.target.checked; renderBoard(); });
$('fsort').addEventListener('change', (e) => { state.sort = e.target.value; renderBoard(); });
for (const th of document.querySelectorAll('#board th[data-sort]')) {
  th.addEventListener('click', () => { state.sort = th.dataset.sort; $('fsort').value = state.sort; renderBoard(); });
}
$('sgw').addEventListener('input', (e) => { state.gw = Number(e.target.value); $('sgwv').textContent = state.gw.toFixed(2); renderBoard(); });
$('sscale').addEventListener('input', (e) => { state.scale = Number(e.target.value); $('sscalev').textContent = state.scale.toFixed(2) + '×'; renderBoard(); });
$('sreset').addEventListener('click', () => {
  state.gw = M.growth_weight; state.scale = 1;
  $('sgw').value = state.gw; $('sgwv').textContent = state.gw.toFixed(2);
  $('sscale').value = 1; $('sscalev').textContent = '1.00×';
  renderBoard();
});

/* ---------- detail ---------- */
function bar(label, frac, shownText) {
  return `<div class="bar-row"><span class="blabel">${label}</span><span class="bar"><i style="width:${Math.max(2, Math.min(100, frac * 100))}%"></i></span><span class="bval">${shownText}</span></div>`;
}
function rangeBar(label, lo, hi, mid) {
  const a = Math.log(M.multiple_min), b = Math.log(M.multiple_max);
  const pos = (x) => Math.max(0, Math.min(100, (Math.log(Math.max(M.multiple_min, x)) - a) / (b - a) * 100));
  return `<div class="bar-row"><span class="blabel">${label}</span><span class="bar"><i class="range" style="margin-left:${pos(lo)}%;width:${Math.max(2, pos(hi) - pos(lo))}%"></i></span><span class="bval">${fmtMult(mid)}</span></div>`;
}
function rankAt(row, w) {
  const mine = sandboxImplied(row, w, 1);
  let above = 0;
  for (const r of R.rows) if (sandboxImplied(r, w, 1) > mine) above++;
  return above + 1;
}
function renderDetail(slug) {
  const r = R.rows.find((x) => x.slug === slug);
  const el = $('view-detail');
  if (!r) { el.innerHTML = '<p class="note">No ranked protocol by that name in this snapshot.</p>'; return; }
  const cal = R.categories.find((c) => c.category === (r.category ?? 'Uncategorised'));
  const m = r.model;
  el.innerHTML = `
    <button class="mini back" onclick="location.hash='#/'">← Back to the board</button>
    <div class="dhead"><h2>${esc(r.name)}</h2>
      ${r.on_watchlist ? '<span class="badge gold">★ On the house watchlist</span>' : '<span class="badge">Found by the radar, below the watchlist floor</span>'}
      <span class="badge">${esc(r.category ?? 'Uncategorised')}</span>
      <span class="badge">Records no token</span>
      <span class="badge"><span class="dot" style="background:${peerColor(m.category_peers)}"></span>${peerText(m.category_peers)}</span></div>
    <div class="stats">
      <div class="stat"><b>${fmtUsd(r.implied_value_usd)}</b><span>Implied launch value (stated model)</span></div>
      <div class="stat"><b>${fmtUsd(r.implied_low_usd)} – ${fmtUsd(r.implied_high_usd)}</b><span>Stated range, from the peers\u2019 spread</span></div>
      <div class="stat"><b>${fmtUsd(r.tvl_usd)}</b><span>Total value locked</span></div>
      <div class="stat"><b class="${r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg'}">${fmtPct(r.change_7d)}</b><span>TVL change, 7 days</span></div>
      <div class="stat"><b>${fmtAge(r.age_days)}</b><span>Running with no token (tracked since ${esc(r.listed_at ?? 'an unrecorded date')})</span></div>
    </div>
    <div class="cols"><div>
      <div class="card"><h3>Why this value — the model, step by step</h3>
        <p class="formula">implied = TVL ${fmtUsd(r.tvl_usd)} × price ${fmtMult(m.base_multiple)} × momentum ${fmtMult(m.growth_multiplier)} × endurance ${fmtMult(m.maturity_multiplier)} × reach ${fmtMult(m.breadth_multiplier)} = ${fmtUsd(r.implied_value_usd)}</p>
        ${rangeBar('Price (range, log scale)', m.multiple_low, m.multiple_high, m.base_multiple)}
        ${bar('Momentum adjustment', (m.growth_multiplier - 0.7) / 0.6, fmtMult(m.growth_multiplier))}
        ${bar('Endurance adjustment', (m.maturity_multiplier - M.maturity_floor) / M.maturity_range, fmtMult(m.maturity_multiplier))}
        ${bar('Reach adjustment', (m.breadth_multiplier - 1) / (M.breadth_per_chain * M.breadth_max_extra_chains), fmtMult(m.breadth_multiplier))}
        <h3 style="margin-top:18px">Where the price comes from — the category\u2019s own record, shrunk toward the market</h3>
        <table class="mini"><thead><tr><th>Level</th><th class="num">Peers</th><th class="num">Cap / TVL</th></tr></thead><tbody>
          <tr><td>Its category — ${esc(r.category ?? 'Uncategorised')}</td><td class="num">${cal ? cal.peers : 0}</td><td class="num">${cal && cal.median_ratio !== null ? fmtMult(cal.median_ratio) + ' median' : '—'}</td></tr>
          <tr><td>The whole market</td><td class="num">${R.stats.peers}</td><td class="num">${fmtMult(R.stats.global_multiple)} median</td></tr>
          <tr><td><b>Multiple used</b> (range ${cal ? fmtMult(cal.multiple_low) + ' – ' + fmtMult(cal.multiple_high) : ''})</td><td class="num"></td><td class="num"><b>${fmtMult(m.base_multiple)}</b></td></tr>
        </tbody></table>
        <p>The category\u2019s own median is shrunk toward the market\u2019s median by its peer count (${M.shrink_peers} phantom
        peers): ${cal && cal.peers > 0 ? `here ${cal.peers} traded peer${cal.peers === 1 ? '' : 's'} carry the category\u2019s median of
        ${cal.median_ratio !== null ? fmtMult(cal.median_ratio) : '—'} most of the way, and the market pulls it the rest. ` : `here the category has no
        traded peer of its own, so the market\u2019s median is the price. `}Momentum takes the week\u2019s TVL change
        (${fmtPct(r.change_7d)}) at half weight, clamped to ${M.growth_floor}%…+${M.growth_cap}%. Endurance rises from
        ${M.maturity_floor} to ${M.maturity_floor + M.maturity_range} across ${M.maturity_days} tokenless days; reach adds
        ${Math.round(M.breadth_per_chain * 100)}% for each extra chain, up to ${M.breadth_max_extra_chains}.</p>
        <div class="sens">
          <span class="badge">Board rank <b>#${r.rank}</b> of ${R.stats.board_size}</span>
          <span class="badge">If momentum counted for nothing: <b>#${rankAt(r, 0)}</b></span>
          <span class="badge">If momentum counted double: <b>#${rankAt(r, 1)}</b></span>
        </div></div>
      <div class="card"><h3>The traded peers behind the price</h3>
        ${cal && cal.comps.length ? `<table class="mini"><thead><tr><th>Peer</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Cap / TVL</th></tr></thead>
        <tbody>${cal.comps.map((c) => `<tr><td>${esc(c.name)}</td><td class="num">${fmtUsd(c.tvl_usd)}</td><td class="num">${fmtUsd(c.mcap_usd)}</td><td class="num">${fmtMult(c.ratio)}</td></tr>`).join('')}</tbody></table>
        <p class="note">The largest traded peers in this category by TVL; the price stands on all ${cal.peers} of them, not on these alone.</p>`
        : '<p>No traded peer in this category carries a market cap in the snapshot, so the whole market\u2019s median sets the price.</p>'}
      </div>
    </div><div>
      <div class="card"><h3>How to farm ${esc(r.name)}</h3>
        <ol class="farm">${r.farm.map((s) => `<li>${esc(s.text)}<span class="meta"><b>Cost:</b> ${esc(s.cost)} · <b>Time:</b> ${esc(s.time)}</span></li>`).join('')}</ol>
        <p class="note">Derived from ${esc(r.name)}\u2019s own record — its kind of protocol, its chains (${r.chains.map(esc).join(', ') || 'unrecorded'}),
        its size and its age. Amounts are sized to be a real user of a protocol this big, not a whale and not dust.</p></div>
      <div class="card"><h3>The record</h3>
        <p>Chains: ${r.chains.map((c) => `<span class="chain">${esc(c)}</span>`).join('') || '—'}<br>
        Board rank #${r.rank} of ${R.stats.board_size} · Implied ${fmtMult(r.implied_value_usd / r.tvl_usd)} of TVL ·
        Snapshot slug <code>${esc(r.slug)}</code>, as of ${R.as_of}. DefiLlama records no token, no CoinGecko id and
        no symbol for this protocol; that is the whole of the evidence that it is still to come.</p></div>
    </div></div>`;
}

/* ---------- calibration ---------- */
function scatter() {
  const pts = R.peers_plot;
  const W = 1180, H = 400, padL = 64, padR = 16, padT = 14, padB = 40;
  const xs = pts.map((p) => Math.log10(p.tvl_usd)), ys = pts.map((p) => Math.log10(p.mcap_usd));
  const x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs));
  const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  const X = (v) => padL + (v - x0) / (x1 - x0) * (W - padL - padR);
  const Y = (v) => H - padB - (v - y0) / (y1 - y0) * (H - padT - padB);
  let g = '';
  for (let e = x0; e <= x1; e++) g += `<line class="axis" x1="${X(e)}" y1="${padT}" x2="${X(e)}" y2="${H - padB}"/><text x="${X(e) - 8}" y="${H - padB + 18}">$1e${e}</text>`;
  for (let e = y0; e <= y1; e += 2) g += `<line class="axis" x1="${padL}" y1="${Y(e)}" x2="${W - padR}" y2="${Y(e)}"/><text x="6" y="${Y(e) + 4}">$1e${e}</text>`;
  for (const ratio of [0.1, 1, 10]) {
    const off = Math.log10(ratio);
    const ax = x0, ay = Math.max(y0, Math.min(y1, x0 + off)), bx = x1, by = Math.max(y0, Math.min(y1, x1 + off));
    const axx = ay === x0 + off ? ax : ay - off, bxx = by === x1 + off ? bx : by - off;
    const lx = axx + (bxx - axx) * 0.55, ly = ay + (by - ay) * 0.55;
    g += `<line class="guide" x1="${X(axx)}" y1="${Y(ay)}" x2="${X(bxx)}" y2="${Y(by)}"/><text x="${X(lx) + 6}" y="${Y(ly) - 5}">cap = ${ratio}× TVL</text>`;
  }
  const dots = pts.map((p) => `<circle cx="${X(Math.log10(p.tvl_usd)).toFixed(1)}" cy="${Y(Math.log10(p.mcap_usd)).toFixed(1)}" r="3.4" fill="${p.ratio >= 1 ? '#3fb68b' : '#58a6ff'}" opacity="0.82"><title>${esc(p.name)} — TVL ${fmtUsd(p.tvl_usd)}, cap ${fmtUsd(p.mcap_usd)}, ${fmtMult(p.ratio)}</title></circle>`).join('');
  return `<svg class="scatter" viewBox="0 0 ${W} ${H}">${g}${dots}</svg>
    <div class="famlegend"><span><span class="dot" style="background:#3fb68b"></span>cap above TVL</span><span><span class="dot" style="background:#58a6ff"></span>cap below TVL</span><span>Each point is one traded protocol: its TVL against its market cap. The multiples are read off this cloud.</span></div>`;
}
function renderCal() {
  $('view-cal').innerHTML = `
    <div class="card" style="margin-top:16px"><h3>The market the prices come from</h3>
    <p>Every multiple on the board is read off this snapshot, not asserted. A protocol whose token already trades
    carries the market\u2019s own verdict: its market cap against its TVL. Each category is priced from its own traded
    peers\u2019 median ratio, shrunk toward the whole market\u2019s median by its peer count (${M.shrink_peers} phantom peers),
    so a category priced by fifteen peers speaks for itself and one priced by a single peer borrows the market\u2019s
    evidence. The same shrink on the peers\u2019 quartiles gives each multiple its stated range. Ratios are winsorised to
    ${fmtMult(M.ratio_min)}…${fmtMult(M.ratio_max)} and multiples clamped to ${fmtMult(M.multiple_min)}…${fmtMult(M.multiple_max)}.
    Exchanges are left out: an exchange token prices a business, not a protocol. A peer counts only with a positive
    market cap: a record of zero is a dead token, not a price.</p>
    ${scatter()}</div>
    <div class="card"><h3>Categories — the price of each kind</h3>
    <table class="mini"><thead><tr><th>Category</th><th class="num">Peers</th><th class="num">Peers\u2019 median</th><th class="num">Multiple used</th><th class="num">Range</th><th class="num">Pre-token</th></tr></thead>
    <tbody>${R.categories.map((c) => `<tr><td>${esc(c.category)}</td><td class="num">${c.peers}</td><td class="num">${c.median_ratio === null ? '—' : fmtMult(c.median_ratio)}</td><td class="num"><b>${fmtMult(c.multiple)}</b></td><td class="num">${fmtMult(c.multiple_low)} – ${fmtMult(c.multiple_high)}</td><td class="num">${c.pre_token}</td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3>The traded set — the market\u2019s own values, kept apart from the ranking</h3>
    <p>These protocols already have their token. The board never ranks them; they are the evidence, not the quarry.</p>
    <table class="mini"><thead><tr><th>Protocol</th><th>Category</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Cap / TVL</th><th class="num">7d</th></tr></thead>
    <tbody>${R.live.map((p) => `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.category ?? '—')}</td><td class="num">${fmtUsd(p.tvl_usd)}</td><td class="num">${fmtUsd(p.mcap_usd)}</td><td class="num">${p.ratio === null ? '—' : fmtMult(p.ratio)}</td><td class="num ${p.change_7d === null ? '' : p.change_7d >= 0 ? 'pos' : 'neg'}">${fmtPct(p.change_7d)}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- method ---------- */
function renderMethod() {
  $('view-method').innerHTML = `<div class="method">
    <h3>What this radar is</h3>
    <p>A launch is the token a protocol may issue one day. This board reads one sealed snapshot of the whole protocol
    universe — ${R.stats.protocols} protocols at or above $5M of TVL, fetched once from DefiLlama\u2019s public record on
    ${R.as_of} — finds the ${R.stats.pre_token} that record no token, ranks ${R.stats.board_size} of them by an implied
    launch value with a stated range, and writes a farm plan for each. Nothing here is fetched live and no name is
    hand-picked: run the program on a fresher snapshot and the board re-derives itself, which is what makes it a
    radar rather than a list.</p>
    <h3>The value model (${R.model_version})</h3>
    <p class="formula">implied = TVL × price × momentum × endurance × reach</p>
    <p><b>Price.</b> What the market itself pays per locked dollar for a launched protocol of this kind: the median
    market-cap / TVL of the snapshot\u2019s traded protocols in the same category, shrunk toward the whole market\u2019s
    median by the peer count — the category\u2019s own median weighted by its peers, the market\u2019s by ${M.shrink_peers}
    phantom peers — so a category priced by fifteen peers speaks for itself, one priced by a single peer borrows the
    market\u2019s evidence, and one with no peers is priced by the market alone. The same shrink on the peers\u2019 quartiles
    gives each multiple a low and a high — the range stated beside every value. Multiples are clamped to
    ${fmtMult(M.multiple_min)}…${fmtMult(M.multiple_max)}, ratios winsorised to ${fmtMult(M.ratio_min)}…${fmtMult(M.ratio_max)}.
    A peer counts only when its recorded market cap is positive: a record of zero (or the −1 one protocol carries) is
    a dead or unpriced token — a placeholder, not a price. Beside every row the board states the peer count the price
    stands on, so thin evidence is visible on the row itself rather than smoothed away.</p>
    <p><b>Momentum.</b> The week\u2019s TVL change, clamped to ${M.growth_floor}%…+${M.growth_cap}%, entering linearly at
    half weight: 1 + ${M.growth_weight} × g / 100.</p>
    <p><b>Endurance.</b> ${M.maturity_floor} rising to ${M.maturity_floor + M.maturity_range} across ${M.maturity_days} days of tokenless operation
    (${M.unknown_age_days} days assumed when the record gives no start date): a protocol that has run for years with no
    token has both the users and the reason to launch.</p>
    <p><b>Reach.</b> 1 + ${M.breadth_per_chain} × min(chains − 1, ${M.breadth_max_extra_chains}): each further chain a protocol is live on
    reaches more farmers.</p>
    <h3>Who is ranked, who is set aside</h3>
    <p>Every protocol on the snapshot\u2019s watchlist is ranked — the watchlist is the floor. Below it, the radar adds every
    other protocol that records no token, except the ones that are not a launch of their own waiting to happen:
    centralised exchanges, versioned pools of another protocol, bridged products (the Bridge and Canonical Bridge
    categories — WBTC is Bitcoin on Ethereum, not a launch to come) and wrapped or staked products of a token that
    already trades (the house\u2019s own exclusions, applied to every row the radar adds). Traded protocols are never
    ranked; they form the calibration set on the Calibration tab.</p>
    <h3>The farm plans</h3>
    <p>Each plan is generated from the protocol\u2019s own record: a wallet setup priced by its main chain\u2019s gas (Ethereum
    mainnet at mainnet prices, other chains at the few-dollars level their fees run at), the core action of its kind
    of protocol (supply, provide, stake, bridge, trade, insure…), that kind\u2019s guardrail (a lending health factor, a
    curator\u2019s vault caps, a bridge\u2019s test transfer, a basis trade\u2019s funding flip), a second position on its second
    chain when it has one and a third for the widely deployed, the recurring habit of its kind, a holding window from
    its age, and a log that starts with the exit. Amounts are sized to the protocol\u2019s TVL; every step states what it
    costs and how long it takes.</p>
    <h3>Honesty</h3>
    <p>The board says a protocol <em>records</em> no token, never that it has none: a record can be incomplete, and a
    launch\u2019s value here is the entry\u2019s own claim from the snapshot\u2019s figures — not a promise that a token comes, or
    what it would trade at. Where the evidence behind a price is thin, the board says so on the row itself. The
    screenshots of this page and the code that writes it are the same entry: the numbers above are the numbers
    board.json carries.</p></div>`;
}

/* A filtered view can be linked and screenshotted: ?q=, ?cat=, ?chain=, ?band=, ?wl=1, ?sort= preset
   the controls before the first render. */
(function preset() {
  const p = new URLSearchParams(location.search);
  if (['q', 'cat', 'chain', 'band', 'wl', 'sort'].some((k) => p.has(k))) document.body.classList.add('linked');
  if (p.get('q')) { state.q = p.get('q'); $('q').value = state.q; }
  if (p.get('cat') && cats.includes(p.get('cat'))) { state.cat = p.get('cat'); $('fcat').value = state.cat; }
  if (p.get('chain') && chains.includes(p.get('chain'))) { state.chain = p.get('chain'); $('fchain').value = state.chain; }
  if (p.get('band') && BANDS[p.get('band')]) { state.band = p.get('band'); $('fband').value = state.band; }
  if (p.get('wl') === '1') { state.wl = true; $('fwl').checked = true; }
  if (['implied', 'tvl', 'growth', 'age', 'multiple', 'name'].includes(p.get('sort'))) { state.sort = p.get('sort'); $('fsort').value = state.sort; }
  renderBoard();
})();

/* ---------- routing ---------- */
function route() {
  const hash = location.hash || '#/';
  const detail = hash.match(/^#\/p\/(.+)$/);
  for (const id of ['view-board', 'view-detail', 'view-cal', 'view-method']) $(id).hidden = true;
  let tab = 'board';
  let viewClass = 'view-board';
  if (detail) { renderDetail(decodeURIComponent(detail[1])); $('view-detail').hidden = false; tab = ''; viewClass = 'view-detail'; }
  else if (hash === '#/cal') { renderCal(); $('view-cal').hidden = false; tab = 'cal'; viewClass = 'view-cal'; }
  else if (hash === '#/method') { renderMethod(); $('view-method').hidden = false; tab = 'method'; viewClass = 'view-method'; }
  else { $('view-board').hidden = false; }
  document.body.classList.remove('view-board', 'view-detail', 'view-cal', 'view-method');
  document.body.classList.add(viewClass);
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('active', b.dataset.view === tab);
  window.scrollTo(0, 0);
}
for (const b of document.querySelectorAll('.tab')) {
  b.addEventListener('click', () => { location.hash = b.dataset.view === 'board' ? '#/' : '#/' + b.dataset.view; });
}
window.addEventListener('hashchange', route);
renderBoard();
route();
