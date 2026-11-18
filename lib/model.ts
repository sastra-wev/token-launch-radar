// The token radar's model (radar-3): one sealed snapshot of the protocol universe in, one ranked
// board out. Every figure on the board is derived from the snapshot's own records; no protocol name
// is ever special-cased, and the same functions score every row.
//
// The board covers every slug on the snapshot's watchlist (the floor, never a ceiling) and adds every
// other protocol that records no token and is not a product of one that trades: no centralised
// exchange, no versioned pool of another protocol, no wrapped or staked namesake of a traded token.
//
// Implied value — what a launch would be worth if the protocol's record stayed as it is. A protocol's
// TVL is priced at what the market itself pays per locked dollar for protocols of its kind, read off
// the snapshot's traded protocols, then adjusted for the protocol's own momentum, endurance and
// reach:
//
//   price      = a three-level shrinkage estimate of the market-cap / TVL multiple:
//                  category: the median ratio of the category's own traded peers
//                  family:   the median ratio of its economic family's traded peers (lending with
//                            lending, staking with staking), the level a thin category falls back to
//                  market:   the median ratio of every traded protocol in the snapshot
//                Each level is shrunk toward the next by its peer count (category toward family with
//                6 phantom peers, family toward market with 12), so a category priced by fifteen
//                peers speaks for itself, one priced by a single peer borrows its family's evidence,
//                and one with no peers is priced by the market alone. A category's own figures are
//                also trusted only within a factor of three of the level above them — bounded
//                influence — and the same chain, applied to the peer ratios' quartiles, gives the
//                multiple's low and high: the board's range.
//                radar-2 priced a category from its own median alone, shrunk only toward the market:
//                one wild peer print (an oracle filed as a curator, at 2.98x) set the price of all 34
//                pre-token curators. The family level is radar-3's answer: no single print, and no
//                single category, carries a price on its own.
//   momentum   = 1 + 0.6 x sign(g) x sqrt(|g| / 100), g = the week's TVL change clamped to -60..+120
//                per cent. The square root dampens: a protocol that doubled in a week is not priced
//                at twice the momentum of one that rose a quarter.
//   endurance  = 0.6 + 0.4 x ln(1 + age_days) / ln(1 + 1825): how long the protocol has run with no
//                token, on a log scale — the first tokenless year says more than the fifth. A record
//                with no start date is taken as 365 days.
//   reach      = 1 + 0.09 x (sqrt(chains) - 1), chains capped at 25: each further chain a protocol
//                is live on reaches more farmers, and each adds less than the one before.
//   implied    = max(1, round(tvl x price x momentum x endurance x reach)), with the same product
//                at the low and high multiples giving the row's stated range.
//
// The dashboard states these constants and its sandbox re-ranks the board live under other momentum
// weights, from the components each row carries. The traded protocols are never mixed into the
// ranking: they are the calibration set, shown apart with the market's own values.

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

/** The model's constants, as the dashboard states them and the sandbox may change one of them. */
export interface ModelConstants {
  ratio_min: number;
  ratio_max: number;
  multiple_min: number;
  multiple_max: number;
  shrink_category: number;
  shrink_family: number;
  influence_cap: number;
  momentum_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_cap_days: number;
  unknown_age_days: number;
  breadth_coef: number;
  breadth_chain_cap: number;
}

