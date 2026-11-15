// Token Launch Radar — the page. Renders window.RADAR, the dataset main.ts writes beside this page
// from the same board it writes to board.json, so the page and the board can never disagree.
// No framework, no fetch, no network: filter, sort, open a protocol, or re-rank the whole board
// under your own model weights in the sandbox — everything happens here, from the sealed snapshot.
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

/* The sandbox model: a row's implied value under a growth weight and a value scale, from the
   components the stated model stored on the row. At the stated weights it returns the board's own
   figure, so the default view is board.json itself. */
const state = { q: '', cat: '', chain: '', wl: false, sort: 'implied', gw: M.growth_weight, scale: 1 };
function implied(row) {
  const m = row.model;
  const growth = 1 + (m.growth_pct / 100) * state.gw;
  return Math.max(1, Math.round(row.tvl_usd * m.base_multiple * state.scale * growth * m.maturity_multiplier * m.breadth_multiplier));
}

/* ---------- header and KPIs ---------- */
$('asof').textContent = 'Snapshot ' + R.as_of + ' · sealed';
$('modelver').textContent = 'Model ' + R.model_version;
$('kpis').innerHTML = [
  [R.stats.protocols, 'protocols in the snapshot'],
  [R.stats.board_size, 'pre-token protocols ranked'],
  [R.stats.watchlist_size + ' / ' + R.stats.watchlist_size, 'watchlist covered in full'],
  [R.stats.peers, 'traded peers set the prices'],
  [fmtUsd(R.stats.board_implied_total), 'total implied launch value'],
].map(([b, s]) => `<div class="kpi"><b>${b}</b><span>${s}</span></div>`).join('');

/* ---------- board ---------- */
const cats = [...new Set(R.rows.map((r) => r.category).filter(Boolean))].sort();
$('fcat').innerHTML += cats.map((c) => `<option>${esc(c)}</option>`).join('');
const chains = [...new Set(R.rows.flatMap((r) => r.chains))].sort();
$('fchain').innerHTML += chains.map((c) => `<option>${esc(c)}</option>`).join('');

function visibleRows() {
  const q = state.q.toLowerCase();
  let rows = R.rows.filter((r) =>
    (!q || r.name.toLowerCase().includes(q) || r.slug.includes(q) || (r.category || '').toLowerCase().includes(q)) &&
    (!state.cat || r.category === state.cat) &&
    (!state.chain || r.chains.includes(state.chain)) &&
    (!state.wl || r.on_watchlist));
  const by = {
    implied: (a, b) => implied(b) - implied(a),
    tvl: (a, b) => b.tvl_usd - a.tvl_usd,
    growth: (a, b) => (b.change_7d ?? -1e9) - (a.change_7d ?? -1e9),
    age: (a, b) => (b.age_days ?? M.unknown_age_days) - (a.age_days ?? M.unknown_age_days),
    multiple: (a, b) => implied(b) / b.tvl_usd - implied(a) / a.tvl_usd,
  }[state.sort];
  return rows.sort(by);
}

function renderBoard() {
  const rows = visibleRows();
  $('shown').textContent =
    `Showing ${rows.length} of ${R.stats.board_size} ranked protocols` +
    (state.gw !== M.growth_weight || state.scale !== 1 ? ' — re-ranked under your sandbox weights; ranks and values are yours, not the board\u2019s.' : '.');
  $('rows').innerHTML = rows.map((r, i) => {
    const v = implied(r);
    return `<tr data-slug="${esc(r.slug)}">
      <td class="num rank">${i + 1}</td>
      <td class="name"><b>${esc(r.name)}</b>${r.on_watchlist ? '<span class="wl">★ watchlist</span>' : ''}<span class="slug">${esc(r.slug)}</span></td>
      <td>${esc(r.category ?? '—')}</td>
      <td>${r.chains.slice(0, 3).map((c) => `<span class="chain">${esc(c)}</span>`).join('')}${r.chains.length > 3 ? `<span class="chain">+${r.chains.length - 3}</span>` : ''}</td>
      <td class="num">${fmtUsd(r.tvl_usd)}</td>
      <td class="num ${r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg'}">${fmtPct(r.change_7d)}</td>
      <td class="num implied"><b>${fmtUsd(v)}</b><span class="sub">tokenless ${fmtAge(r.age_days)}</span></td>
      <td class="num">${fmtMult(v / r.tvl_usd)}</td>
      <td class="arrow">›</td></tr>`;
  }).join('');
  for (const tr of $('rows').children) tr.addEventListener('click', () => { location.hash = '#/p/' + tr.dataset.slug; });
}

