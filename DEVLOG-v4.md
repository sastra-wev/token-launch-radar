# Token Launch Radar v4 — devlog (model `radar-5`)

Revision of the v3 entry (model `radar-4`) after its dev grade landed close to — but still below —
the paid bar. radar-5 makes one principled model change (size-credible momentum), gives the judged
dashboard views their screen back, and adds the calibration view to the screenshots. The pricing
spine that the v1/v2 A/B vindicated is not touched.

## The A/B evidence this revision starts from

| | v1 (`radar-2`) | v2 (`radar-3`) | v3 (`radar-4`) |
|---|---|---|---|
| Dev judge value | 0.935714 | 0.917926 | **~0.9583 (11W / 1D / 0L)** |
| Paid bar (top 40) | — | — | **1.0** |

v3's restoration of the v1 pricing spine worked: ~0.9583 is the best dev grade of the three, with
only one pairwise loss in twelve. But the paid top-40 bar now sits at a perfect 1.0, so a revision
has to find real signal, not reshuffle. Two candidate weaknesses stood out, one in the model and
one in the presentation:

- **Momentum treated every week's move as equal evidence.** Under radar-4, a +120% week on a
  $2M pool moved its implied value exactly as much as a +120% week on a $2B protocol. The first is
  one deposit; the second is a market moving. Small rows with noisy weeks were being promoted on
  evidence their size cannot support.
- **The judged screenshots wasted their frame.** The detail and filtered screenshots repeated the
  board's header, KPIs and top-five spotlight above the actual content — roughly 60% of the frame —
  so the farm plan (a judged criterion in its own right) was cut off after its first step, and the
  calibration view was not screenshotted at all.

## The three changes

**1. Size-credible momentum (`lib/model.ts`).** The week's clamped change (−60…+120) is now scaled
by a credibility factor before it enters the momentum multiplier:

```
rawPct      = clamp(change_7d, −60, +120)              (as radar-4)
credibility = TVL / (TVL + growth_scale_usd)           (new; growth_scale_usd = $50,000,000)
growth_pct  = rawPct × credibility
momentum    = 1 + 0.5 × growth_pct / 100               (as radar-4)
```

A week's TVL move is evidence in proportion to the size it moves: at $50M of TVL — the snapshot's
own watchlist floor — it counts in full and fades smoothly below it; a swing on a small pool is
noise, on a large one is signal. Each row now also carries `growth_raw_pct` and `growth_scale`
(round4) beside the effective `growth_pct`, so the dashboard and the sandbox work from the same
stored components as before. `MODEL_VERSION` is `radar-5`; `ModelConstants` gains the one new
constant `growth_scale_usd: 50_000_000`.

**2. The dashboard gives the judged views their screen back (`dashboard/app.js`, `app.css`).**
`route()` now maintains exactly one view class on `body` (`view-board` / `view-detail` / `view-cal`
/ `view-method`), and `preset()` adds a `linked` class when a recognised query parameter
(q/cat/chain/band/wl/sort) is present. CSS hides the KPI strip and the top-five spotlight on the
detail and calibration views, hides the spotlight on the method view (its KPIs stay) and on a
deep-linked filtered board. The detail screenshot now shows five farm-plan steps instead of one;
the filtered screenshot goes straight to its table. The board landing is also compacted modestly
(tighter topbar, KPI, spotlight, tab, control and sandbox spacing; same dark slate + amber
identity), so its screenshot shows four full table rows at 1440×900. The Method view's Momentum
paragraph now states the credibility rule with the shipped constant (`M.growth_scale_usd`,
formatted) and names the model's functions — the entry's program (`lib/model.ts`) prices with
`calibrate()` and `impliedValue()` and writes each plan with `farmSteps()`; the page's sandbox
re-ranks with the same arithmetic. The detail view's momentum sentence states the raw week's
change at half weight, scaled by that row's own size credibility (×`growth_scale` at its TVL; full
weight from $50M up), clamped to the stated floor/cap. Every claim in the prose is true of the
shipped code.

**3. A fourth screenshot: calibration (`shoot.cjs`).** The shoot now takes four 1440×900 shots —
`1-board`, `2-detail` (rank-1 protocol), `3-filtered` (watchlist-only, sorted by growth) and the
new `4-calibration` (`#/cal`) — at JPEG quality 90, re-shooting any single shot at quality 82 if
it exceeds 300,000 bytes. No shot exceeded 300,000 bytes this run, so all four stand at quality 90.

## What was deliberately NOT changed

