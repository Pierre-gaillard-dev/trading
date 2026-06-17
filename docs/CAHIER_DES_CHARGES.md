# Cahier des charges — Plateforme de trading automatisé (paper trading)

> Projet pédagogique réalisé dans le cadre d'un **cours sur les tests**.
> Objectif transversal : un code **découpé en clean architecture**, avec un cœur métier **pur et testable à 100 %**.
> Aucune transaction réelle : tout l'argent et toutes les positions sont **fictifs**.

---

## 1. Vision & objectif

Construire une application qui :

1. se connecte à une source de données de marché **crypto en temps réel** (Binance) ;
2. exécute, pour chaque **portefeuille fictif**, une **stratégie de trading automatisée** qui décide d'acheter / vendre / ne rien faire ;
3. simule l'exécution des ordres via un **moteur de trading maison** (cash, positions, frais, slippage) ;
4. mesure si la stratégie **rapporte de l'argent** (PnL, drawdown, Sharpe…) ;
5. affiche le tout dans un **dashboard web** avec graphiques temps réel.

Le but n'est pas de gagner de l'argent réel, mais de **savoir si un algorithme serait rentable** dans des conditions de marché réelles, tout en produisant un projet **massivement testable**.

---

## 2. Périmètre

### Inclus (in scope)

- Flux de prix **temps réel** crypto via WebSocket Binance (market data publique, sans clé API).
- Flux **rejouable** (`ReplayFeed`) lisant des bougies historiques figées → tests déterministes + démos hors-ligne.
- **Moteur de trading simulé** : carnet de cash, positions, exécution d'ordres marché/limite, **frais** (en %) et **slippage** ([formules détaillées](./trading-engine.md)).
- **Sizing pluggable** (`SizingPolicy`) — défaut : fraction fixe du cash.
- **Gestion du risque optionnelle** au niveau du bot : stop-loss et take-profit.
- **Plusieurs stratégies** pluggables (au moins : SMA crossover, RSI, momentum).
- **Plusieurs portefeuilles** simultanés, chacun piloté par sa propre instance de bot (POO).
- Calcul de **métriques de performance** : PnL absolu et %, equity curve, max drawdown, ratio de Sharpe, win rate, nombre de trades.
- **Persistance Postgres** (via Prisma) derrière un pattern Repository.
- **API REST + WebSocket** pour piloter les bots et streamer l'état au front.
- **Dashboard web** (graphiques bougies + equity curve, liste des positions/ordres/trades, contrôles start/stop).

### Exclus (out of scope)

- Argent réel, passage d'ordres réels, connexion à un vrai compte broker.
- Conseil financier, garanties de performance.
- Trading haute fréquence / latence sub-milliseconde.
- Authentification multi-utilisateurs avancée, multi-tenant (un seul utilisateur local suffit ; auth basique possible plus tard).
- Effet de levier, produits dérivés, short complexe (on reste sur spot long/flat dans la v1).

---

## 3. Personas & cas d'usage

- **L'étudiant/développeur (toi)** : crée des portefeuilles, leur affecte une stratégie + des paramètres, lance/arrête les bots, observe les performances.
- **Le correcteur du cours** : doit pouvoir lancer la suite de tests et constater une couverture élevée sur le cœur métier.

**User stories principales**

1. _En tant qu'utilisateur_, je crée un portefeuille avec un capital initial fictif (ex. 10 000 USDT).
2. _En tant qu'utilisateur_, j'affecte une stratégie paramétrée à un portefeuille et un symbole (ex. SMA crossover sur BTCUSDT, bougies 1m).
3. _En tant qu'utilisateur_, je démarre le bot ; il reçoit les prix en direct et passe des ordres fictifs.
4. _En tant qu'utilisateur_, je vois en temps réel l'evolution de mon equity, mes positions et mes trades.
5. _En tant qu'utilisateur_, je compare les performances de plusieurs portefeuilles/stratégies.
6. _En tant qu'utilisateur_, je rejoue un historique figé pour tester une stratégie de façon reproductible.

---

## 4. Architecture (clean architecture / ports & adapters)

Principe directeur : **le cœur métier ne dépend d'aucun framework, d'aucune IO, d'aucune horloge système ni d'aucun aléa.** Tout ce qui est non déterministe (réseau, temps, IDs, hasard) entre par une **interface (port)** et est **injecté**. C'est ce qui rend le projet testable.