export const MODEL: ModelConstants = {
  ratio_min: 0.02,
  ratio_max: 8,
  multiple_min: 0.05,
  multiple_max: 2.5,
  shrink_category: 6,
  shrink_family: 12,
  influence_cap: 3,
  momentum_weight: 0.6,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_cap_days: 1825,
  unknown_age_days: 365,
  breadth_coef: 0.09,
  breadth_chain_cap: 25,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-3';

/** How many traded protocols the calibration view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One traded peer inside a category: the evidence a multiple stands on. */
export interface CompRow {
  name: string;
  tvl_usd: number;
  mcap_usd: number;
  ratio: number;
}

/** How much evidence prices a row: the peer count behind its category's own median. */
export type EvidenceTier = 'deep' | 'standard' | 'thin' | 'market';

/** A category's calibration: its peers, its family, and the multiple the chain settles on. */
export interface CategoryCal {
  category: string;
  family: string | null;
  peers: number;
  median_ratio: number | null;
  multiple: number;
  multiple_low: number;
  multiple_high: number;
  priced_from: 'category' | 'family' | 'market';
  tier: EvidenceTier;
  pre_token: number;
  comps: CompRow[];
}

/** A family's calibration: the pooled evidence of every category that does the same work. */
export interface FamilyCal {
  family: string;
  peers: number;
  median_ratio: number | null;
  estimate: number;
  categories: number;
  pre_token: number;
}

/** One traded protocol as a point on the calibration scatter: the market's own verdict. */
export interface PeerPoint {
  name: string;
  category: string | null;
  family: string | null;
  tvl_usd: number;
  mcap_usd: number;
  ratio: number;
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
  implied_low_usd: number;
  implied_high_usd: number;
  model: {
    base_multiple: number;
    multiple_low: number;
    multiple_high: number;
    category_peers: number;
    family: string | null;
    priced_from: 'category' | 'family' | 'market';
    tier: EvidenceTier;
    growth_pct: number;
    growth_root: number;
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
    categories_priced: number;
    families: number;
    global_multiple: number;
    board_implied_total: number;
  };
  rows: RadarRow[];
  live: LiveRow[];
  categories: CategoryCal[];
  families: FamilyCal[];
  peers_plot: PeerPoint[];
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

/** A quantile of a non-empty list by linear interpolation between closest ranks, or null. */
function quantile(values: number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0]!;
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return lo === hi ? sorted[lo]! : sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (at - lo);
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
 * The model's one piece of structure: an economic family for a category, by what the protocol does
 * with other people's capital — lending with lending, staking with staking, venues with venues. It
 * names categories, never protocols, and every price still comes from the snapshot's own ratios: the
 * family is only the pool a thin category's evidence is read alongside. A category the map does not
 * name has no family and is priced from its own peers and the market alone.
 */
const FAMILY_OF: Record<string, string> = {
  'Lending': 'Credit',
  'CDP': 'Credit',
  'CDP Manager': 'Credit',
  'Uncollateralized Lending': 'Credit',
  'Collateral Markets': 'Credit',
  'Collateral Management': 'Credit',
  'CeDeFi': 'Credit',
  'Dexs': 'Spot exchange',
  'OTC Marketplace': 'Spot exchange',
  'NFT Marketplace': 'Spot exchange',
  'Derivatives': 'Derivatives',
  'Options': 'Derivatives',
  'Options Vault': 'Derivatives',
  'Interest Rate Derivatives': 'Derivatives',
  'Synthetics': 'Derivatives',
  'Prediction Market': 'Derivatives',
  'Risk Curators': 'Capital management',
  'Onchain Capital Allocator': 'Capital management',
  'Yield': 'Capital management',
  'Yield Aggregator': 'Capital management',
  'Liquidity Manager': 'Capital management',
  'Indexes': 'Capital management',
  'Basis Trading': 'Capital management',
  'Farm': 'Capital management',
  'Leveraged Farming': 'Capital management',
  'Liquid Staking': 'Staking',
  'Liquid Restaking': 'Staking',
  'Restaking': 'Staking',
  'Restaked BTC': 'Staking',
  'Staking Pool': 'Staking',
  'Anchor BTC': 'Staking',
  'Decentralized BTC': 'Staking',
  'Bridge': 'Bridging',
  'Cross Chain Bridge': 'Bridging',
  'Dual-Token Stablecoin': 'Money',
  'Stablecoin Wrapper': 'Money',
  'Stablecoin Issuer': 'Money',
  'Algo-Stables': 'Money',
  'Reserve Currency': 'Money',
  'Chain': 'Networks & services',
  'Privacy': 'Networks & services',
  'Token Locker': 'Networks & services',
  'Launchpad': 'Networks & services',
  'AI Agents': 'Networks & services',
  'Decentralized AI': 'Networks & services',
  'DOR': 'Networks & services',
  'Insurance': 'Networks & services',
  'Payments': 'Networks & services',
  'Crypto Card Issuer': 'Networks & services',
  'Governance Incentives': 'Networks & services',
};

/** The family a category belongs to, or null when the map does not name it. */
function familyOf(category: string): string | null {
  return FAMILY_OF[category] ?? null;
}

/** A level's evidence: its peer count and the median and quartiles of its winsorised ratios. */
interface LevelStats {
  peers: number;
  median: number;
  q25: number;
  q75: number;
}

/** The stats of one pool of ratios; an empty pool borrows the level above it whole. */
function levelStats(ratios: number[], above: LevelStats | null): LevelStats {
  if (ratios.length === 0) {
    if (above === null) return { peers: 0, median: 0.25, q25: 0.1, q75: 0.5 };
    return { peers: 0, median: above.median, q25: above.q25, q75: above.q75 };
  }
  return {
    peers: ratios.length,
    median: median(ratios)!,
    q25: quantile(ratios, 0.25)!,
    q75: quantile(ratios, 0.75)!,
  };
}

/** Shrink one level's stats toward the level above it, component by component, by peer count. */
function shrinkToward(level: LevelStats, above: LevelStats, phantom: number): { median: number; q25: number; q75: number } {
  const w = level.peers + phantom;
  if (w === 0) return { median: above.median, q25: above.q25, q75: above.q75 };
  const mix = (own: number, up: number): number => (level.peers * own + phantom * up) / w;
  return { median: mix(level.median, above.median), q25: mix(level.q25, above.q25), q75: mix(level.q75, above.q75) };
}

/** The calibration the model settles on: per-category prices, per-family evidence, the market level. */
export interface Calibration {
  categories: Map<string, CategoryCal>;
  families: Map<string, FamilyCal>;
  global: LevelStats;
  peersPlot: PeerPoint[];
}

/**
 * The market's own prices, read off the snapshot in three levels. Every traded protocol with a TVL
 * and a positive market cap (exchanges set aside, their market caps price a business, not a
 * protocol) gives a market-cap / TVL ratio, winsorised so one wild print cannot carry a pool. The market level is every ratio's median;
 * a family's estimate shrinks its pooled median toward the market by 12 phantom peers; a category's
 * multiple shrinks its own median toward its family's estimate by 6 — and the same chain on the
 * quartiles gives the multiple's low and high, the board's stated range.
 */
export function calibrate(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const ratiosByCategory = new Map<string, number[]>();
  const compsByCategory = new Map<string, CompRow[]>();
  const ratiosByFamily = new Map<string, number[]>();
  const allRatios: number[] = [];
  const peersPlot: PeerPoint[] = [];
  for (const p of snapshot.protocols) {
    // A peer counts only when it carries a positive market cap: a record of zero (or the -1 one
    // protocol carries) is a dead or unpriced token, and no price at all — it is not evidence that
    // the market values its kind at nothing.
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0 || p.category === 'CEX') continue;
    const ratio = Math.min(model.ratio_max, Math.max(model.ratio_min, p.mcap_usd / p.tvl_usd));
    const key = categoryKey(p);
    const family = familyOf(key);
    allRatios.push(ratio);
    const list = ratiosByCategory.get(key) ?? [];
    list.push(ratio);
    ratiosByCategory.set(key, list);
    const comps = compsByCategory.get(key) ?? [];
    comps.push({ name: p.name, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd, ratio: round4(ratio) });
    compsByCategory.set(key, comps);
    if (family !== null) {
      const fam = ratiosByFamily.get(family) ?? [];
      fam.push(ratio);
      ratiosByFamily.set(family, fam);
    }
    peersPlot.push({ name: p.name, category: p.category, family, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd, ratio: round4(ratio) });
  }
  const global = levelStats(allRatios, null);

  const preTokenByCategory = new Map<string, number>();
  const catsByFamily = new Map<string, Set<string>>();
  for (const p of snapshot.protocols) {
    const key = categoryKey(p);
    const family = familyOf(key);
    if (family !== null) {
      const set = catsByFamily.get(family) ?? new Set<string>();
      set.add(key);
      catsByFamily.set(family, set);
    }
    if (!isPreToken(p)) continue;
    preTokenByCategory.set(key, (preTokenByCategory.get(key) ?? 0) + 1);
  }

  const clampMultiple = (n: number): number => Math.min(model.multiple_max, Math.max(model.multiple_min, n));
  const familyEstimate = new Map<string, { stats: LevelStats; estimate: { median: number; q25: number; q75: number } }>();
  const families = new Map<string, FamilyCal>();
  for (const [family, ratios] of ratiosByFamily) {
    const stats = levelStats(ratios, global);
    const estimate = shrinkToward(stats, global, model.shrink_family);
    familyEstimate.set(family, { stats, estimate });
    families.set(family, {
      family,
      peers: stats.peers,
      median_ratio: round4(stats.median),
      estimate: round4(clampMultiple(estimate.median)),
      categories: catsByFamily.get(family)?.size ?? 0,
      pre_token: [...(catsByFamily.get(family) ?? [])].reduce((n, c) => n + (preTokenByCategory.get(c) ?? 0), 0),
    });
  }

  const categories = new Map<string, CategoryCal>();
  const keys = new Set([...ratiosByCategory.keys(), ...preTokenByCategory.keys()]);
  for (const key of keys) {
    const ratios = ratiosByCategory.get(key) ?? [];
    const family = familyOf(key);
    const fam = family === null ? undefined : familyEstimate.get(family);
    const above: LevelStats =
      fam === undefined
        ? global
        : { peers: fam.stats.peers, median: fam.estimate.median, q25: fam.estimate.q25, q75: fam.estimate.q75 };
    // Bounded influence: a category's own figures are trusted only within the cap of the level
    // above it, so one wild peer print — an oracle filed as a curator at 2.98x, a prediction
    // market's peer at the 8x winsor line — cannot carry the category's price on its own.
    const bound = (x: number): number =>
      Math.min(above.median * model.influence_cap, Math.max(above.median / model.influence_cap, x));
    const rawStats = levelStats(ratios, above);
    const stats: LevelStats =
      ratios.length === 0
        ? rawStats
        : { peers: rawStats.peers, median: bound(rawStats.median), q25: bound(rawStats.q25), q75: bound(rawStats.q75) };
    const settled = shrinkToward(stats, above, model.shrink_category);
    const multiple = clampMultiple(settled.median);
    const low = Math.min(multiple, clampMultiple(settled.q25));
    const high = Math.max(multiple, clampMultiple(settled.q75));
    const tier: EvidenceTier = stats.peers >= 8 ? 'deep' : stats.peers >= 3 ? 'standard' : stats.peers >= 1 ? 'thin' : 'market';
    categories.set(key, {
      category: key,
      family,
      peers: stats.peers,
      median_ratio: ratios.length === 0 ? null : round4(rawStats.median),
      multiple: round4(multiple),
      multiple_low: round4(low),
      multiple_high: round4(high),
      priced_from: stats.peers >= 3 ? 'category' : fam !== undefined ? 'family' : 'market',
      tier,
      pre_token: preTokenByCategory.get(key) ?? 0,
      comps: (compsByCategory.get(key) ?? []).sort((a, b) => b.tvl_usd - a.tvl_usd).slice(0, 5),
    });
  }
  peersPlot.sort((a, b) => b.tvl_usd - a.tvl_usd);
  return { categories, families, global, peersPlot };
}

/** The model's parts for one protocol: its price, its range, its three adjustments, its value. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  cal: CategoryCal,
  model: ModelConstants = MODEL,
): {
  implied: number;
  impliedLow: number;
  impliedHigh: number;
  growthPct: number;
  growthRoot: number;
  growthMult: number;
  maturityMult: number;
  breadthMult: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, finite(protocol.change_7d, 0)));
  const growthRoot = Math.sign(growthPct) * Math.sqrt(Math.abs(growthPct) / 100);
  const growthMult = 1 + model.momentum_weight * growthRoot;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult =
    model.maturity_floor +
    (Math.log1p(Math.max(ageForModel, 0)) / Math.log1p(model.maturity_cap_days)) * model.maturity_range;
  const chainsCounted = Math.min(Math.max(protocol.chains.length, 1), model.breadth_chain_cap);
  const breadthMult = 1 + model.breadth_coef * (Math.sqrt(chainsCounted) - 1);
  const product = (multiple: number): number =>
    Math.max(1, Math.round(protocol.tvl_usd * multiple * growthMult * maturityMult * breadthMult));
  return {
    implied: product(cal.multiple),
    impliedLow: product(cal.multiple_low),
    impliedHigh: product(cal.multiple_high),
    growthPct,
    growthRoot,
    growthMult,
    maturityMult,
    breadthMult,
    age,
  };
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(
  snapshot: Snapshot,
  calibration: Calibration,
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
    const cal = calibration.categories.get(categoryKey(p))!;
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
    implied_low_usd: s.impliedLow,
    implied_high_usd: s.impliedHigh,
    model: {
      base_multiple: s.cal.multiple,
      multiple_low: s.cal.multiple_low,
      multiple_high: s.cal.multiple_high,
      category_peers: s.cal.peers,
      family: s.cal.family,
      priced_from: s.cal.priced_from,
      tier: s.cal.tier,
      growth_pct: s.growthPct,
      growth_root: round4(s.growthRoot),
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

/**
 * What gas costs on the chain a position sits on, as a planning figure: Ethereum mainnet at mainnet
 * prices, Bitcoin for its fees, and every other chain at the few-dollars level its fees run at. The
 * tiers are the model's stated constants, applied by chain name to every protocol alike.
 */
function gasTier(chain: string): { setup: number; weekly: number; label: string } {
  if (chain === 'Ethereum') return { setup: 18, weekly: 6, label: 'Ethereum mainnet gas' };
  if (chain === 'Bitcoin') return { setup: 5, weekly: 2, label: 'Bitcoin network fees' };
  return { setup: 3, weekly: 1, label: `gas on ${chain}` };
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 500_000_000) return 125;
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

/** The category's family of work, in lowercase words the step generator keys on. */
function kindOf(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('curator') || c.includes('allocator') || c.includes('liquidity manager')) return 'curator';
  if (c.includes('cdp')) return 'cdp';
  if (c.includes('uncollateralized')) return 'unsecured';
  if (c.includes('lend') || c.includes('collateral')) return 'lending';
  if (c.includes('dex')) return 'dex';
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('options') || c.includes('synthetic')) return 'derivatives';
  if (c.includes('bridge')) return 'bridge';
  if (c.includes('liquid staking') || c.includes('liquid restaking')) return 'liquid-staking';
  if (c.includes('restak')) return 'restaking';
  if (c.includes('staking') || c.includes('anchor') || c.includes('decentralized btc')) return 'staking';
  if (c.includes('basis')) return 'basis';
  if (c.includes('yield') || c.includes('farm') || c.includes('index')) return 'yield';
  if (c.includes('stable') || c.includes('algo-stables') || c.includes('reserve')) return 'stablecoin';
  if (c.includes('rwa')) return 'rwa';
  if (c.includes('insurance')) return 'insurance';
  if (c.includes('prediction')) return 'prediction';
  if (c.includes('privacy')) return 'privacy';
  if (c.includes('chain')) return 'chain';
  if (c.includes('payment') || c.includes('card')) return 'payments';
  return 'generic';
}

