# Trading — plateforme de paper trading crypto

> Projet pédagogique réalisé dans le cadre d'un **cours sur les tests**.
> Argent **100 % fictif** : aucune transaction réelle, aucun conseil financier.

Des **bots** (une instance par portefeuille) appliquent des **stratégies** sur des prix
crypto (live Binance ou replay), exécutés par un **moteur de trading maison** (frais +
slippage), avec un **dashboard web temps réel**. La **testabilité prime sur tout le reste**.

**Contributeur :** Pierre Gaillard

---

## Stack

- **TypeScript strict** partout, monorepo **pnpm workspaces** + **Turborepo**.
- **Backend** : Fastify (REST + WebSocket), Prisma + PostgreSQL, JWT.
- **Front** : Vite + React 19 + TanStack Router, lightweight-charts, Tailwind.
- **Données marché** : WebSocket public Binance.
- **Décimaux** : `decimal.js` — jamais de `float` pour l'argent.
- **Tests** : Vitest (unitaire/intégration/contrat) + coverage v8.

---

## Architecture (clean architecture / ports & adapters)

```
apps/web        → React / TanStack / Tailwind (présentation)
apps/api        → Fastify, adapters Binance/Prisma, Clock, IdGenerator (infra)
packages/core   → domaine + application + ports  (PUR, zéro framework)
packages/shared → DTO/types partagés api↔web (zod)
```

**Règle de dépendance :** `packages/core` n'importe **jamais** Fastify, Prisma, Binance,
`node:*` ni le DOM. Tout le non-déterminisme (temps, IDs, données marché, persistance,
aléa) passe par un **port injecté**. Les flèches pointent vers l'intérieur.

```
packages/core/src
├── domain/         Value Objects (Money, Price, Quantity, Candle, SymbolSpec…),
│                   entités (Order, Position), invariants
├── application/
│   ├── execution/  ExecutionEngine (frais, slippage, arrondis, rejets)
│   ├── portfolio/  Portfolio (cash, positions, equity)
│   ├── bot/        TradingBot (SL/TP + signal stratégie)
│   ├── backtest/   Backtester (PnL, drawdown, win rate, courbe d'équité)
│   ├── indicators/ SMA, EMA, MACD, RSI, Bollinger, ROC, StdDev, crossover
│   ├── strategies/ ma_crossover, rsi, macd, bollinger_bands, momentum_roc,
│   │               donchian_breakout, buy_and_hold, candle_streak, trend_filter, ensemble
│   └── sizing/     SizingPolicy, FixedFractionSizing
├── ports/          RandomSource (+ MarketDataFeed, Clock, IdGenerator, *Repository)
├── random/         SeededRandom (déterministe)
└── testing/        test doubles (FixedClock, ReplayFeed, repos in-memory, builders)

apps/api/src
├── auth/           password, require-auth, requireWsAuth
├── controllers/    handlers REST
├── routes/         déclaration Fastify (REST + WS marché)
├── services/       binance/ (feed marché), backtest, SystemRandom
├── repositories/   adapters Prisma
├── workers/        boucle d'exécution des bots
└── testing/        helpers de test API
```

---

## Démarrage

```bash
pnpm install                 # installer les dépendances
pnpm db:up                   # démarrer PostgreSQL (docker compose)
pnpm --filter @trading/api db:migrate   # appliquer les migrations Prisma
pnpm --filter @trading/api db:seed      # (optionnel) données de démo
pnpm dev                     # DB + API + web en parallèle (turbo)
```

> La base est définie dans `docker-compose.yml` (PostgreSQL 17, user/pass/db = `trading`).

---

## Scripts

### Racine (monorepo)

| Script | Commande | Rôle |
|---|---|---|
| `pnpm dev` | `docker compose up -d && turbo run dev` | DB + tous les apps en dev |
| `pnpm db:up` | `docker compose up -d` | Démarrer PostgreSQL |
| `pnpm db:down` | `docker compose down` | Arrêter PostgreSQL |
| `pnpm test` | `vitest run` | Lancer tous les tests |
| `pnpm test:watch` | `vitest` | Tests en mode watch |
| `pnpm coverage` | `vitest run --coverage` | Couverture (v8) |
| `pnpm typecheck` | `turbo run typecheck` | Vérif. de types sur tous les packages |
| `pnpm lint` | `eslint .` | Lint |
| `pnpm format` | `prettier --write .` | Formatage |