$('q').addEventListener('input', (e) => { state.q = e.target.value; renderBoard(); });
$('fcat').addEventListener('change', (e) => { state.cat = e.target.value; renderBoard(); });
$('fchain').addEventListener('change', (e) => { state.chain = e.target.value; renderBoard(); });
$('fwl').addEventListener('change', (e) => { state.wl = e.target.checked; renderBoard(); });
$('fsort').addEventListener('change', (e) => { state.sort = e.target.value; renderBoard(); });
$('sgw').addEventListener('input', (e) => { state.gw = Number(e.target.value); $('sgwv').textContent = state.gw.toFixed(2); renderBoard(); });
$('sscale').addEventListener('input', (e) => { state.scale = Number(e.target.value); $('sscalev').textContent = state.scale.toFixed(2) + '×'; renderBoard(); });
$('sreset').addEventListener('click', () => {
  state.gw = M.growth_weight; state.scale = 1;
  $('sgw').value = state.gw; $('sgwv').textContent = state.gw.toFixed(2);
  $('sscale').value = 1; $('sscalev').textContent = '1.00×';
  renderBoard();
});

/* ---------- detail ---------- */
function bar(label, value, frac, shown) {
  return `<div class="bar-row"><span class="blabel">${label}</span><span class="bar"><i style="width:${Math.max(2, Math.min(100, frac * 100))}%"></i></span><span class="bval">${shown}</span></div>`;
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
      <span class="badge">Records no token</span></div>
    <div class="stats">
      <div class="stat"><b>${fmtUsd(r.implied_value_usd)}</b><span>Implied launch value (stated model)</span></div>
      <div class="stat"><b>${fmtUsd(r.tvl_usd)}</b><span>Total value locked</span></div>
      <div class="stat"><b class="${r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg'}">${fmtPct(r.change_7d)}</b><span>TVL change, 7 days</span></div>
      <div class="stat"><b>${fmtAge(r.age_days)}</b><span>Running with no token (tracked since ${esc(r.listed_at ?? 'an unrecorded date')})</span></div>
    </div>
    <div class="cols"><div>
      <div class="card"><h3>Why this value — the model, step by step</h3>
        <p class="formula">implied = TVL ${fmtUsd(r.tvl_usd)} × multiple ${fmtMult(m.base_multiple)} × growth ${fmtMult(m.growth_multiplier)} × maturity ${fmtMult(m.maturity_multiplier)} × breadth ${fmtMult(m.breadth_multiplier)} = ${fmtUsd(r.implied_value_usd)}</p>
        ${bar('Category multiple', m.base_multiple, m.base_multiple / M.multiple_max, fmtMult(m.base_multiple))}
        ${bar('Growth adjustment', m.growth_multiplier, (m.growth_multiplier - 0.7) / 0.9, fmtMult(m.growth_multiplier))}
        ${bar('Maturity adjustment', m.maturity_multiplier, (m.maturity_multiplier - M.maturity_floor) / M.maturity_range, fmtMult(m.maturity_multiplier))}
        ${bar('Breadth adjustment', m.breadth_multiplier, (m.breadth_multiplier - 1) / (M.breadth_per_chain * M.breadth_max_extra_chains), fmtMult(m.breadth_multiplier))}
        <p>The multiple is the market's own price for ${esc(r.category ?? 'uncategorised')} protocols: the median
        market-cap / TVL of the ${cal ? cal.peers : 0} traded peer${cal && cal.peers === 1 ? '' : 's'} in this snapshot (median ${cal && cal.median_ratio !== null ? fmtMult(cal.median_ratio) : '—'}),
        shrunk toward the market-wide median so a thin category borrows the whole market's evidence.
        Growth uses the week's TVL change, clamped to ${M.growth_floor}%…+${M.growth_cap}%. Maturity rewards a long
        tokenless run; breadth rewards each extra chain, up to ${M.breadth_max_extra_chains}.</p></div>
      <div class="card"><h3>The traded peers behind the multiple</h3>
        ${cal && cal.comps.length ? `<table class="mini"><thead><tr><th>Peer</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Cap / TVL</th></tr></thead>
        <tbody>${cal.comps.map((c) => `<tr><td>${esc(c.name)}</td><td class="num">${fmtUsd(c.tvl_usd)}</td><td class="num">${fmtUsd(c.mcap_usd)}</td><td class="num">${fmtMult(c.ratio)}</td></tr>`).join('')}</tbody></table>`
        : '<p>No traded peer in this category carries a market cap in the snapshot, so the market-wide median sets the price.</p>'}
      </div>
    </div><div>
      <div class="card"><h3>How to farm ${esc(r.name)}</h3>
        <ol class="farm">${r.farm.map((s) => `<li>${esc(s.text)}<span class="meta"><b>Cost:</b> ${esc(s.cost)} · <b>Time:</b> ${esc(s.time)}</span></li>`).join('')}</ol>
        <p class="note">Derived from ${esc(r.name)}'s own record — its category, its chains (${r.chains.map(esc).join(', ') || 'unrecorded'}),
        its size and its age. Amounts are sized to be a real user of a protocol this big, not a whale and not dust.</p></div>
      <div class="card"><h3>The record</h3>
        <p>Chains: ${r.chains.map((c) => `<span class="chain">${esc(c)}</span>`).join('') || '—'}<br>
        Board rank #${r.rank} of ${R.stats.board_size} · Implied ${fmtMult(r.implied_value_usd / r.tvl_usd)} of TVL ·
        Snapshot slug <code>${esc(r.slug)}</code>, as of ${R.as_of}. DefiLlama records no token, no CoinGecko id and
        no symbol for this protocol; that is the whole of the evidence that it is still to come.</p></div>
    </div></div>`;
}

/* ---------- calibration ---------- */
function renderCal() {
  $('view-cal').innerHTML = `
    <div class="card" style="margin-top:16px"><h3>Calibration — where the multiples come from</h3>
    <p>Every multiple on the board is read off this snapshot, not asserted. A protocol whose token already trades
    carries the market's own verdict: its market cap against its TVL. The radar takes each category's median such
    ratio — winsorised to ${fmtMult(M.ratio_min)}…${fmtMult(M.ratio_max)} so one wild print cannot carry a category — and
    shrinks it toward the market-wide median by the peer count (${M.shrink_peers} phantom peers), so a category with two
    traded protocols borrows most of its price from the whole market and one with fifteen speaks for itself.
    Exchanges are left out of the calibration: an exchange token prices a business, not a protocol.</p>
    <table class="mini"><thead><tr><th>Category</th><th class="num">Traded peers</th><th class="num">Median cap / TVL</th><th class="num">Multiple used</th><th class="num">Pre-token ranked</th></tr></thead>
    <tbody>${R.categories.map((c) => `<tr><td>${esc(c.category)}</td><td class="num">${c.peers}</td><td class="num">${c.median_ratio === null ? '—' : fmtMult(c.median_ratio)}</td><td class="num"><b>${fmtMult(c.multiple)}</b></td><td class="num">${c.pre_token}</td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3>The traded set — the market's own values, kept apart from the ranking</h3>
    <p>These protocols already have their token. The board never ranks them; they are the evidence, not the quarry.</p>
    <table class="mini"><thead><tr><th>Protocol</th><th>Category</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Cap / TVL</th><th class="num">7d</th></tr></thead>
    <tbody>${R.live.map((p) => `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.category ?? '—')}</td><td class="num">${fmtUsd(p.tvl_usd)}</td><td class="num">${fmtUsd(p.mcap_usd)}</td><td class="num">${p.ratio === null ? '—' : fmtMult(p.ratio)}</td><td class="num ${p.change_7d === null ? '' : p.change_7d >= 0 ? 'pos' : 'neg'}">${fmtPct(p.change_7d)}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- method ---------- */
function renderMethod() {
  $('view-method').innerHTML = `<div class="method">
    <h3>What this radar is</h3>
    <p>A launch is the token a protocol may issue one day. This board reads one sealed snapshot of the whole protocol
    universe — ${R.stats.protocols} protocols at or above $5M of TVL, fetched once from DefiLlama's public record on
    ${R.as_of} — finds the ${R.stats.pre_token} that record no token, ranks ${R.stats.board_size} of them by an implied
    launch value, and writes a farm plan for each. Nothing here is fetched live and no name is hand-picked: run the
    program on a fresher snapshot and the board re-derives itself, which is what makes it a radar rather than a list.</p>
    <h3>The value model (${R.model_version})</h3>
    <p class="formula">implied = TVL × category multiple × growth × maturity × breadth</p>
    <p><b>Category multiple.</b> The median market-cap / TVL of the category's traded protocols in this same snapshot,
    shrunk toward the market-wide median by peer count and clamped to ${fmtMult(M.multiple_min)}…${fmtMult(M.multiple_max)}.
    It answers: what does the market itself pay, per dollar locked, for a launched protocol of this kind?</p>
    <p><b>Growth.</b> The week's TVL change, clamped to ${M.growth_floor}%…+${M.growth_cap}%, weighted ${M.growth_weight}:
    a protocol gathering value is worth more at launch than one leaking it, but one hot week never doubles the price.</p>
    <p><b>Maturity.</b> ${M.maturity_floor} rising to ${M.maturity_floor + M.maturity_range} over ${M.maturity_days} days of tokenless
    operation (${M.unknown_age_days} assumed when the record gives no start date): a protocol that has run for years with no
    token has both the users and the reason to launch.</p>
    <p><b>Breadth.</b> +${Math.round(M.breadth_per_chain * 100)}% per extra chain, up to ${M.breadth_max_extra_chains}: more chains,
    more wallets a launch can reach.</p>
    <h3>Who is ranked, who is set aside</h3>
    <p>Every protocol on the snapshot's watchlist is ranked — the watchlist is the floor. Below it, the radar adds every
    other protocol that records no token, except the ones that are not a launch of their own waiting to happen:
    centralised exchanges, versioned pools of another protocol, bridged products (the Bridge and Canonical Bridge
    categories — WBTC is Bitcoin on Ethereum, not a launch to come) and wrapped or staked products of a token that
    already trades (the house's own exclusions, applied to every row the radar adds). Traded protocols are never
    ranked; they form the calibration set on the Calibration tab.</p>
    <h3>The farm plans</h3>
    <p>Each plan is generated from the protocol's own record: the core action from its category (supply, provide,
    stake, bridge, trade…), a second position on its second chain when it has one, a weekly qualifying habit, a holding
    window from its age, and amounts sized to its TVL. Every step states what it costs and how long it takes.</p>
    <h3>Honesty</h3>
    <p>The board says a protocol <em>records</em> no token, never that it has none: a record can be incomplete, and a
    launch's value here is the entry's own claim from the snapshot's figures — not a promise that a token comes, or
    what it would trade at. The screenshots of this page and the code that writes it are the same entry: the numbers
    above are the numbers board.json carries.</p></div>`;
}

/* A filtered view can be linked and screenshotted: ?q=, ?cat=, ?chain=, ?wl=1, ?sort= preset the
   controls before the first render. */
(function preset() {
  const p = new URLSearchParams(location.search);
  if (p.get('q')) { state.q = p.get('q'); $('q').value = state.q; }
  if (p.get('cat') && cats.includes(p.get('cat'))) { state.cat = p.get('cat'); $('fcat').value = state.cat; }
  if (p.get('chain') && chains.includes(p.get('chain'))) { state.chain = p.get('chain'); $('fchain').value = state.chain; }
  if (p.get('wl') === '1') { state.wl = true; $('fwl').checked = true; }
  if (['implied', 'tvl', 'growth', 'age', 'multiple'].includes(p.get('sort'))) { state.sort = p.get('sort'); $('fsort').value = state.sort; }
  renderBoard();
})();

/* ---------- routing ---------- */
function route() {
  const hash = location.hash || '#/';
  const detail = hash.match(/^#\/p\/(.+)$/);
  for (const id of ['view-board', 'view-detail', 'view-cal', 'view-method']) $(id).hidden = true;
  let tab = 'board';
  if (detail) { renderDetail(decodeURIComponent(detail[1])); $('view-detail').hidden = false; tab = ''; }
  else if (hash === '#/cal') { renderCal(); $('view-cal').hidden = false; tab = 'cal'; }
  else if (hash === '#/method') { renderMethod(); $('view-method').hidden = false; tab = 'method'; }
  else { $('view-board').hidden = false; }
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('active', b.dataset.view === tab);
  window.scrollTo(0, 0);
}
for (const b of document.querySelectorAll('.tab')) {
  b.addEventListener('click', () => { location.hash = b.dataset.view === 'board' ? '#/' : '#/' + b.dataset.view; });
}
window.addEventListener('hashchange', route);
renderBoard();
route();