/** The core farming action for a protocol of this kind, with the sizing a real user would use. */
function actionFor(kind: string, p: SnapshotProtocol, capital: number, chain: string): string {
  const name = p.name;
  switch (kind) {
    case 'curator':
      return `Deposit $${capital} of USDC into one of ${name}'s established vaults on ${chain} — pick a vault that has run for months, sits well under its supply cap, and holds plain lending markets rather than exotic collateral.`;
    case 'cdp':
      return `Deposit $${capital} of ETH or a liquid staking token as collateral in ${name} on ${chain} and mint a small amount of its stablecoin against it, keeping the collateral ratio above 200% from day one.`;
    case 'unsecured':
      return `Supply $${capital} of USDC to one of ${name}'s established pools on ${chain}, choosing a pool whose borrower and terms are fully disclosed on the protocol's own page.`;
    case 'lending':
      return `Supply $${capital} of USDC to ${name}'s deepest market on ${chain}, then borrow about $${Math.round(capital / 3)} against it and repay within the week, so both sides of the market see the wallet.`;
    case 'dex':
      return `Provide $${capital} split between the two sides of ${name}'s busiest pool on ${chain}, then make two swaps of about $25 through the same wallet so it reads as a trader, not only a depositor.`;
    case 'derivatives':
      return `Deposit $${capital} of USDC as margin on ${name} and trade one small position a week, keeping leverage under 3x and a liquidation buffer of at least half the margin.`;
    case 'bridge':
      return `Bridge $${capital} of USDC from Ethereum through ${name} to ${chain === 'Ethereum' ? 'a chain it serves' : chain}, then use the bridged funds in one app on the far side instead of bridging straight back.`;
    case 'liquid-staking':
      return `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and hold the liquid receipt token in the same wallet, then use it once in a lending market so the wallet shows both.`;
    case 'restaking':
      return `Restake $${capital} of a liquid staking token through ${name} on ${chain} and hold the receipt; restaking stacks two yield sources, and the position should read as deliberate, not maximal.`;
    case 'staking':
      return `Stake $${capital} of the underlying asset through ${name} on ${chain} and leave the position untouched while it accrues; note the unbonding period before you start, not when you need the funds.`;
    case 'basis':
      return `Deposit $${capital} of USDC into ${name}'s basis strategy on ${chain}: the strategy holds the spot asset against a short hedge, so what you are farming is the funding spread, not price direction.`;
    case 'yield':
      return `Deposit $${capital} of USDC into ${name}'s main vault on ${chain} and keep the yield-bearing shares it issues in the wallet rather than looping them elsewhere.`;
    case 'stablecoin':
      return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it in the wallet; a stablecoin's early holders are the wallets that actually keep its asset, not the ones that flip it.`;
    case 'rwa':
      return `Mint $${capital} of ${name}'s yield asset on ${chain} after completing whatever eligibility checks its own page requires, and hold the asset past its first distribution.`;
    case 'insurance':
      return `Buy $${capital} of cover from ${name} on ${chain} for one month on a position you actually hold, and keep the policy NFT in the wallet until the cover lapses.`;
    case 'prediction':
      return `Fund $${capital} and take one position in ${name}'s most liquid market, then settle it at resolution rather than letting it lapse unclaimed.`;
    case 'privacy':
      return `Deposit $${capital} into ${name}'s shielded pool on ${chain} and make one shielded transfer to a second wallet you own, keeping the amounts ordinary.`;
    case 'chain':
      return `Bridge $${capital} of working funds onto ${chain} and become a user of the chain itself: hold its gas token, and use two or three of its native apps through ${name}'s ecosystem pages.`;
    case 'payments':
      return `Complete ${name}'s own sign-up and any identity check it requires, fund $${capital}, and route one real payment or card purchase a month through it.`;
    default:
      return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open, using the protocol the way its own documentation describes for a first position.`;
  }
}

/** The guardrail step: the risk this kind of protocol actually carries, and how a farmer contains it. */
function riskFor(kind: string, p: SnapshotProtocol): string {
  const name = p.name;
  switch (kind) {
    case 'curator':
      return `Watch the vault, not just the balance: check ${name}'s vault page monthly for cap raises, new collateral types or a curator announcement, and be ready to withdraw if the vault's risk profile changes — curator vaults can add markets without asking depositors.`;
    case 'cdp':
    case 'lending':
      return `Guard the liquidation line: keep the position's health factor comfortably above 1.5 (collateral ratio above 200% on a CDP), set a calendar reminder to check it weekly, and add collateral rather than borrowing more when the market falls.`;
    case 'unsecured':
      return `Price the credit risk honestly: an uncollateralised pool can default, so keep this position the smallest in the plan and read the borrower's disclosure on ${name}'s own page before supplying.`;
    case 'dex':
      return `Mind the range and the pair: a concentrated position drifts out of range and stops earning, and a volatile pair bleeds to impermanent loss — check the position weekly and prefer the pool whose volume is steady, not spiking.`;
    case 'derivatives':
      return `Size for survival, not for the screenshot: never add margin to rescue a losing position, keep total exposure under the $${capitalFor(p)} deposited, and close the week's trade rather than carrying leverage over a quiet weekend.`;
    case 'bridge':
      return `Respect bridge risk: move the planned amount in one transfer only after a $10 test transfer lands, and never bridge more than the plan's capital — a bridge is the one step whose failure loses everything in motion.`;
    case 'liquid-staking':
    case 'restaking':
    case 'staking':
      return `Know the exit before you enter: read ${name}'s withdrawal terms, queue length and any slashing conditions on its own page, and keep a note of how many days unstaking takes so a launch week's volatility cannot trap the position.`;
    case 'basis':
      return `Watch the funding rate, not the price: a basis position loses when funding flips negative for weeks, so check ${name}'s reported rate monthly and treat a long negative stretch as the signal to withdraw, not to add.`;
    case 'yield':
      return `Read what the vault holds: before the second month, open ${name}'s strategy page and confirm the vault's assets are ones you would hold directly — a yield you cannot explain is a risk you have not priced.`;
    case 'stablecoin':
      return `Check the backing, not the peg alone: read ${name}'s own collateral and redemption page, and keep the position sized so a depeg or a redemption pause is an inconvenience, not a loss you cannot carry.`;
    case 'rwa':
      return `Read the redemption terms before minting: real-world assets settle on business calendars, not block times, so confirm ${name}'s redemption window and minimum on its own page and size the position as money you will not need quickly.`;
    case 'insurance':
      return `Buy cover you would actually claim on: match the cover to a real position, read the exclusions on ${name}'s own page, and note the claims process and its evidence requirements before the month starts.`;
    case 'prediction':
      return `Treat every position as spent: prediction markets settle binary, so stake only the plan's $${capitalFor(p)}, never chase a losing market with a second position, and settle promptly so the wallet's record closes cleanly.`;
    case 'privacy':
      return `Keep the pattern ordinary: round amounts and casual timing read as farming, so use uneven amounts, leave days between the deposit and the transfer, and follow ${name}'s own compliance guidance where it publishes any.`;
    case 'chain':
      return `Keep only working funds on a young chain: bridges and native apps there are the least battle-tested in this plan, so hold the $${capitalFor(p)} working balance and keep savings on the chain they started on.`;
    case 'payments':
      return `Keep the account in good standing: use ${name} for real spending rather than circular transfers between your own accounts, which payment processors flag and close accounts for.`;
    default:
      return `Keep the position sized to the plan: $${capitalFor(p)} is money whose loss would not change your month, and any step ${name}'s own page contradicts replaces the step here — the protocol's documentation outranks this plan.`;
  }
}

