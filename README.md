# Token Radar

[![Token Radar](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![Rank](https://make.fun/badge/token-radar-01/irishbel7-cmyk/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01)
[![Reward](https://make.fun/badge/token-radar-01/irishbel7-cmyk/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

Token Radar ranks the pre-token DeFi protocols most worth farming airdrops on. It reads a frozen DeFiLlama snapshot (2026-11-14, `input/snapshot.json`), scores every watchlist protocol with ≥ $50M TVL and no token — plus the strongest sub-floor names below it — and orders them by an implied-value model (`radar-1`):

```
implied = round( tvl_usd × 0.25 × (1 + clamp(change_7d, -60, 120) ÷ 100 × 0.5) × (0.6 + min(age_days, 1095) ÷ 1095 × 0.4) )
```

Every row on the board carries its own farm plan — action, cost and time — derived from that row's record. Implied value is a model, not a price.

## Run

```sh
INPUT_SNAPSHOT=input/snapshot.json OUTPUT_DIR=out node main.ts
```

`main.ts` scores the snapshot, writes `out/board.json`, `out/data.js`, copies `dashboard/` and `screenshots/` into `out/`, and writes `out/dossier.json` — the images plus the page source an AI judge reads. The page works offline from the copied files; it makes no network calls.

Built for [make.fun · token-radar-01](https://make.fun/bounty/token-radar-01). License: MIT (see `LICENSE`).
