// The token radar's model (radar-2): one sealed snapshot of the protocol universe in, one ranked
// board out. Every figure on the board is derived from the snapshot's own records; no protocol name
// is ever special-cased, and the same functions score every row.
//
// The board covers every slug on the snapshot's watchlist (the floor, never a ceiling) and adds every
// other protocol that records no token and is not a product of one that trades: no centralised
// exchange, no versioned pool of another protocol, no wrapped or staked namesake of a traded token.
//
// Implied value — what a launch would be worth if the protocol's record stayed as it is:
//
//   multiple   = the market's own price for the protocol's category: the median market-cap / TVL of
//                the snapshot's traded protocols in that category, shrunk toward the global median
//                by the peer count, so a thin category borrows the market's whole evidence and a
//                deep one speaks for itself
//   base       = tvl_usd x multiple
//   growth     = clamp(change_7d, -60, +120) per cent;  growthMult = 1 + growth / 100 x 0.5
//   maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age unknown: 365 days)
//   breadth    = 1 + 0.04 x min(chains - 1, 4): a protocol live on more chains reaches more farmers
//   implied    = max(1, round(base x growthMult x maturity x breadth))
//
// The dashboard states these constants and its sandbox re-ranks the board live under other weights,
// from the components each row carries. The traded protocols are never mixed into the ranking: they
// are the calibration set, shown apart with the market's own values.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change two of them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_per_chain: number;
  breadth_max_extra_chains: number;
  shrink_peers: number;
  multiple_min: number;
  multiple_max: number;
  ratio_min: number;
  ratio_max: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  breadth_per_chain: 0.04,
  breadth_max_extra_chains: 4,
  shrink_peers: 4,
  multiple_min: 0.05,
  multiple_max: 2.5,
  ratio_min: 0.02,
  ratio_max: 8,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many traded protocols the calibration view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One traded peer inside a category: the evidence a multiple stands on. */
export interface CompRow {
  name: string;
  tvl_usd: number;
  mcap_usd: number;
  ratio: number;
}