```
                 ┌─────────────────────────────────────────────┐
                 │                 apps/web                      │  Présentation
                 │   React + TanStack + shadcn + graphiques      │
                 └───────────────▲─────────────────────────────┘
                                 │ REST + WebSocket
                 ┌───────────────┴─────────────────────────────┐
                 │                 apps/api                      │  Infrastructure / Adapters
                 │  Fastify (REST+WS) · BinanceWsFeed ·          │
                 │  PrismaRepositories · SystemClock · UuidGen   │
                 └───────────────▲─────────────────────────────┘
                                 │ dépend de (implémente les ports)
                 ┌───────────────┴─────────────────────────────┐
                 │              packages/core                    │  Domaine + Application (PUR)
                 │  Entities · Value Objects · Use cases ·       │
                 │  Strategies · Indicators · Ports (interfaces) │
                 └─────────────────────────────────────────────┘
                 ┌─────────────────────────────────────────────┐
                 │             packages/shared                   │  DTO / types partagés api↔web
                 └─────────────────────────────────────────────┘
```

**Règle de dépendance** : les flèches pointent toujours **vers l'intérieur**. `core` ne connaît ni Fastify, ni Prisma, ni Binance. Les adapters (api) implémentent les **ports** définis dans `core`.

### 4.1 Découpage des couches

**Domaine (`packages/core/src/domain`)** — value objects & entités, immuables autant que possible :

- Value Objects : `Money` (décimal, jamais de `float`), `Quantity`, `Price`, `Symbol`, `Candle` (OHLCV + timestamp), `Percentage`.
- Entités : `Order`, `Trade`/`Fill`, `Position`, `Portfolio`.
- Enums : `OrderSide` (BUY/SELL), `OrderType` (MARKET/LIMIT), `OrderStatus` (PENDING/FILLED/REJECTED/CANCELLED), `Signal` (BUY/SELL/HOLD).

**Application (`packages/core/src/application`)** — logique métier orchestrée, dépend des ports :

- `ExecutionEngine` : prend un ordre + prix marché → applique **slippage** puis **frais** → produit un `Fill` ou un rejet (fonds insuffisants, quantité ≤ 0…). [Formules](./trading-engine.md).
- `SizingPolicy` (port) + `FixedFractionSizing` (défaut) : décide la quantité à acheter.
- `RiskManager` : applique stop-loss / take-profit (prioritaires sur la stratégie).
- `Portfolio` (agrégat) : applique les fills, met à jour cash & positions, calcule equity et PnL.
- `TradingBot` (POO, **une instance par portefeuille**) : reçoit une bougie → **risque (SL/TP)** puis `Signal` de la `Strategy` → `SizingPolicy` → `Order` → `ExecutionEngine` → persiste → émet des événements.
- `BotManager` : crée / démarre / arrête / liste les bots.
- `Strategy` (port) + implémentations : `SmaCrossoverStrategy`, `RsiStrategy`, `MomentumStrategy`.
- `indicators` : fonctions **pures** `sma`, `ema`, `rsi`, etc.
- `metrics` : fonctions **pures** `totalPnl`, `equityCurve`, `maxDrawdown`, `sharpeRatio`, `winRate`.

**Ports (`packages/core/src/ports`)** — interfaces implémentées par l'infra :

- `MarketDataFeed` : `subscribe(symbol, interval, handler)` / `unsubscribe` / `getHistory()` (backfill au démarrage).
- `SizingPolicy` : `sizeForBuy(...)` → quantité.
- `Clock` : `now(): Timestamp`.
- `IdGenerator` : `next(): string`.
- `PortfolioRepository`, `OrderRepository`, `TradeRepository`, `BotConfigRepository`.
- `EventBus` (optionnel) : publication des évènements de domaine.

**Infrastructure (`apps/api/src/infra`)** — adapters concrets :

