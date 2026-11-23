# Token Launch Radar v5 — devlog (model `radar-6`)

Revision of the v4 entry (model `radar-5`) after its dev grade came back *below* the v3 entry it
was meant to improve. radar-6 makes no model change of its own: it restores radar-4's model
exactly — deleting v4's size-credibility machinery in full — and keeps only v4's presentation
work (the view-class chrome rules, the board compaction, the fourth screenshot). The board the
judge ranks is byte-for-byte v3's board; everything that differs from v3 is dossier chrome,
prose and screenshots.

## The A/B record this revision starts from

| | v1 (`radar-2`) | v2 (`radar-3`) | v3 (`radar-4`) | v4 (`radar-5`) |
|---|---|---|---|---|
| Dev judge value | 0.935714 | 0.917926 | **~0.9583 (11W / 1D / 0L)** | ~0.9197 |
| Paid bar (top 40) | — | — | 1.0 | 1.0 |

The pattern across four grades is consistent, and it is the whole basis for this revision:

- **Every model-side complication regressed.** v2's three-level shrinkage machinery took the
  grade from 0.9357 down to 0.9179. v4's size-credibility scaling took it from ~0.9583 down to
  ~0.9197.
- **The only model-side win was a simplification.** v3 deleted v2's machinery and restored the
  v1 pricing spine (with dead peers excluded, stated ranges and peer counts), and the grade rose
  to the best of the four.
- **The one draw in v3's 11W / 1D / 0L is not identified anywhere in the entry's records** — no
  opponent, no reason. This devlog does not invent one; v5 is aimed at the documented weaknesses
  instead of a guessed-at comparison.

## The confound in v4, and how v5 resolves it

v4 changed two variables at once: the model (credibility scaling) and the presentation (chrome
rules, compaction, calibration screenshot). Its presentation changes attacked a named, judged
weakness — v3's screenshots wasted roughly 60% of the frame on repeated header/KPIs/spotlight,
the farm plan was cut off after its first step, and the calibration view was never screenshotted —
so they should have *helped*. Yet the grade fell ~0.039. The most plausible reading is that the
model change, and its defensive Method prose (a model less legible than its output is
differentiated — the exact failure mode DEVLOG-v3 diagnosed in v2), cost more than the
screenshots gained. Judge variance on a 12-game dev fit cannot be excluded, but no evidence
points the other way.

v5 isolates the variables the only way left: keep the presentation, remove the model change
entirely, and let the dev grade compare like with like. Because the board is bit-for-bit v3's,
any grade difference between v5 and v3 is attributable to the presentation layer alone.

## The changes

**1. The credibility machinery is deleted, not kept in part (`lib/model.ts`).** No validation
numbers justify keeping any of it, and the A/B indicts it. Removed: the `growth_scale_usd`
constant from `ModelConstants` and `MODEL`; the `credibility` computation in `impliedValue()`,
so `growth_pct` is once again the week's change clamped to −60…+120 exactly as radar-4 computed
it; and the two stored row fields `growth_raw_pct` / `growth_scale`. The header's momentum rule
is radar-4's sentence again, with a three-line note recording why. `MODEL_VERSION` is `radar-6`.
Measured against v3's commit, `lib/model.ts` now differs only in the version label and that
note — the arithmetic is radar-4's, line for line.

**2. The dashboard prose reverts to radar-4 wording (`dashboard/app.js`).** The Method view's
Momentum paragraph is v3's again (`1 + 0.5 × g / 100`, full stop), and the detail view's momentum
sentence no longer cites a per-row credibility factor. Every claim in the prose is true of the
shipped code, as before.

**3. v4's presentation work is kept whole (`dashboard/app.js`, `app.css`, screenshots).**
`route()`'s single view class on `body`, `preset()`'s `linked` class, the CSS chrome rules that
hide the KPI strip and spotlight on the detail/calibration/method and deep-linked views, the
board compaction, and the four-screenshot set including `4-calibration`. The detail screenshot
shows the farm plan's steps in frame; the calibration view is judged as a screenshot, not just
a page.

