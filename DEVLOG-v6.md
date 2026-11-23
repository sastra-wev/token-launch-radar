# Token Launch Radar v6 — devlog (model `radar-4`, restored in full)

Revision of the v5 entry (model `radar-6`) after its dev grade came back the worst of the three
radar-4-model entries. v6 makes no change of its own: it restores the v3 entry (commit `3f89989`)
**in full** — the model, the dashboard presentation and the screenshots — because v3 remains the
best-measured configuration this entry has ever fielded, and v5's experiment isolated the one
variable v6 acts on.

## The A/B record this revision starts from

| | v3 (`radar-4`) | v4 (`radar-5`) | v5 (`radar-6`) |
|---|---|---|---|
| Model | radar-4 | radar-4 + size-credibility scaling | radar-4, restored exactly |
| Presentation | v3 dashboard | v4 chrome + compaction | v4's, kept |
| Dev judge value | **~0.9583 (11W / 1D / 0L)** | ~0.9197 | **0.869** |
| Board (board.json) | md5 `939fcd35609669e06dec6193aea4d482` | differs (model changed) | md5 `939fcd35609669e06dec6193aea4d482` — byte-identical to v3 |

## The confound v5 resolved — against its own hypothesis

v4 changed two things at once (the credibility-scaled model *and* a new presentation) and the
grade fell, so v4 alone could not say which change cost the points. v5 was built to separate
them: it restored radar-4 exactly — its board is byte-for-byte v3's board — and kept only v4's
presentation. The result settles the question the other way from what v5 expected:

- With the model held at radar-4 and the board identical, the grade did not return to ~0.9583.
  It fell further, to 0.869 — below even v4's ~0.9197, where the *worse* model was running under
  the same presentation.
- The variable that tracks the loss across all three entries is the presentation. Every entry
  fielded under v4's chrome scored below every entry fielded under v3's, whatever the model.
- What that presentation does, concretely: body view-classes hide the KPI strip and the top-five
  spotlight on the detail, calibration and method views, and hide the spotlight whenever the
  board is opened with any filter in the URL — so a judge landing on a shared or routed view
  sees a thinner page than the board's first impression promises. The compaction pass also
  shrank the header, KPI, spotlight and table type and padding throughout, trading the v3
  page's generous, legible spacing for density. Neither change was ever measured on its own
  before it shipped; v5 measured the pair of them, and the pair is a regression.

So v6 deletes the pair. There is no third hypothesis left in the record worth a new experiment:
two model complications (v2's shrinkage, v4's credibility) and one presentation complication
(v4's chrome) each regressed against the configuration v3 shipped, and v3's is the only
configuration with a top grade. v6 fields exactly that configuration again.

## What was restored, file by file (against v5's HEAD, `0868bb6`)

- `lib/model.ts` — back to v3 byte for byte: header names radar-4, the radar-5 credibility note
  is gone, `MODEL_VERSION` is `'radar-4'` again. (The model code itself never differed in v5;
  the restore is of the file as v3 shipped it.)
- `main.ts` — header line back to v3's wording.
- `README.md` — model named `radar-4` again; the three live badges are unchanged from v3 (they
  name this competition and this repository, so no freshness change was needed).
- `dashboard/app.js` — the two v4 additions removed: the `linked` body class in the URL preset,
  and the `view-*` body-class routing in `route()`. Routing behaviour is v3's exactly.
- `dashboard/app.css` — the compaction and chrome rules reverted throughout: v3's body padding,
  header scale, KPI sizing, spotlight spacing, tab/control/sandbox spacing and table padding
  are back, and the `body.view-*` / `body.linked` display rules and the `.spotcard .badge`
  compaction rule are deleted.
- `screenshots/` — v3's three captures restored byte for byte (`1-board.jpg` md5
  `dd198bf91a9349267a44f5db3a1e5658`, `2-detail.jpg` md5 `088f6372654142843fe2b3f16102c4f2`,
  `3-filtered.jpg` md5 `0278c10f32bca5a36513deb7fecc594a`); v4's added `4-calibration.jpg` is
  removed — v3 fielded three screenshots and v6 fields the same three.
- `dashboard/index.html`, `vendor/makefun-board.ts`, `.makefun/owner.json`, `LICENSE`,
  `.gitignore` — untouched; they never differed between v3 and v5.
- `DEVLOG-v4.md` and `DEVLOG-v5.md` are kept: they are the record of the two experiments this
  restore is based on, and deleting the evidence would make this entry's own reasoning
  unverifiable. This file is the only new file.

## Verification

- Every restored text file was compared byte for byte against commit `3f89989` (`cmp` clean on
  `lib/model.ts`, `main.ts`, `README.md`, `dashboard/app.js`, `dashboard/app.css`); the
  screenshots were compared by md5 against the same commit.
- The gate validator (`validate.py`, the v5 suite re-pointed at this repository and the fresh
  kit) runs the entry twice into fresh directories: both runs exit 0, outputs byte-identical
  across runs, and **all checks pass** — board shape and coverage (227 rows, watchlist 40/40),
  farm plans, dashboard caps, screenshot caps, dossier byte-for-byte rebuild, data.js agreeing
  with board.json.
- The board those runs write is md5 `939fcd35609669e06dec6193aea4d482` — byte-identical to the
  board v3 shipped and v5 reproduced, as it must be: same sealed snapshot (the fresh kit's
  `input/snapshot.json` is byte-identical to the earlier kits'), same model, same code.

## The honest caveat

A dev grade is one draw against a field, not a constant of the entry: v3's ~0.9583 was measured
once, against opponents whose identities the record does not keep, and v5's 0.869 was measured
the same way. Restoring v3's configuration re-enters v6 in the distribution that produced the
best measured grade this entry has; it does not guarantee the grade repeats. What the record
does support — three regressions, each coinciding with a departure from v3's configuration, and
no departure ever coinciding with a gain — is that v3's configuration is the right one to field
while submissions remain. That is what v6 does, and it changes nothing else.
