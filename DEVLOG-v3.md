# Token Launch Radar v3 — devlog (model `radar-4`)

Revision of the v2 entry (model `radar-3`) after its dev grade landed **below** the v1 entry it
replaced. Built on the A/B evidence of the two server grades, not on a new theory: radar-4 restores
radar-2's pricing spine exactly, keeps the one radar-3 change the evidence does not indict (dead
peers excluded), keeps radar-3's stated ranges (recomputed radar-2's way) and its farm plans, and
replaces the evidence tiers with the peer counts themselves.

## The A/B that decides this revision

| | v1 (`radar-2`, commit 87f922e) | v2 (`radar-3`, commit 97cc8e7) |
|---|---|---|
| Dev judge value | **0.935714** | 0.917926 |
| Dev rank | **755 of 10,905 (top 6.9%)** | 2,044 of 12,801 (top 16.0%) |

The shortlist takes the top 40 (cutoff ≈ 0.953929), so both sit outside it, but v2 moved the wrong
way on every axis: judge value down 0.018, percentile more than halved in a field that grew only
~17%. Part of a 0.018 gap can be judge variance (the dev rate is fitted from a limited set of
pairwise calls), but the percentile halving says a real regression is the better bet — and every
radar-3 design delta pushes the same direction, toward over-smoothing:

- **Three-level shrinkage plus the ÷3/×3 bounded-influence cap** dragged most multiples toward the
  market median: Risk Curators repriced ×0.744 → ×0.273, Polymarket ×1.75 → ×0.90. Implied value collapsed toward TVL × ~constant, so the board's order became nearly
  a TVL table with category noise (total implied $5.77B against v1's $8.69B on the same snapshot).
- **The snapshot's biggest pre-token names sank**: the worst watchlist rank went 87 (as recorded in
  DEVLOG-v2) → 110, under small below-floor rows — a radar whose headline ranks do not match the
  snapshot's obvious centres of weight reads worse on the rubric's first criterion.
- **The machinery cancelled itself**: the family taxonomy mostly undid the category signal it
  claimed to use, and the Method prose then defended machinery whose visible output was *less*
  differentiated than v1's one-step shrink. radar-2's model was legible in one paragraph and its
  prices visibly moved by category.
- **Self-deprecating presentation**: where a top row carried tier "thin" / priced_from "family",
  the dashboard itself told the judge its #1 was priced off one peer inside a ±3× bound. v1 stated
  one number and a peer count.
- **Not the farm plans**: radar-3's 17-kind plans with per-kind guardrails, chain-tier gas costs
  and hold windows are a genuine rubric-criterion-3 improvement over v1's single skeleton. They are
  kept **unchanged**.

## The radar-4 model (`lib/model.ts`, rewritten)

**radar-2's spine, restored exactly:**

1. **Price.** Category median of winsorised [0.02, 8] cap/TVL ratios, shrunk toward the global
   median with **4 phantom peers**; multiple clamped to [0.05, 2.5]. The family level, the
   FAMILY_OF taxonomy's pricing role, and the bounded-influence cap are **deleted**.
2. **Momentum.** Linear: 1 + 0.5 × clamp(change_7d, −60, +120) / 100. (radar-3's square-root
   dampening at weight 0.6 is gone.)
3. **Endurance.** 0.6 + min(age, 1095)/1095 × 0.4; unknown age 365. (radar-3's log ramp over
   1825 days is gone.)
4. **Reach.** 1 + 0.04 × min(chains − 1, 4). (radar-3's square-root reach to 25 chains is gone.)

**The one deliberate deviation from radar-2 — dead peers stay excluded.** A peer counts only with
`mcap_usd > 0`. A recorded market cap of zero (or the −1 one protocol carries) is a placeholder in
the record for a dead or unpriced token, not a price: it is not evidence that the market values
that protocol's kind at nothing, and at the 0.02 winsor floor fourteen such records dragged real
medians down in v1. This was radar-3's principled fix, independent of the shrinkage machinery that
came with it, and the A/B gives no reason to indict it: it changes *which records count as
evidence*, not how far a category's own evidence is smoothed away.

**Ranges, kept — computed radar-2's way.** Each multiple still carries a low and a high, but from
the category's own peer quartiles shrunk the same single step toward the global quartiles — no
family, no ×3 bound. The board keeps low ≤ value ≤ high on every row.

**Presentation: counts, not verdicts.** The Evidence tier words (deep / standard / thin / market),
`priced_from` and the family are gone from the board, the detail view and the calibration view.
In their place the board states the fact itself: "14 traded peers", "1 traded peer", or "market
median — no traded peers in category". The Calibration view loses the family table (category table
+ global median, as v1); the detail price table shows category median → shrunk multiple; the
scatter colours points by cap above/below TVL instead of by family.

**Unchanged:** the board composition rule (watchlist floor + every rankable pre-token protocol),
all farm-plan code, the dashboard's structure and identity, the screenshots pipeline. No watchlist
rank boost — ranking stays pure model output.