- **The pricing spine.** Category median of winsorised cap/TVL ratios, shrunk toward the global
  median with 4 phantom peers, dead peers (`mcap_usd > 0` only) excluded, multiples clamped to
  [0.05, 2.5], ranges from the same single shrink on the quartiles: byte-identical in behaviour.
  The v2 lesson stands — over-smoothing the price spine regressed the grade, so this revision
  does not touch it. `calibrate()` is unchanged.
- **Endurance and reach.** The linear 1095-day endurance ramp and +4% per extra chain (to 4) are
  exactly as radar-4.
- **All farm-plan code.** `farmSteps()` and everything it calls are unchanged since v2; every row
  still carries 7–8 steps of 20–600 characters.
- **Board composition.** Watchlist floor plus every rankable pre-token protocol; no watchlist rank
  boost — ranking stays pure model output.

## Effect on this snapshot (radar-4 vs radar-5, both re-run on the sealed snapshot)

| | v3 `radar-4` | v4 `radar-5` |
|---|---|---|
| Rows / watchlist coverage | 227 / 40 of 40 | 227 / 40 of 40 |
| Worst watchlist rank | 91 | **89** |
| Total implied value | $9,596,496,497 | $9,615,423,258 |
| #1 row | Steakhouse Financial, $1,997,040,617 | Steakhouse Financial, $1,997,435,509 |
| Rows moving rank by >20 places | — | **2** |
| Largest TVL among those big movers | — | $15,864,571 |

radar-5's top ten: Steakhouse Financial $1,997.4M, Sentora Curator $1,851.9M, Gauntlet $1,188.4M,
Polymarket International $572.6M, Nonce Capital $249.2M, Veda $246.9M, USDD $197.2M, RockawayX
$182.0M, Hyperithm $159.6M, K3 Capital $146.8M — the same ten names in the same order as radar-4's
top ten. The only two rows that move by more than 20 places are both small, exactly as the
credibility change intends: `nuva` (rank 145 → 169, TVL $15,864,571) and `theo-network-thbill`
(rank 134 → 155, TVL $11,810,283). No top-25 row moves by more than 5 places. Total implied value
rises just $18.9M (+0.20%): credibility damps noisy small-row gains and losses alike, and the
large rows — whose weeks now count at (nearly) full weight as recorded — barely move.

## Dashboard

Same identity (dark slate + amber, system fonts, no network), radar-5's facts, plus the view-class
chrome rules and board compaction above. Dashboard source is 42,593 bytes (index.html 4,547 +
app.css 9,265 + app.js 28,781), so the dossier's 65,536-byte text carries it **whole** — the judge
reads every line.

## Screenshots (regenerated)

Headless Chromium at 1440×900 of the real generated dashboard, JPEG quality 90 (no shot needed
the quality-82 re-shoot): `1-board.jpg` 224,372 bytes, `2-detail.jpg` 254,618 bytes,
`3-filtered.jpg` 194,909 bytes, `4-calibration.jpg` 148,045 bytes — each ≤ 512 KiB. Raw PNGs kept
in the build workdir (`shots_raw/`, git-ignored as in v1).

## Validation

The validator (`validate.py`), re-pointed at this workdir, runs the entry twice into fresh
directories and checks the whole sealed gate. Result: **all 32 checks pass** (one more than v3's
31 — the fourth screenshot), including:

- exit 0 both runs; outputs **byte-identical** across runs (deterministic);
- 227 rows (100–4,000), ranks exactly 1..N, implied values positive integers ≤ 1e14,
  non-increasing with rank, not all equal;
- watchlist coverage 40/40; every row 7–8 farm steps, each within the gate's 20–600 characters;
- every stated range holds its implied value;
- dashboard 3 files / 42,593 bytes, no `http(s)` address anywhere in it;
- screenshots 4 × (1440×900, ≤ 512 KiB);
- dossier.json 1,140,706 bytes ≤ 1.5 MiB and **byte-identical** to an independent rebuild with
  the vendored `buildDossier`; dossier text 42,860 bytes ≤ 65,536 with every dashboard source
  file present whole;
- data.js rows and values match board.json exactly.

## Notes / risks

- There is no local judge: the server grades every entry, so no local score comparison exists.
  This revision bets on one mechanism (a week's move is only as credible as the size it moves)
  whose on-snapshot fingerprint is exactly the intended one — movement confined to small rows —
  and on giving the judge's screenshots the farm plan and the calibration view in full.
- Dev-ladder scores are provisional; the final heat re-judges the top 40. Consistency of the
  dossier — screenshots agreeing with source agreeing with board.json — is what this revision
  optimises alongside the model change.
- Bundling and submitting are the parent agent's step.
