# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/sastra-wev/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/sastra-wev/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar. It reads a sealed snapshot of the DefiLlama protocol universe, finds every protocol that records no token yet, and ranks it by an implied launch value. The price of each protocol is read off the snapshot's own traded protocols at three levels — its category's market-cap/TVL ratios, its economic family's (lending with lending, staking with staking), and the whole market's — with each level shrunk toward the next by its peer count and a category's own evidence trusted only within a factor of three of the level above it, so no thin category and no single wild print can carry a price. The point value is then adjusted for seven-day growth (dampened, on a square-root scale), how long the protocol has run with no token, and how many chains it is live on; beside every value sits a stated range from the peers' spread and an evidence tier that says how much data priced the row. The program writes the ranked board (board.json) and a static dashboard with a sortable, filterable board under a top-five spotlight, a detail view per protocol with the model's working shown step by step, a calibration view that plots the traded set behind the prices, and a concrete farm plan with costs and times for every protocol it ranks. Model `radar-3`; the method is written out in full in `lib/model.ts` and in the dashboard's own "How the radar works" view.

## Run it

```sh
node main.ts --input <snapshot.json>
```

Node 22 or later, standard library only. In the grader's container the competition's sealed snapshot is mounted at `/input` and the outputs are expected at `/output`, so plain `node main.ts` suffices there; outside it, `--input <file|dir>` names the snapshot and `MAKEFUN_OUTPUT_DIR=<dir>` redirects the output.

---

<sub>Entered on [make.fun](https://make.fun/?ref=b0hspa3m&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