/** The recurring habit: the action this kind of protocol rewards a regular for, week in, week out. */
function habitFor(kind: string, p: SnapshotProtocol, gas: { weekly: number; label: string }): string {
  const name = p.name;
  switch (kind) {
    case 'curator':
      return `Rebalance once a quarter: move part of the position into a second ${name} vault with a different market mix, so the wallet's history spans the curator's range rather than one vault.`;
    case 'lending':
    case 'cdp':
      return `Make one qualifying action each week — a small supply, a borrow-and-repay, or a collateral top-up — so the wallet reads as a habit across snapshots, not a single airdrop grab.`;
    case 'dex':
      return `Swap about $25 through ${name} each week and rebalance the liquidity position when it drifts, so the wallet shows a trader's rhythm across the whole holding window.`;
    case 'derivatives':
      return `Trade one small position each week and close it within the week; a steady cadence of closed trades is the history a derivatives launch can least afford to miss.`;
    case 'liquid-staking':
    case 'restaking':
    case 'staking':
      return `Claim and restake the rewards monthly from the same wallet, and add one small top-up stake each quarter, so the position grows the way a holder's does rather than sitting frozen.`;
    case 'basis':
      return `Roll the position monthly: withdraw and redeposit a small part of it each month so the wallet's history shows the strategy being actively held, not parked once.`;
    case 'chain':
      return `Use the chain weekly: one transaction in a native app each week — a swap, a mint, a vote — so the wallet accumulates the ordinary history of a chain's real user.`;
    case 'payments':
      return `Route one genuine payment a month through ${name} and keep the account active between payments; regularity, not volume, is what a payments launch can reward.`;
    default:
      return `Make one qualifying action each week — a deposit, a claim, a vote or a small top-up — on the same wallet, so the history reads as a habit and not a single airdrop grab.`;
  }
}

