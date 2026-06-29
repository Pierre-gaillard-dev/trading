# Audit des tests — état des lieux & trous à combler

> Mesuré le 2026-06-29 via `pnpm coverage`. Couverture initiale **globale ~40 %**.

## ✅ Mise à jour — tout le back unitaire/contrat a été traité

Après la campagne de tests back (commits `test(core)` / `test(api)`) :

| Zone | Avant | Après |
|---|--:|--:|
| **packages/core** | ~35 % | **97,7 %** (tous fichiers ≥ 90 %, cible atteinte ✅) |
| packages/shared | ~95 % | **100 %** |
| apps/api | élevé sauf trous | **63,7 %** (reste : Prisma + WS marché) |
| **Global** | ~40 % | **82,4 %** · 368 tests |

**Fait** : value objects (Money/Price/Quantity), ExecutionEngine, Portfolio, TradingBot,
Backtester, les 6 indicateurs, les 9 stratégies, sizing, SeededRandom, registre, +
côté API : backtest (contrat + invert + erreurs), `requireWsAuth`, SystemRandom.

**Reste (palier intégration — nécessite une infra dédiée, cf. §4 & §7)** :
- Repos **Prisma** sur Postgres jetable (ne pas taper sur la base de dev).
- **WebSocket marché** (`market.registry/gateway/routes`) : faux serveur WS ou refactor
  pour injecter le hub (évite le réseau en test).
- **Front** (`apps/web`) : Playwright + tests de composants — hors périmètre « back ».

Le reste de ce document est l'audit initial (conservé comme référence).

---

## TL;DR — le constat central