**4. Identity updates.** README states model `radar-6` with the credibility clause removed (the
three live make.fun badge images are untouched); `main.ts`'s header line names radar-6.

## What was deliberately NOT changed

- **The model.** Pricing spine, momentum, endurance, reach, calibration, farm plans: radar-4's,
  exactly. No new knob was invented — with no local judge and the v3 draw unidentified, any new
  model tweak would be an untestable bet of the same kind that has now lost twice.
- **Board composition.** Watchlist floor plus every rankable pre-token protocol; ranking stays
  pure model output.

## Effect on this snapshot (v3 `radar-4` vs v5 `radar-6`, both run on the sealed snapshot)

| | v3 `radar-4` | v5 `radar-6` |
|---|---|---|
| Rows / watchlist coverage | 227 / 40 of 40 | 227 / 40 of 40 |
| Worst watchlist rank | 91 | 91 |
| Total implied value | $9,596,496,497 | $9,596,496,497 |
| Top ten | Steakhouse Financial, Sentora Curator, Gauntlet, Polymarket International, Nonce Capital, Veda, USDD, RockawayX, Hyperithm, K3 Capital | identical, same order |
| board.json | md5 `939fcd35609669e06dec6193aea4d482` | md5 `939fcd35609669e06dec6193aea4d482` — **byte-identical** |

The deep comparison is exact, not sampled: every row's rank, implied value, stated range and
stored model components match v3's sealed-snapshot run. (For contrast, v4's board differed:
worst watchlist rank 89, total $9,615,423,258, two rows moved by more than 20 places.)

## Dashboard

Same identity (dark slate + amber, system fonts, no network). Dashboard source is 42,037 bytes
(index.html 4,547 + app.css 9,265 + app.js 28,225 — 556 bytes smaller than v4's, the removed
credibility prose), so the dossier's 65,536-byte text carries it **whole**.

## Screenshots (regenerated)

Headless Chromium at 1440×900 of the real generated dashboard, JPEG quality 90 (no shot needed
the quality-82 re-shoot), no page errors: `1-board.jpg` 224,311 bytes, `2-detail.jpg` 254,686
bytes, `3-filtered.jpg` 194,857 bytes, `4-calibration.jpg` 148,020 bytes — each ≤ 512 KiB. Raw
PNGs kept in the build workdir (`shots_raw/`).

## Validation

The validator (`validate.py`), re-pointed at this workdir, runs the entry twice into fresh
directories and checks the whole sealed gate. Result: **all 32 checks pass**, including:

- exit 0 both runs; outputs **byte-identical** across runs (deterministic);
- 227 rows (100–4,000), ranks exactly 1..N, implied values positive integers ≤ 1e14,
  non-increasing with rank, not all equal;
- watchlist coverage 40/40; every row 7–8 farm steps, each within the gate's 20–600 characters;
- every stated range holds its implied value;
- dashboard 3 files / 42,037 bytes, no `http(s)` address anywhere in it;
- screenshots 4 × (1440×900, ≤ 512 KiB);
- dossier.json 1,140,056 bytes ≤ 1.5 MiB and **byte-identical** to an independent rebuild with
  the vendored `buildDossier`; dossier text 42,304 bytes ≤ 65,536 with every dashboard source
  file present whole;
- data.js rows and values match board.json exactly;
- and the no-regression proof above: the run's board.json is byte-identical to v3's.

## Honest read

v5's expected edge over v3 is real but modest, and presentation-side only: fuller judged
screenshots of the same board. It would be wrong to promise it beats v3's ~0.9583 — the dev
grade is a 12-game fit with variance, and the final heat re-judges afresh. What v5 guarantees
is that the entry no longer carries the one change the evidence indicts, and that whatever the
dev grade says this time, it will be measuring the presentation fix on its own.

## Notes / risks

- There is no local judge: the server grades every entry, so no local score comparison exists.
- Bundling and submitting are the parent agent's step; submissions used stand at 4 of 10, with
  the deadline 2026-12-14T10:00Z.
