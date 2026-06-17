# CLAUDE.md

Guide pour travailler dans ce dépôt. Plateforme de **trading automatisé fictif (paper trading crypto)**, réalisée pour un **cours sur les tests** → la testabilité prime sur tout le reste.

## Documentation du projet
- **`docs/CAHIER_DES_CHARGES.md`** — référence complète : vision, périmètre, architecture, specs, modèle de données, lots, critères d'acceptation.
- **`docs/trading-engine.md`** — formules exactes : frais, slippage, sizing (`SizingPolicy`), précision (`SymbolSpec`), PnL, SL/TP, cycle d'ordre. **Lire avant de coder/tester l'`ExecutionEngine`.**
- **`docs/metrics.md`** — formules exactes des métriques (PnL, max drawdown, Sharpe annualisé, win rate, profit factor, exposition, alpha).
- **`docs/api.md`** — contrat REST + protocole WebSocket (types `packages/shared`, validés zod).
- **`docs/strategies/`** — une fiche par stratégie (idée, formules, paramètres, règles de signal **et cas de test à écrire**). Commence par [`docs/strategies/README.md`](./docs/strategies/README.md) qui définit le **contrat commun** `Strategy`. **Avant d'implémenter ou de tester une stratégie, lire sa fiche** ; toute évolution d'une stratégie/spec doit être répercutée dans la fiche correspondante.

## En une phrase
Des bots (1 instance par portefeuille) appliquent des stratégies sur des prix crypto (live Binance ou replay), exécutés par un moteur de trading maison (frais + slippage), avec dashboard web temps réel. **Argent 100 % fictif.**

## Stack
- **TypeScript strict** partout, monorepo **pnpm workspaces**.
- Tests : **Vitest** (unitaire/fonctionnel/intégration, + coverage v8) · **k6** (perf/charge) · **Playwright** (E2E).
- Backend : **Fastify** (REST + WebSocket), **Prisma + PostgreSQL**.
- Données marché : **WebSocket public Binance**.
- Front : **Vite + React + TanStack Router/Query + shadcn/ui + Tailwind**, graphiques **lightweight-charts** + **Recharts**.
- Décimaux : **`decimal.js`** — jamais de `float` pour l'argent.

## Architecture (clean architecture / ports & adapters)
```
apps/web   → React/TanStack/shadcn (présentation)
apps/api   → Fastify, adapters Binance/Prisma, Clock système, générateur d'ID (infra)
packages/core   → domaine + application + ports  (PUR, zéro framework)
packages/shared → DTO/types partagés api↔web (zod)
```
- `domain/` : Value Objects (`Money`, `Quantity`, `Price`, `Candle`…), entités (`Order`, `Trade`, `Position`, `Portfolio`), enums.
- `application/` : `ExecutionEngine`, `Portfolio`, `TradingBot`, `BotManager`, `strategies/`, `indicators/`, `metrics/`.
- `ports/` : `MarketDataFeed`, `Clock`, `IdGenerator`, `*Repository`.
- `testing/` : test doubles (`FixedClock`, `ReplayFeed`/`FakeFeed`, `InMemory*Repository`, `SequentialIdGenerator`, builders de fixtures).

## Règles non négociables
1. **Règle de dépendance** : `packages/core` n'importe **jamais** Fastify, Prisma, Binance, `node:*` IO, ni le DOM. Les flèches pointent vers l'intérieur.
2. **Tout le non-déterminisme passe par un port injecté** : temps (`Clock`), IDs (`IdGenerator`), données marché (`MarketDataFeed`), persistance (`*Repository`), aléa. Aucun `Date.now()`, `Math.random()`, `crypto.randomUUID()` ni accès réseau dans `core`.
3. **Argent en décimal**, jamais `float`. Arrondis explicites et testés.
4. **Invariants du moteur** : cash jamais négatif, BUY sans fonds → rejet, pas de vente à découvert (v1), `equity = cash + Σ(qty × prix)`.
5. **Stratégies = fonctions pures** : `decide(context): Signal` (BUY/SELL/HOLD), déterministe. Contrat et fiches détaillées dans `docs/strategies/`. Clés disponibles : `ma_crossover`, `rsi`, `macd`, `bollinger_bands`, `momentum_roc`, `donchian_breakout`, `buy_and_hold` (benchmark).
6. Une **instance `TradingBot` par portefeuille** (POO), isolée des autres.

## Tests (le but du cours)
- Cible : **≥ 90 % de couverture sur `packages/core`**.
- **Vitest** (unitaire/fonctionnel/intégration), **k6** (perf/charge), **Playwright** (E2E).
- Pyramide : unitaires Vitest (majorité, sur `core`) → intégration Vitest (`ReplayFeed` + repos in-memory → état final déterministe ; repos Prisma sur Postgres jetable) → contrat API Vitest → perf k6 (`tests/perf/`, avec `thresholds`) → E2E Playwright (`apps/web/e2e/`).
- `*.test.ts` colocalisés (Vitest), pattern **AAA**, un comportement par test, noms descriptifs.
- **Aucun test ne dépend du réseau, de l'heure réelle, d'un ID aléatoire ou de l'ordre d'exécution.** Utiliser les test doubles de `packages/core/src/testing`.

## Commandes (à maintenir à jour au fil du scaffolding)
```bash
pnpm install
pnpm test            # tous les tests (Vitest)
pnpm test --coverage # couverture
pnpm lint            # ESLint
pnpm --filter @trading/api dev    # API en dev
pnpm --filter @trading/web dev    # dashboard en dev
pnpm --filter @trading/api prisma migrate dev
```
> ⚠️ Ces commandes sont prévisionnelles : mettre à jour cette section une fois le monorepo scaffoldé.

## Conventions
- TS strict, ESLint + Prettier. Pas de `any` non justifié.
- Imports inter-packages via alias workspace (`@trading/core`, `@trading/shared`).
- Validation des entrées (params de stratégie, DTO API) avec **zod**.
- Commits : **ne jamais** ajouter de mention `Co-Authored-By: Claude` (préférence globale de l'utilisateur).

## Rappel
Projet pédagogique, paper trading **fictif** : aucune transaction réelle, aucun conseil financier.
