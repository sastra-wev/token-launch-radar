# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/sastra-wev/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/sastra-wev/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar. It reads a sealed snapshot of the DefiLlama protocol universe, finds every protocol that records no token yet, and ranks it by an implied launch value: each protocol's TVL priced at its own category's median market-cap/TVL — read off the snapshot's traded protocols — then adjusted for its seven-day growth, how long it has run with no token, and how many chains it is live on. The program writes the ranked board (board.json) and a static dashboard with a sortable, filterable board, a detail view per protocol with the model's working shown, a calibration view of the traded set behind the prices, and a concrete farm plan with costs and times for every protocol it ranks.

## Run it

```sh
node main.ts --input <snapshot.json>
```

Node 22 or later, standard library only. In the grader's container the competition's sealed snapshot is mounted at `/input` and the outputs are expected at `/output`, so plain `node main.ts` suffices there; outside it, `--input <file|dir>` names the snapshot and `MAKEFUN_OUTPUT_DIR=<dir>` redirects the output.

---

<sub>Entered on [make.fun](https://make.fun/?ref=b0hspa3m&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