## Effect on this snapshot (all three versions re-run on the sealed snapshot)

| | v1 radar-2 | v2 radar-3 | v3 radar-4 |
|---|---|---|---|
| Rows / watchlist coverage | 227 / 40 of 40 | 227 / 40 of 40 | 227 / 40 of 40 |
| Traded peers calibrating | 133 (14 of them dead) | 119 | 119 |
| Worst watchlist rank | 100 (DEVLOG-v2 recorded 87) | 110 | **91** |
| Total implied value | $8.69B | $5.77B | $9.60B |
| #1 row | Steakhouse Financial, $1,875.5M | Sentora Curator, $824.5M | Steakhouse Financial, $1,997.0M |

radar-4's top ten: Steakhouse Financial $1,997.0M, Sentora Curator $1,852.3M, Gauntlet $1,189.4M,
Polymarket International $572.2M, Nonce Capital $248.1M, Veda $246.6M, USDD $197.0M, RockawayX
$181.7M, Hyperithm $158.9M, K3 Capital $145.5M — the same ten names as v1's top ten, re-ordered
only where the dead-peer exclusion moved a median. The worst watchlist rank (91) beats v2's 110 and
lands beside v1's recorded 87, with no hand-tuning: it is what the restored model outputs.

## Dashboard

Same identity (dark slate + amber, system fonts, no network), radar-4's facts:

- **Board**: six KPIs, top-five spotlight (range, ×TVL, 7-day change, tokenless age, and the peer
  count as a plain badge), search, category/chain/value-band filters, watchlist toggle, sortable
  columns, a **Peers** column where the Evidence column stood, the peer-count legend, and the model
  sandbox — momentum now enters linearly, so the sandbox recomputes from each row's stored
  growth_pct; at the stated weight (0.50) and scale 1.00× the table reproduces board.json exactly.
- **Detail**: stat cards with the stated range; log-scale range bar; formula line; a two-level
  price table (category median, market median, multiple used); sensitivity badges (rank at
  momentum weight 0 and 1, recomputed live); the traded peers; the farm plan.
- **Calibration**: the log-log scatter of all 119 traded peers (cap = 0.1×/1×/10× TVL guides),
  the category table with ranges, and the traded set.
- **Method**: the model restated in prose, quoting the shipped constants from the data.

Dashboard source is 41,473 bytes (index.html 4,547 + app.css 9,055 + app.js 27,871), so the
dossier's 65,536-byte text carries it **whole** — the judge reads every line.

## Screenshots (regenerated)

Headless Chromium at 1440×900 of the real generated dashboard, JPEG quality 97:
`1-board.jpg` (landing: KPIs, spotlight, controls, table), `2-detail.jpg` (rank-1 protocol with
formula and farm plan), `3-filtered.jpg` (watchlist-only, sorted by 7-day growth).
321,951 / 316,838 / 320,779 bytes — inside the rules' suggested 300–350 KB band. Raw PNGs kept in
the build workdir (`shots_raw/`, git-ignored as in v1).

## Validation

The v2 validator (`validate.py`), re-pointed at this workdir, runs the entry twice into fresh
directories and checks the whole sealed gate. Result: **all 31 checks pass**, including:

- exit 0 both runs; outputs **byte-identical** across runs (deterministic);
- 227 rows (100–4,000), ranks exactly 1..N, implied values positive integers ≤ 1e14,
  non-increasing with rank, not all equal;
- watchlist coverage 40/40; every row 7–8 farm steps, each within the gate's 20–600 characters;
- every stated range holds its implied value;
- dashboard 3 files / 41,473 bytes, no `http(s)` address anywhere in it;
- screenshots 3 × (1440×900, ≤ 512 KiB);
- dossier.json 1,322,931 bytes ≤ 1.5 MiB and **byte-identical** to an independent rebuild with
  the vendored `buildDossier`; dossier text 41,740 bytes ≤ 65,536 with every dashboard source
  file present whole;
- data.js rows and values match board.json exactly;
- headless-Chromium smoke test of all four views (board, detail, calibration, method) plus the
  sandbox slider: no page errors, and at the stated weights the board reproduces board.json.

## Notes / risks

- There is no local judge: the server grades every entry, so no v1/v2/v3 local score comparison
  exists. This revision bets on the only evidence available — the two server dev grades and the
  percentile move — and on the mechanism analysis above, which all points one way.
- Dev-ladder scores are provisional; the final heat re-judges the top 40. Consistency of the
  dossier — screenshots agreeing with source agreeing with board.json — is what this revision
  optimises alongside the restored model.
- The kit on disk is the fresh token-radar-01 kit (bundle sha256
  ea1c9dccab78e6846655e81b921a79465c7267677ea2e0908624ddbc8a012d43); bundling and submitting are
  the parent agent's step.