/** A category's calibration: its traded peers, their median price, and the multiple in use. */
export interface CategoryCal {
  category: string;
  peers: number;
  median_ratio: number | null;
  multiple: number;
  pre_token: number;
  comps: CompRow[];
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  on_watchlist: boolean;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    category_peers: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's view of one board row: the row, its farm plan and its model parts. */
export interface RadarRow extends BoardRow {
  farm: FarmStep[];
}

/** A traded protocol: it already has a token, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  ratio: number | null;
}

/** Everything the dashboard renders: the board, the calibration set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  stats: {
    protocols: number;
    pre_token: number;
    board_size: number;
    watchlist_size: number;
    live_size: number;
    peers: number;
    global_multiple: number;
    board_implied_total: number;
  };
  rows: RadarRow[];
  live: LiveRow[];
  categories: CategoryCal[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a non-empty list, or null. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A whole word that marks a wrapped or staked product of another protocol. */
const PRODUCT_WORD = /\b(wrapped|staked|staking)\b/i;

/** Names that begin with an exchange's name are that exchange's own product, not a launch to come. */
const EXCHANGE_PREFIX = /^(binance|coinbase|bybit|kraken|bitget|okx|bitfinex|gemini)\b/i;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Categories that are a product of another protocol rather than a launch of their own: a bridge's
 * entries are other protocols' assets in transit (WBTC is Bitcoin on Ethereum, a canonical bridge is
 * a rollup's own deposit box), exactly as the snapshot's watchlist rule sets them aside.
 */
const PRODUCT_CATEGORY = new Set(['Bridge', 'Canonical Bridge']);

/**
 * Whether a protocol is one the board may rank beyond the watchlist: pre-token, not an exchange, not
 * a versioned pool, not a bridged product, and not a wrapped or staked product of a token that
 * already trades — the house's own watchlist exclusions, applied to every row the radar adds itself.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    p.category !== 'CEX' &&
    (p.category === null || !PRODUCT_CATEGORY.has(p.category)) &&
    !VERSIONED.test(p.name) &&
    !PRODUCT_WORD.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name)
  );
}

/** The category key a protocol calibrates under: its category, or one shared key for the unnamed. */
function categoryKey(p: SnapshotProtocol): string {
  return p.category ?? 'Uncategorised';
}

/**
 * The market's own prices, read off the snapshot: every traded protocol with a TVL (exchanges set
 * aside, their market caps price a business, not a protocol) gives a market-cap / TVL ratio, winsorised
 * so one wild print cannot carry a category. A category's multiple is its peers' median ratio shrunk
 * toward the global median by the peer count and clamped to a sane band.
 */
export function calibrate(snapshot: Snapshot, model: ModelConstants = MODEL): Map<string, CategoryCal> {
  const ratiosByCategory = new Map<string, number[]>();
  const compsByCategory = new Map<string, CompRow[]>();
  const allRatios: number[] = [];
  for (const p of snapshot.protocols) {
    if (p.mcap_usd === null || p.tvl_usd <= 0 || p.category === 'CEX') continue;
    const ratio = Math.min(model.ratio_max, Math.max(model.ratio_min, p.mcap_usd / p.tvl_usd));
    const key = categoryKey(p);
    allRatios.push(ratio);
    const list = ratiosByCategory.get(key) ?? [];
    list.push(ratio);
    ratiosByCategory.set(key, list);
    const comps = compsByCategory.get(key) ?? [];
    comps.push({ name: p.name, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd, ratio: round4(ratio) });
    compsByCategory.set(key, comps);
  }
  const globalMedian = median(allRatios) ?? 0.25;
  const preTokenByCategory = new Map<string, number>();
  for (const p of snapshot.protocols) {
    if (!isPreToken(p)) continue;
    const key = categoryKey(p);
    preTokenByCategory.set(key, (preTokenByCategory.get(key) ?? 0) + 1);
  }
  const out = new Map<string, CategoryCal>();
  const keys = new Set([...ratiosByCategory.keys(), ...preTokenByCategory.keys()]);
  for (const key of keys) {
    const ratios = ratiosByCategory.get(key) ?? [];
    const med = median(ratios);
    const shrunk =
      med === null
        ? globalMedian
        : (ratios.length * med + model.shrink_peers * globalMedian) / (ratios.length + model.shrink_peers);
    const multiple = Math.min(model.multiple_max, Math.max(model.multiple_min, shrunk));
    const comps = (compsByCategory.get(key) ?? []).sort((a, b) => b.tvl_usd - a.tvl_usd).slice(0, 5);
    out.set(key, {
      category: key,
      peers: ratios.length,
      median_ratio: med === null ? null : round4(med),
      multiple: round4(multiple),
      pre_token: preTokenByCategory.get(key) ?? 0,
      comps,
    });
  }
  return out;
}

/** The model's parts for one protocol: its multiple, its three adjustments and its implied value. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  cal: CategoryCal,
  model: ModelConstants = MODEL,
): {
  implied: number;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  breadthMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, finite(protocol.change_7d, 0)));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult =
    model.maturity_floor +
    (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const extraChains = Math.min(Math.max(protocol.chains.length - 1, 0), model.breadth_max_extra_chains);
  const breadthMult = 1 + model.breadth_per_chain * extraChains;
  const implied = Math.max(1, Math.round(protocol.tvl_usd * cal.multiple * growthMult * maturityMult * breadthMult));
  return { implied, growthPct, growthMult, maturityMult, breadthMult, age };
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(
  snapshot: Snapshot,
  calibration: Map<string, CategoryCal>,
  model: ModelConstants = MODEL,
): BoardRow[] {
  const index = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug on it is ranked, whatever the radar's own rules say.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The radar's own reach: every other rankable pre-token protocol in the snapshot, at any size.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }
  const watchlist = new Set(snapshot.watchlist);
  const scored = [...chosen.values()].map((p) => {
    const cal = calibration.get(categoryKey(p))!;
    const parts = impliedValue(p, snapshot.as_of, cal, model);
    return { p, cal, ...parts };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    on_watchlist: watchlist.has(s.p.slug),
    implied_value_usd: s.implied,
    model: {
      base_multiple: s.cal.multiple,
      category_peers: s.cal.peers,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      breadth_multiplier: round4(s.breadthMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's core action, in words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('cdp') || c.includes('collateral'))
    return `Deposit $${capital} of ETH or a liquid staking token as collateral in ${name} on ${chain} and mint a small amount of its stablecoin against it.`;
  if (c.includes('lend'))
    return `Supply $${capital} of USDC to ${name} on ${chain}, then borrow about $${Math.round(capital / 3)} against it and repay within the week, so both sides of the market see the wallet.`;
  if (c.includes('dex'))
    return `Provide $${capital} split between the two sides of ${name}'s busiest pool on ${chain} and make two swaps of about $25 through the same wallet.`;
  if (c.includes('perpetual') || c.includes('derivative'))
    return `Deposit $${capital} of USDC as margin on ${name} and trade one small position a week, keeping leverage under 3x so the margin survives.`;
  if (c.includes('bridge'))
    return `Bridge $${capital} of USDC from Ethereum to ${chain === 'Ethereum' ? 'one of the chains it serves' : chain} through ${name}, then use the bridged funds in one app on the far side.`;
  if (c.includes('liquid staking') || c.includes('restak'))
    return `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and hold the liquid receipt token in the same wallet.`;
  if (c.includes('staking'))
    return `Stake $${capital} of the underlying asset through ${name} on ${chain} and leave the position untouched while it accrues.`;
  if (c.includes('curator') || c.includes('allocator'))
    return `Deposit $${capital} into one of ${name}'s curated vaults on ${chain} and keep the vault shares in the wallet.`;
  if (c.includes('yield'))
    return `Deposit $${capital} of USDC into ${name}'s main vault on ${chain} and keep the yield-bearing shares it issues.`;
  if (c.includes('stable'))
    return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it rather than swapping out.`;
  if (c.includes('rwa'))
    return `Mint $${capital} of ${name}'s yield asset on ${chain} and hold it past the first distribution.`;
  if (c.includes('insurance'))
    return `Buy $${capital} of cover from ${name} on ${chain} for one month and keep the policy NFT in the wallet.`;
  if (c.includes('prediction'))
    return `Fund $${capital} and take one position in ${name}'s most liquid market, then settle it rather than letting it lapse.`;
  if (c.includes('privacy'))
    return `Deposit $${capital} into ${name}'s shielded pool on ${chain} and make one shielded transfer to a second wallet you own.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The second, deepening action: another chain when there is one, else a second product surface. */
function secondActionFor(p: SnapshotProtocol, capital: number): string {
  const name = p.name;
  if (p.chains.length > 1)
    return `Repeat a smaller position, about $${Math.round(capital / 2)}, on ${p.chains[1]}: ${name} is live there too, and multi-chain users are the ones a launch can least afford to miss.`;
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp'))
    return `Once the first position is a month old, open a second, smaller one in a different market of ${name} so the wallet shows range, not one repeated click.`;
  if (c.includes('dex') || c.includes('yield'))
    return `Add a second, smaller position in another pool or vault of ${name} after the first month, so the wallet's history spans more than one market.`;
  return `After the first month, make one more deposit of about $${Math.round(capital / 2)} into ${name} so the wallet's history shows a returning user, not a single visit.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  return [
    {
      text: `Use a fresh wallet for ${p.name} that holds only the funds you plan to farm with, and keep its seed phrase offline on paper.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: actionFor(p, capital, chain),
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: secondActionFor(p, capital),
      cost: `about $${Math.round(capital / 2)} more capital and $3 of gas`,
      time: '10 minutes',
    },
    {
      text: `Make one qualifying action each week — a deposit, a borrow, a swap, a stake or a claim — on the same wallet, so the history reads as a habit and not a single airdrop grab.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so it is counted in more than one snapshot, and check ${p.name}'s own site and announcements for a points or rewards page; claim only from links the protocol itself publishes.`,
      cost: `the $${capital} stays in the position, and never pay anyone to claim`,
      time: `${hold} days, with a 10 minute check each week`,
    },
    {
      text: `Write the wallet, the dates and every transaction hash in a farm log, so you can prove the history, repeat the position, or unwind it the week a launch is announced.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The traded protocols, by market cap, for the dashboard's calibration view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      ratio: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
    }));
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const calibration = calibrate(snapshot, model);
  const board = buildBoard(snapshot, calibration, model);
  const live = liveRows(snapshot);
  const farmBySlug = new Map(board.map((r) => [r.slug, farmSteps(snapshot.protocols.find((p) => p.slug === r.slug)!, r.age_days)]));
  const globalMultiple = (() => {
    const all = [...calibration.values()];
    const totalPeers = all.reduce((n, c) => n + c.peers, 0);
    return totalPeers === 0 ? 0.25 : round4(all.reduce((n, c) => n + c.multiple * c.peers, 0) / totalPeers);
  })();
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    stats: {
      protocols: snapshot.protocols.length,
      pre_token: snapshot.protocols.filter(isPreToken).length,
      board_size: board.length,
      watchlist_size: snapshot.watchlist.length,
      live_size: live.length,
      peers: snapshot.protocols.filter((p) => p.mcap_usd !== null && p.tvl_usd > 0 && p.category !== 'CEX').length,
      global_multiple: globalMultiple,
      board_implied_total: board.reduce((n, r) => n + r.implied_value_usd, 0),
    },
    rows: board.map((r) => ({ ...r, farm: farmBySlug.get(r.slug)! })),
    live,
    categories: [...calibration.values()]
      .filter((c) => c.peers > 0 || c.pre_token > 0)
      .sort((a, b) => b.multiple - a.multiple),
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0)
    throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string'))
    throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++)
    if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
