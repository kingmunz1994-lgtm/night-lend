# Night Lend

**ZK DeFi Lending Protocol on Midnight Network**

Night Lend is a privacy-first lending protocol. Deposit assets to earn yield. Borrow against collateral at up to 75% LTV. Your entire position — deposits, borrows, and health factor — stays ZK-private. Prove you're healthy without revealing a single number.

---

## Key parameters

| Parameter | Value |
|-----------|-------|
| Max LTV | **75%** — borrow up to 75% of deposit value |
| Liquidation threshold | Health factor < 1.0 |
| Reentrancy guard | Yes — `lock()` / `unlock()` on every state-changing circuit |
| Supported assets | NIGHT · sUSD · tDUST |

---

## Supported pools

| Asset | Deposit APY | Borrow Rate |
|-------|------------|-------------|
| NIGHT | 18.4% | 22.1% |
| sUSD | 8.2% | 11.5% |
| tDUST | 31.7% | 38.4% |

---

## Contract — `NightLend.compact`

```
contracts/
└── NightLend.compact      Compact v0.20 (Midnight)
```

### Key circuits

| Circuit | Description |
|---------|-------------|
| `depositNight(amount)` | Deposit NIGHT to earn yield |
| `depositSusd(amount)` | Deposit sUSD to earn yield |
| `borrow(amountUsd)` | Borrow USD value (75% LTV check) |
| `repayAll()` | Clear entire borrow position |
| `withdrawNight(amount)` | Withdraw (requires zero borrows) |
| `proveHealthy()` | ZK proof: position is solvent |

### Reentrancy guard
Every state-changing circuit calls `lock()` at entry and `unlock()` at exit. A second call within the same transaction reverts with `"reentrant call"`.

### `proveHealthy()` — ZK circuit
```compact
export circuit proveHealthy(): Boolean {
  // witnesses: callerDepositUsd(), callerBorrowUsd()
  // asserts: borUsd <= depUsd * 75 / 100
  // returns true — verifier learns only "solvent"
}
```

---

## Front-end

```
public/
├── index.html            Lending dashboard
├── css/nightlend.css     Design system (green accent)
└── js/lend.js            Pool selection, borrow/withdraw flows
```

Position state persisted in `localStorage` (`nl_state`). Health factor bar updates live as borrow amount changes.

---

## Development

```bash
npm install
npm run dev          # Vite dev server on :3006
npm run compile      # compactc NightLend.compact
npm run build        # Production build → dist/
```

---

## Deployment

GitHub Pages via `.github/workflows/pages.yml`. Push to `main` → `public/` served automatically. To enable: **Settings → Pages → Source: GitHub Actions**.

---

## Part of Night Markets

| Repo | Description |
|------|-------------|
| [night-fun](https://github.com/kingmunz1994-lgtm/night-fun) | Core token launchpad |
| [night-work](https://github.com/kingmunz1994-lgtm/night-work) | Task marketplace |
| [night-save](https://github.com/kingmunz1994-lgtm/night-save) | Collateral vault + sUSD |
| **night-lend** | **DeFi lending** |
| [night-biz](https://github.com/kingmunz1994-lgtm/night-biz) | Business loyalty tokens |

---

*Built on Midnight Network · Compact v0.20 · ZK-private by default*