- `BinanceWebSocketFeed implements MarketDataFeed` (live).
- `ReplayFeed implements MarketDataFeed` (rejoue des fixtures — utilisé en démo et tests d'intégration ; vit dans `core` ou un package de test partagé).
- `PrismaPortfolioRepository`, etc.
- `SystemClock implements Clock`, `UuidGenerator implements IdGenerator`.
- Serveur Fastify : routes REST + serveur WebSocket.

### 4.2 Structure de dossiers (monorepo pnpm)

```
trading/
├── package.json                 # workspaces pnpm
├── pnpm-workspace.yaml
├── turbo.json                   # (optionnel) orchestration des tâches
├── tsconfig.base.json
├── CLAUDE.md
├── docs/
│   ├── CAHIER_DES_CHARGES.md
│   ├── trading-engine.md        # frais, slippage, sizing, précision, PnL, risque
│   ├── metrics.md               # formules exactes des métriques
│   ├── api.md                   # contrat REST + protocole WebSocket
│   └── strategies/              # une fiche .md par stratégie + README (contrat commun)
├── packages/
│   ├── core/                    # DOMAINE + APPLICATION (zéro dépendance framework)
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   │   ├── strategies/
│   │   │   │   ├── indicators/
│   │   │   │   └── metrics/
│   │   │   ├── ports/
│   │   │   └── testing/         # test doubles: FakeFeed, FixedClock, in-memory repos
│   │   └── *.test.ts            # tests unitaires colocalisés
│   └── shared/                  # DTO/types partagés api↔web (+ validation zod)
├── apps/
│   ├── api/                     # Fastify : REST + WS, adapters Prisma/Binance
│   │   ├── prisma/schema.prisma
│   │   └── src/{infra,routes,ws,config}/
│   └── web/                     # Vite + React + TanStack + shadcn
│       └── src/{routes,components,features,lib}/
└── ...
```

---

## 5. Spécifications fonctionnelles détaillées

### 5.1 Moteur de trading (ExecutionEngine + Portfolio)

> **Formules exactes, sizing, précision, PnL et risque : voir [`trading-engine.md`](./trading-engine.md).**

- Types d'ordres : **MARKET** (v1) et **LIMIT** (v1.1).
- **Frais** : pourcentage configurable par portefeuille (défaut 0,1 %), prélevés sur chaque fill.
- **Slippage** : `execPrice = prix × (1 ± slippageBps/10000)`, en défaveur du trader.
- **Sizing** : `SizingPolicy` pluggable, défaut `FixedFractionSizing` (fraction du cash, arrondie vers le bas au lot).
- **Précision** : `SymbolSpec` (basePrecision, quotePrecision, stepSize, minNotional) pilote arrondis et rejets.
- **Risque** : stop-loss / take-profit optionnels par bot, prioritaires sur la stratégie.
- **Invariants à garantir (et à tester) :**
  - le cash ne devient jamais négatif ; un BUY sans fonds suffisants est **rejeté** ;
  - on ne vend pas plus que la quantité détenue (pas de short en v1) ;
  - `equity = cash + Σ(position.quantity × prix_courant)` ;
  - les calculs monétaires utilisent un **type décimal**, jamais des `float` ; arrondis explicites et testés.

### 5.2 Stratégies (port `Strategy`)

- Contrat : `decide(context): Signal` où `context` contient l'historique de bougies nécessaire + l'état du portefeuille. **Fonction déterministe et pure.**
- Chaque stratégie est **paramétrable** (fenêtres, seuils) et **validée** (paramètres invalides → erreur).
- **Chaque stratégie a sa fiche détaillée** (idée, formules, paramètres, règles de signal, cas de test) dans [`strategies/`](./strategies/README.md) :

  | Clé                 | Famille               | Fiche                                                                   |
  | ------------------- | --------------------- | ----------------------------------------------------------------------- |
  | `ma_crossover`      | Suivi de tendance     | [moving-average-crossover.md](./strategies/moving-average-crossover.md) |
  | `rsi`               | Retour à la moyenne   | [rsi.md](./strategies/rsi.md)                                           |
  | `macd`              | Momentum / tendance   | [macd.md](./strategies/macd.md)                                         |
  | `bollinger_bands`   | Volatilité            | [bollinger-bands.md](./strategies/bollinger-bands.md)                   |
  | `momentum_roc`      | Momentum              | [momentum-roc.md](./strategies/momentum-roc.md)                         |
  | `donchian_breakout` | Cassure               | [donchian-breakout.md](./strategies/donchian-breakout.md)               |
  | `buy_and_hold`      | Référence (benchmark) | [buy-and-hold.md](./strategies/buy-and-hold.md)                         |

### 5.3 Bots & portefeuilles

- 1 `TradingBot` = 1 portefeuille + 1 stratégie (+ params) + 1 symbole + 1 intervalle + 1 `SizingPolicy` + (optionnel) SL/TP.
- Cycle de vie : `CREATED → RUNNING → STOPPED`. Idempotent (start/stop répétés sans effet de bord).
- Au démarrage : **backfill** de l'historique de bougies (via `MarketDataFeed.getHistory`) pour amorcer les indicateurs avant le live.
- Plusieurs bots tournent en parallèle, isolés les uns des autres.

### 5.4 Métriques de performance (pures)

> **Formules exactes : voir [`metrics.md`](./metrics.md).**

- PnL absolu & %, equity curve, **max drawdown**, **ratio de Sharpe** (annualisé), win rate, profit factor, nombre de trades, exposition, **alpha vs buy & hold**.

### 5.5 API (apps/api)

> **Contrat détaillé (endpoints REST + protocole WebSocket) : voir [`api.md`](./api.md).**

- REST : CRUD portefeuilles, CRUD config de bots, start/stop, lecture trades/ordres/positions/métriques, liste des stratégies + schémas de params.
- WebSocket : push temps réel des bougies, mises à jour de portefeuille, nouveaux trades/ordres, changements d'état des bots.

### 5.6 Dashboard (apps/web)

> **Comportement utilisateur détaillé (user stories + scénarios) : voir [`BDD.md`](./BDD.md)** — authentification, navigation/redirections, portefeuilles, bots, stratégies, visualisation, temps réel.

- **Authentification** : connexion email + mot de passe (règles de robustesse), déconnexion, protection des routes (redirection `/login` ↔ `/dashboard`), session persistante.
- Vue liste des portefeuilles avec equity & PnL en direct.
- Vue détail : **graphique en bougies** (TradingView lightweight-charts) avec marqueurs d'entrées/sorties + **equity curve** (Recharts), tableaux positions/ordres/trades, panneau de contrôle (créer/start/stop, choisir stratégie + paramètres).
- Récupération de données via **TanStack Query**, routage via **TanStack Router**, UI via **shadcn/ui** (+ Tailwind).

---

## 6. Exigences non fonctionnelles

- **Testabilité (priorité n°1)** : cœur pur, dépendances injectées, déterminisme garanti.
- **Lisibilité** : TypeScript strict, ESLint + Prettier, noms explicites.
- **Robustesse réseau** : reconnexion WebSocket Binance, gestion des coupures sans crasher les bots.
- **Performance** : suffisante pour suivre des bougies 1s–1m sur plusieurs symboles ; pas de HFT.
- **Reproductibilité** : `ReplayFeed` + `FixedClock` + `IdGenerator` déterministe → exécution rejouable à l'identique.

---

## 7. Stratégie de test (le cœur du projet)

> Cible indicative : **≥ 90 % de couverture sur `packages/core`** (le cœur métier). Les adapters (api/infra) sont surtout couverts par des tests d'intégration ciblés.

**Outils par type de test**

| Type de test           | Outil          | Cible                                                         |
| ---------------------- | -------------- | ------------------------------------------------------------- |
| Unitaire / fonctionnel | **Vitest**     | `packages/core`, `packages/shared`, logique d'`apps/api`      |
| Intégration            | **Vitest**     | `ReplayFeed`→bot→repo, repositories Prisma (Postgres jetable) |
| Performance / charge   | **k6**         | API REST + WebSocket sous charge, débit du moteur/feed        |
| End-to-end             | **Playwright** | parcours utilisateur dans le dashboard (apps/web)             |

**Pyramide de tests**

1. **Unitaires / fonctionnels — Vitest (majorité)** — sur `packages/core`, sans aucune IO :
   - Value Objects : arithmétique de `Money`, arrondis, égalité, invariants.
   - Indicateurs : `sma`/`ema`/`rsi` sur séries connues → valeurs attendues.
   - Stratégies : séries de bougies → `Signal` attendu (cas haussier, baissier, neutre, données insuffisantes).
   - ExecutionEngine : frais, slippage, fonds insuffisants, quantité nulle, arrondis.
   - Portfolio : application de fills, equity, PnL, ventes partielles.
   - Métriques : drawdown, Sharpe, win rate sur jeux de données connus.
2. **Intégration — Vitest** — `ReplayFeed` → `TradingBot` → repository in-memory → on assert l'**état final déterministe** du portefeuille après un scénario complet. Tests des repositories Prisma contre un Postgres jetable (Docker / Testcontainers).
3. **Contrat / API — Vitest** — routes REST clés et messages WebSocket.
4. **Performance / charge — k6** — scénarios de montée en charge sur l'API REST et le flux WebSocket (latence, débit, p95) ; mesure de la capacité du moteur à suivre plusieurs bots/symboles. Scripts dans `tests/perf/` (k6 = JS, exécuté hors Vitest), seuils (`thresholds`) faisant échouer le run si dépassés.
5. **E2E — Playwright** — parcours dashboard de bout en bout : créer un portefeuille, affecter une stratégie, démarrer un bot, voir l'equity/les trades se mettre à jour. Scripts dans `apps/web/e2e/` (ou `tests/e2e/`).

**Test doubles fournis (`packages/core/src/testing`)**

- `FixedClock` (temps figé), `FakeFeed` / `ReplayFeed` (bougies scriptées), `InMemory*Repository`, `SequentialIdGenerator` (IDs déterministes), builders de fixtures (`aCandle()`, `aPortfolio()`…).

**Conventions de test**

- Vitest, fichiers `*.test.ts` colocalisés.
- Pattern **AAA** (Arrange / Act / Assert), un comportement par test, noms descriptifs.
- Aucun test ne dépend du réseau, de l'heure réelle, d'un ID aléatoire ou de l'ordre d'exécution.

---

## 8. Stack technique

| Couche                                   | Choix                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| Langage                                  | TypeScript (strict)                                                        |
| Tests unitaires/fonctionnels/intégration | **Vitest** (+ coverage v8), éventuellement Testcontainers                  |
| Tests de performance/charge              | **k6**                                                                     |
| Tests end-to-end                         | **Playwright**                                                             |
| Backend API                              | Fastify (REST + `ws`/`@fastify/websocket`)                                 |
| ORM / DB                                 | Prisma + **PostgreSQL**                                                    |
| Données marché                           | WebSocket public Binance (`@binance/connector` ou WS natif)                |
| Décimaux                                 | `decimal.js` (ou Prisma `Decimal`) — **jamais de `float` pour l'argent**   |
| Validation                               | Zod (DTO partagés)                                                         |
| Front                                    | Vite + React + TypeScript                                                  |
| Routing / Data                           | TanStack Router + TanStack Query                                           |
| UI                                       | shadcn/ui + Tailwind CSS                                                   |
| Graphiques                               | TradingView **lightweight-charts** (bougies) + **Recharts** (equity curve) |
| Monorepo                                 | pnpm workspaces (+ Turborepo optionnel)                                    |
| Qualité                                  | ESLint + Prettier                                                          |

---

## 9. Modèle de données (Prisma, esquisse)

- `Portfolio` : id, name, baseCurrency, initialCash, cash, feeRate, slippageBps, createdAt.
- `Position` : id, portfolioId, symbol, quantity, avgEntryPrice.
- `Order` : id, portfolioId, symbol, side, type, quantity, limitPrice?, status, createdAt.
- `Trade` (Fill) : id, orderId, portfolioId, symbol, side, quantity, price, fee, executedAt.
- `BotConfig` : id, portfolioId, symbol, interval, strategyKey, params (JSON), sizing (JSON), stopLossPct?, takeProfitPct?, status.
- (optionnel) `Candle` : cache de bougies pour le replay.

---

## 10. Découpage en lots (jalons)

- **Lot 0 — Setup** : monorepo pnpm, TS strict, ESLint/Prettier, Vitest, CI tests.
- **Lot 1 — Domaine pur + tests** : Value Objects, entités, indicateurs, ExecutionEngine, Portfolio, métriques (100 % testés). _Aucune IO._
- **Lot 2 — Stratégies + tests** : port `Strategy` + 3 implémentations, tests par scénarios.
- **Lot 3 — Bot & orchestration** : `TradingBot`, `BotManager`, ports feed/clock/repo, tests d'intégration avec `ReplayFeed` + in-memory repos.
- **Lot 4 — Infra** : Prisma/Postgres, `BinanceWebSocketFeed`, `SystemClock`, `UuidGenerator`, tests d'intégration.
- **Lot 5 — API** : Fastify REST + WebSocket, tests de contrat.
- **Lot 6 — Dashboard** : front TanStack + shadcn + graphiques temps réel.
- **Lot 7 — Finitions** : métriques avancées, comparaison de portefeuilles, polish, E2E optionnel.

---

## 11. Critères d'acceptation (Definition of Done)

- Le cœur (`packages/core`) est **pur**, sans import d'infra, couvert à ≥ 90 %.
- Toute dépendance non déterministe passe par un **port injecté**.
- Un scénario de `ReplayFeed` donne **exactement** le même état final à chaque exécution.
- En mode live, un bot peut tourner sur BTCUSDT et passer des ordres fictifs visibles dans le dashboard.
- `pnpm test` est vert ; `pnpm lint` est vert.
- Aucun `float` utilisé pour des montants monétaires.

---

## 12. Risques & décisions

- **Non-déterminisme du live** → mitigé par l'abstraction `MarketDataFeed` (live vs replay).
- **Précision monétaire** → type décimal imposé, arrondis testés.
- **Couplage au framework** → interdit dans `core` (règle de dépendance).
- **Limites/instabilité de l'API Binance** → reconnexion + mode replay de secours.

---

## 13. Avertissement

Projet **purement pédagogique**. Aucune transaction réelle, aucune valeur financière, **ne constitue pas un conseil en investissement**.