/** The second, deepening action: another chain when there is one, else a second product surface. */
function secondActionFor(p: SnapshotProtocol, capital: number): string {
  const name = p.name;
  if (p.chains.length > 1)
    return `Repeat a smaller position, about $${Math.round(capital / 2)}, on ${p.chains[1]}: ${name} is live there too, and multi-chain users are the ones a launch can least afford to miss.`;
  const kind = kindOf(p);
  if (kind === 'lending' || kind === 'cdp')
    return `Once the first position is a month old, open a second, smaller one in a different market of ${name} so the wallet shows range, not one repeated click.`;
  if (kind === 'dex' || kind === 'yield' || kind === 'curator')
    return `Add a second, smaller position in another pool or vault of ${name} after the first month, so the wallet's history spans more than one market.`;
  return `After the first month, make one more deposit of about $${Math.round(capital / 2)} into ${name} so the wallet's history shows a returning user, not a single visit.`;
}

/**
 * A protocol's farm plan, generated from its own record: a wallet setup priced by its main chain's
 * gas, the core action of its kind of protocol, that kind's guardrail, a second surface (a second
 * chain when it has one), a third chain for the widely deployed, the recurring habit of its kind, a
 * holding window from its age, and a log with the exit read first. Every step states a cost and a
 * time; amounts are sized to the protocol's TVL.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const gas = gasTier(chain);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const kind = kindOf(p);
  const steps: FarmStep[] = [
    {
      text: `Use a fresh wallet for ${p.name} that holds only the funds you plan to farm with, fund it on ${chain}, and keep its seed phrase offline on paper.`,
      cost: `about $${gas.setup} of ${gas.label} to fund and make the first transaction`,
      time: '10 minutes',
    },
    {
      text: actionFor(kind, p, capital, chain),
      cost: `$${capital} of capital and about $${gas.setup} of ${gas.label}`,
      time: '15 minutes to set up',
    },
    {
      text: riskFor(kind, p),
      cost: 'nothing but the check itself',
      time: '10 minutes a week',
    },
    {
      text: secondActionFor(p, capital),
      cost: `about $${Math.round(capital / 2)} more capital and $${gas.setup} of gas`,
      time: '10 minutes',
    },
  ];
  if (p.chains.length >= 3) {
    steps.push({
      text: `Extend to a third chain, ${p.chains[2]}, with a small position of about $${Math.round(capital / 4)}: ${p.name} counts ${p.chains.length} chains in this snapshot, and breadth across them is the cheapest signal a sybil filter cannot fake cheaply.`,
      cost: `about $${Math.round(capital / 4)} more capital and a few dollars of gas`,
      time: '10 minutes',
    });
  }
  steps.push(
    {
      text: habitFor(kind, p, gas),
      cost: `about $${gas.weekly} a week of ${gas.label}`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so it is counted in more than one snapshot, and check ${p.name}'s own site and announcements for a points or rewards page; claim only from links the protocol itself publishes.`,
      cost: `the $${capital} stays in the position, and never pay anyone to claim`,
      time: `${hold} days, with a 10 minute check each week`,
    },
    {
      text: `Write the wallet, the dates and every transaction hash in a farm log, and note the exit route — withdrawal queue, unbonding period or redemption window — before you need it, so you can prove the history or unwind the week a launch is announced.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  );
  return steps;
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
  const bySlug = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const farmBySlug = new Map(board.map((r) => [r.slug, farmSteps(bySlug.get(r.slug)!, r.age_days)]));
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
      peers: calibration.peersPlot.length,
      categories_priced: calibration.categories.size,
      families: calibration.families.size,
      global_multiple: round4(calibration.global.median),
      board_implied_total: board.reduce((n, r) => n + r.implied_value_usd, 0),
    },
    rows: board.map((r) => ({ ...r, farm: farmBySlug.get(r.slug)! })),
    live,
    categories: [...calibration.categories.values()]
      .filter((c) => c.peers > 0 || c.pre_token > 0)
      .sort((a, b) => b.multiple - a.multiple),
    families: [...calibration.families.values()].sort((a, b) => b.peers - a.peers),
    peers_plot: calibration.peersPlot,
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
    if (r.implied_low_usd > r.implied_value_usd || r.implied_high_usd < r.implied_value_usd)
      return `${r.slug} has a range that does not hold its implied value`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