### `apps/api` (`pnpm --filter @trading/api <script>`)

| Script | Rôle |
|---|---|
| `dev` | API en dev (`tsx watch`) |
| `start` | API en production |
| `typecheck` | `tsc --noEmit` |
| `test` / `test:watch` | Tests API |
| `db:migrate` | `prisma migrate dev` |
| `db:generate` | `prisma generate` |
| `db:seed` | `prisma db seed` |
| `db:reset` | `prisma migrate reset` |
| `db:studio` | `prisma studio` |

### `apps/web` (`pnpm --filter @trading/web <script>`)

| Script | Rôle |
|---|---|
| `dev` | Dashboard en dev (Vite) |
| `build` | Build de production |
| `preview` | Prévisualiser le build |
| `typecheck` | `tsc --noEmit` |

### `packages/core` (`pnpm --filter @trading/core <script>`)

| Script | Rôle |
|---|---|
| `test` / `test:watch` | Tests du cœur |
| `test:cov` | Couverture du cœur |
| `typecheck` | `tsc --noEmit` |

---

## Tests & couverture

**Cible du cours : ≥ 90 % de couverture sur `packages/core`** — atteinte.

Couverture mesurée via `pnpm coverage` (**46 fichiers de test, 368 tests**) :

| Zone | Couverture (lignes) | Verdict |
|---|--:|---|
| **`packages/core`** | **97,6 %** (524/537) | 🟢 cible ≥ 90 % atteinte (tous fichiers ≥ 90 %) |
| `packages/shared` | **100 %** (45/45) | 🟢 |
| `apps/api` | **63,8 %** (312/489) | 🟠 reste : repos Prisma + WebSocket marché |
| `apps/web` | — | 🔴 hors périmètre « back » (Playwright à venir) |
| **Global** | **82,25 %** lignes · 76,2 % fonctions · 82,9 % branches | |

**Pyramide de tests** : unitaires Vitest (majorité, sur `core`, fonctions pures sans mock)
→ intégration (`ReplayFeed` + repos in-memory, état final déterministe) → contrat API
→ perf k6 (prévu) → E2E Playwright (prévu).

> **Règle d'or :** aucun test ne dépend du réseau, de l'heure réelle, d'un ID aléatoire
> ni de l'ordre d'exécution. On utilise les test doubles de `packages/core/src/testing`
> (`FixedClock`, `SeededRandom`, repos in-memory, builders de fixtures).

L'état détaillé et les trous restants sont suivis dans [`docs/AUDIT_TESTS.md`](./docs/AUDIT_TESTS.md).

---

## Documentation

| Document | Contenu |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Guide de travail dans le dépôt (règles non négociables) |
| [`docs/CAHIER_DES_CHARGES.md`](./docs/CAHIER_DES_CHARGES.md) | Vision, périmètre, architecture, modèle de données, critères d'acceptation |
| [`docs/trading-engine.md`](./docs/trading-engine.md) | Formules exactes : frais, slippage, sizing, précision, PnL, SL/TP |
| [`docs/metrics.md`](./docs/metrics.md) | Formules des métriques (PnL, max drawdown, Sharpe, win rate, profit factor, alpha) |
| [`docs/api.md`](./docs/api.md) | Contrat REST + protocole WebSocket (types `shared`, validés zod) |
| [`docs/BDD.md`](./docs/BDD.md) | User stories + scénarios Gherkin (comportement front) |
| [`docs/strategies/`](./docs/strategies/) | Une fiche par stratégie (idée, formules, paramètres, cas de test) |
| [`docs/AUDIT_TESTS.md`](./docs/AUDIT_TESTS.md) | Audit de la couverture de tests |
