# Token Launch Radar v2 — devlog (model `radar-3`)

Revision of the v1 entry (model `radar-2`, dev rank 755 of 10,905, judge value 935,714; shortlist
cutoff at rank 40 was 953,098). Built against the judge's published rubric, in order: a working
radar whose screenshots and code agree; a value model derived from the snapshot's own figures with
traded and pre-token protocols separated; concrete farm plans with costs and times; a
sortable/filterable, readable dashboard; and a made, consistent look.

## What was wrong with v1

- **One peer could carry a whole category's price.** Risk Curators had exactly one traded peer —
  Api3, an oracle — whose 2.975 cap/TVL ratio set the multiple for all 34 pre-token curators and put
  five of them in the top six, up to $1.88B. Prediction Market's only peer (Rain, raw ratio 400×,
  winsorised to 8) priced Polymarket International at $557M. A judge reading the calibration view
  could see the top of the board rested on single, off-kind prints.
- **Dead tokens counted as price evidence.** 14 calibration "peers" carry a recorded market cap of
  0 (one carries −1): DefiLlama placeholders for dead or unpriced tokens (Multichain, Autofarm, …).
  They entered every pool at the 0.02 winsor floor and dragged medians down.
- **No uncertainty anywhere.** Point values only; nothing said how much evidence backed a row.
- **Farm plans were one shape.** Same step skeleton for a lending market and a bridge; costs named
  a chain tier only in the first step.

## The radar-3 model (`lib/model.ts`, rewritten)

Prices are read at **three levels**, all from the snapshot, nothing hand-kept but a stated
category→family taxonomy (categories only, never protocol names):

1. **Peers.** A traded protocol counts only with TVL > 0 and a *positive* market cap (zero is no
   price at all); exchanges are set aside. Ratios are winsorised to [0.02, 8].
2. **Levels.** Category median → family pooled median (nine economic families: Credit, Spot
   exchange, Derivatives, Capital management, Staking, Bridging, Money, Networks & services, plus
   RWA standing alone) → global median (×0.186 over 119 peers).
3. **Shrinkage.** Each level is pulled toward the one above by peer count — category toward family
   with 6 phantom peers, family toward market with 12 — and a category's own median/quartiles are
   trusted only within **[above ÷ 3, above × 3]** of the level above (bounded influence). One wild
   peer can now move a thin category's price by at most that factor, never set it.
4. **Range.** The same chain run on the peers' quartiles gives every multiple a low and a high;
   every row states `implied_low_usd … implied_high_usd` and the board keeps low ≤ value ≤ high.
5. **Adjustments.** Momentum is dampened (signed square root of the 7-day change, weight 0.6) so
   one hot week cannot dominate; endurance is a log ramp over tokenless age; reach adds 9% per
   extra chain on a square-root scale. Multiples clamp to [0.05, 2.5].

Each row records how it was priced: `priced_from` (category / family / market), an **evidence
tier** (deep ≥ 8 peers, standard 3–7, thin 1–2, market 0), the family, and the multiple's range.

Effect on this snapshot: Risk Curators price at ×0.273 [thin, 1 peer, family-bounded] instead of
×0.744; the top of the board is Sentora Curator $824.5M, Steakhouse Financial $774.2M, Gauntlet
$573.8M, Polymarket International $286.7M (×0.90 [was ×1.75]); total implied $5.77B over 227 rows;
worst watchlist rank 110 (was 87 — the watchlist's thin categories are now priced more honestly,
and every watchlist row still ranks).

## Farm plans (rewritten)

7 steps per row (8 for protocols on 3+ chains), generated from the protocol's kind — about 17
kinds (curator, CDP, unsecured lending, lending, DEX, derivatives, bridge, liquid staking,
restaking, staking, basis, yield, stablecoin, RWA, insurance, prediction, privacy, chain,
payments, generic) each with its own core action and its own guardrail (depeg checks for
stablecoins, slashing terms for restaking, bridge-hack history for bridges, oracle design for
prediction markets, …). Wallet setup and weekly costs are priced by the protocol's own first-chain
gas tier (Ethereum $18/$6, Bitcoin $5/$2, other chains $3/$1); position size scales with TVL
($50–$250); hold windows scale with tokenless age (30/45/60 days); every plan ends with keeping a
farm log whose first entry is the exit route read before depositing.

## Dashboard (rewritten)

Same identity (dark slate + amber, system fonts, no network), much denser:

- **Board**: six KPIs, a "Top of the board" spotlight (top 5 with range, ×TVL, 7-day change,
  tokenless age, evidence tier), search, category/chain/**value-band** filters, watchlist toggle,
  sortable columns (click headers or the select), an Evidence column, and the model sandbox —
  at the stated weights the table reproduces board.json exactly.
- **Detail**: stat cards including the stated range; a log-scale range bar; the formula line; a
  **three-level price table** (category's raw median, family estimate, market median, multiple
  used) with a plain note when bounded influence capped the category; **sensitivity badges** —
  the row's rank at momentum weight 0 and 1, recomputed live; the traded peers; the farm plan.
- **Calibration**: an inline-SVG log-log scatter of all 119 traded peers (TVL vs market cap,
  family colours, cap = 0.1×/1×/10× TVL guides), family and category tables with ranges and
  tiers, and the traded set.
- **Method**: the whole model restated in prose, quoting the shipped constants from the data, so
  the text and the code cannot drift apart.

Dashboard source is 43,235 bytes (index.html 4,550 + app.css 9,056 + app.js 29,629), so the
dossier's 65,536-byte text carries it **whole** — the judge reads every line.

## Screenshots (regenerated)

Headless Chromium at 1440×900 of the real generated dashboard, JPEG quality 97:
`1-board.jpg` (landing: KPIs, spotlight, controls, table), `2-detail.jpg` (rank-1 protocol with
formula and farm plan), `3-filtered.jpg` (watchlist-only, sorted by 7-day growth). 307,671 /
311,443 / 308,471 bytes — inside the rules' suggested 300–350 KB band, long side 1440, short
side 900. Raw PNGs kept in `shots_raw/` (git-ignored, as in v1).

## Validation

`~/workspace/makefun/token-radar-v2-work/validate.py` runs the entry twice into fresh
directories and checks the whole sealed gate. Result: **all 30 checks pass**, including:

- exit 0 both runs; outputs **byte-identical** across runs (deterministic);
- 227 rows (100–4,000), ranks exactly 1..N, implied values positive integers ≤ 1e14,
  non-increasing with rank, not all equal;
- watchlist coverage 40/40; every row 7–8 farm steps, each 197–355 chars trimmed (gate 20–600);
- every stated range holds its implied value;
- dashboard 3 files / 43,235 bytes, no `http(s)` address anywhere in it;
- screenshots 3 × (1440×900, ≤ 512 KiB);
- dossier.json 1,282,104 bytes ≤ 1.5 MiB and **byte-identical** to an independent rebuild with
  the vendored `buildDossier`; dossier text 43,502 bytes ≤ 65,536 with every dashboard source
  file present whole;
- data.js rows and values match board.json exactly.

## Notes / risks

- Dev-ladder scores are provisional (the FPS-02 entry's dev grade moved a lot in its final
  heat); the final heat re-judges the top 40 on interval low, so consistency of the dossier —
  screenshots agreeing with source agreeing with board.json — is what this revision optimises.
- The kit on disk is level 12 while the site reports level 19; bundling/submitting is the
  parent agent's step and may want a fresh kit.