**La pyramide de tests est inversée par rapport à la priorité du projet.** Le cours dit
« la testabilité prime » et vise **≥ 90 % sur `packages/core`** ; or c'est précisément le
**cœur pur** (moteur d'exécution, value objects monétaires, indicateurs, stratégies) — le
code **le plus facile à tester** (fonctions pures, zéro mock) — qui est **le moins testé**.
Pendant ce temps, la couche externe couplée au framework (routes/contrôleurs API) est, elle,
très bien couverte.

| Zone | Fichiers de test | Couverture | Verdict |
|---|--:|--:|---|
| `packages/core` | **2** | **~30-40 %** | 🔴 loin de la cible 90 %, le plus critique |
| `packages/shared` (zod) | 5 | ~95 % | 🟢 OK |
| `apps/api` (routes/workers/repos in-mem) | 11 | élevé | 🟢 OK (sauf Prisma + services) |
| `apps/web` | **0** | **0 %** | 🔴 aucun test, aucun Playwright |

Sur les **2** fichiers de test de `core`, **les deux ont été écrits dans la session
d'optimisation** (`ensemble`, `trend_filter`). Tout le reste du cœur historique est **non testé**.

## 1. 🔴 P0 — Le cœur du moteur (le plus critique, le plus facile)

Ces modules portent les **invariants non négociables** (règles 3 & 4 du CLAUDE.md) et ont
leurs formules **déjà spécifiées** dans `docs/trading-engine.md`. Ils sont pourtant quasi nus :

| Module | Couv. | Ce qu'il faut tester (non couvert) |
|---|--:|---|
| `application/execution/execution-engine.ts` | **0 %** | frais (arrondi UP), slippage (bps), arrondi notional (HALF_UP), **rejets** : BUY sans fonds, sous `minNotional`, `stepSize`, **pas de vente à découvert**, quantité nulle |
| `domain/money.ts` | 13 % | arithmétique décimale, arrondis explicites, jamais de `float`, signes |
| `domain/price.ts` | 15 % | `withSlippage` (BUY/SELL, précision), comparaisons |
| `domain/quantity.ts` | 11 % | `floorToStep`, précision base, zéro |
| `application/portfolio/portfolio.ts` | 19 % | **cash jamais négatif**, **`equity = cash + Σ(qty×prix)`**, maj position, prix d'entrée moyen, positions seedées |
| `application/bot/trading-bot.ts` | 3 % | priorité **SL/TP** avant stratégie, BUY seulement si à plat, SELL seulement si en position, garde `minCandles` |
| `application/backtest/backtester.ts` | 5 % | calcul PnL/PnL%, **max drawdown**, win rate, allers-retours, `buyHoldPnlPct`, courbe d'équité, cas 0 bougie |

> Ces tests sont **déterministes et sans mock** (test doubles déjà dispo : `FixedClock`,
> `SeededRandom`, repos in-memory). C'est le **meilleur rapport valeur/effort** du projet.

## 2. 🟠 P1 — Indicateurs (fonctions pures triviales)

Tous spécifiés dans `docs/strategies/README.md` (valeurs connues, gestion des `null`,
périodes invalides). Quasi tous à **0 %** :

- `ema.ts`, `macd.ts`, `rsi.ts`, `bollinger.ts`, `roc.ts`, `stddev.ts` → **0 %**
- `sma.ts` 91 %, `crossover.ts` 100 % (déjà bons)

Chaque indicateur = quelques tests à valeurs connues + `null` en début de série + période ≤ 0.
**Très rapide à écrire, débloque la confiance dans toutes les stratégies.**

## 3. 🟠 P1 — Stratégies (les fiches listent déjà les cas !)

Chaque fiche `docs/strategies/*.md` a une section **« Cas de test (Vitest) »** déjà rédigée.
Il « suffit » de les transcrire. État actuel :

- **0 %** : `bollinger_bands`, `buy_and_hold`, `candle_streak`, `donchian_breakout`, `macd`, `momentum_roc`
- Partiel : `ma_crossover` 33 %, `rsi` 35 %, `support.ts` 75 %
- 🟢 Déjà faits : `ensemble` 100 %, `trend_filter` 97 %

Cas obligatoires communs (contrat) non vérifiés pour 6 stratégies : **`< minCandles` → HOLD**,
signal BUY/SELL au bon moment, params invalides → erreur.

## 4. 🟠 P2 — Intégration base de données (Prisma)

CLAUDE.md prévoit des **repos Prisma testés sur Postgres jetable**. Aujourd'hui seuls les
repos **in-memory** sont testés ; les implémentations Prisma sont à **0-25 %** :

- `prisma-bot-config` **0 %**, `prisma-portfolio` 5 %, `prisma-candle` 8 %, `prisma-watchlist` 25 %

Risque concret : c'est **exactement** le genre de trou qui a causé le bug `invert` récent
(le code passait, la **vraie** colonne DB manquait). Des tests d'intégration Prisma
(Testcontainers ou Postgres jetable) l'auraient attrapé.

## 5. 🟠 P2 — Services & contrôleurs API non couverts

| Fichier | Couv. | Manque |
|---|--:|---|
| `controllers/backtest.controller.ts` | 16 % | **chemin nominal** (un `CandleFetcher` est injectable exprès pour ça, mais aucun test ne s'en sert) : validation, run, downsample, `invert`, erreurs 400/404/503 |
| `routes/market.routes.ts` | **0 %** | route WebSocket `/ws/market`, parse symbol/interval, défauts |
| `services/binance/market.registry.ts` | **0 %** | abonnement/partage de flux, fan-out aux workers |
| `services/binance/market.gateway.ts` | 35 % | reconnexion, parsing des messages |
| `auth/require-auth.ts` | 30 % | **`requireWsAuth`** (token en query) non testé |
| `services/system-random.ts` | 0 % | trivial (adapter `Math.random`) |

## 6. 🔴 P2 — Front (`apps/web`) : 0 test

- **Aucun test unitaire / composant** (formulaires bot & backtest, toggle `invert`, hooks `use-*`, store auth).
- **Aucun Playwright** : `apps/web/e2e/` n'existe pas, pas de `playwright.config`. Pourtant
  `docs/BDD.md` contient déjà **des dizaines de scénarios Gherkin** prêts à être exécutés
  (auth, navigation, portefeuilles, bots, dont les 2 scénarios `invert` ajoutés récemment).
  → Les scénarios existent **sur le papier mais ne tournent pas**.

## 7. Types de tests prévus mais absents (vs pyramide CLAUDE.md)

| Niveau | Prévu | État |
|---|---|---|
| Unitaire Vitest (core) | majorité | 🔴 ~2 fichiers seulement |
| Intégration Vitest (Prisma sur Postgres jetable) | oui | 🔴 absent |
| Contrat API Vitest | oui | 🟢 partiel (routes OK, backtest non) |
| **Perf k6** (`tests/perf/` + thresholds) | oui | 🔴 **dossier absent** |
| **E2E Playwright** (`apps/web/e2e/`) | oui | 🔴 **absent** |

## 8. Incohérences doc ↔ code détectées au passage

- **`docs/metrics.md`** décrit des métriques (Sharpe annualisé, profit factor, exposition,
  alpha) mais **il n'existe pas de module `application/metrics/`**. Le backtester calcule
  inline PnL/drawdown/win rate/buy&hold, **pas** Sharpe/profit factor/exposition/alpha.
  → soit fonctionnalité **non implémentée**, soit doc à corriger. À trancher (puis tester).
- **CLAUDE.md** affirme viser « ≥ 90 % sur core » : on est à **~30-40 %**. À remettre au niveau
  ou à requalifier en objectif.

## Plan d'action recommandé (par valeur/effort décroissant)

1. **P0 — Cœur monétaire & moteur** : `Money`/`Price`/`Quantity`, `ExecutionEngine`,
   `Portfolio`, `TradingBot`, `Backtester`. Déterministe, sans mock, formules déjà écrites
   dans `docs/trading-engine.md`. **C'est ici que se joue la note du cours.**
2. **P1 — Indicateurs** (valeurs connues) puis **stratégies** (transcrire les « Cas de test »
   des fiches). Volume élevé, effort faible.
3. **P2 — Intégration Prisma** sur Postgres jetable (aurait évité le bug `invert`).
4. **P2 — backtest.controller** (happy path via fetcher injecté) + `requireWsAuth` + market.*.
5. **P3 — Front** : d'abord scaffolder **Playwright** et câbler les scénarios `docs/BDD.md`
   existants ; tests de composants pour les formulaires.
6. **P3 — Perf k6** (`tests/perf/` avec thresholds) une fois le reste stabilisé.

> Objectif réaliste de première passe : faire monter **`packages/core` de ~35 % à ≥ 90 %**
> (P0 + P1). C'est là que la cible du cours est explicite et la plus rentable.
