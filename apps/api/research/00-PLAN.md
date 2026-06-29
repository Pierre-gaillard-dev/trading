# Optimisation des revenus — plan de recherche

> Projet pédagogique, **paper trading 100 % fictif**. Objectif : trouver, par
> backtests sur **vraie data Binance**, des configurations de stratégies qui
> améliorent le rendement net (et le rendement ajusté du risque), de façon
> robuste sur plusieurs actifs et plusieurs échelles de temps.

## Données (cache local, `research/data/`)

Téléchargées via `tsx research/fetch.ts` (API REST publique Binance). 3 actifs ×
3 échelles de temps → régimes de marché variés :

| Jeu | Bougies | Période | Couverture |
|---|--:|---|---|
| BTCUSDT 15m | 5000 | 2026-05-08 → 06-29 | ~52 j, court terme bruité |
| BTCUSDT 1h | 5000 | 2025-12-03 → 06-29 | ~7 mois |
| BTCUSDT 1d | 2000 | 2021-01-07 → 06-29 | ~5,5 ans (bull 21, bear 22, reprise) |
| ETHUSDT 15m / 1h / 1d | 5000 / 5000 / 2000 | idem BTC | |
| SOLUSDT 1h | 5000 | 2025-12-03 → 06-29 | ~7 mois |
| SOLUSDT 1d | 1500 | 2022-05-22 → 06-29 | ~4 ans |

## Méthode

- Moteur = `runBacktest` (le **vrai** moteur live : frais 0,1 % + slippage 5 bps),
  capital initial 10 000, `FixedFractionSizing`.
- Métriques : **PnL %**, **alpha** (PnL − buy & hold), **MaxDD %**, **Sharpe annualisé**,
  nb de trades, win %. Le benchmark de référence est **buy & hold** (clé `buy_and_hold`).
- Une stratégie unique passée dans l'ensemble est **déterministe** (score ±1) ;
  un ensemble multi-stratégies est probabiliste → testé sur **plusieurs seeds**
  (moyenne + écart-type `σ(PnL)` pour juger la robustesse).
- Critère de succès d'une idée : **alpha > 0 sur une majorité de jeux** ET
  Sharpe ≥ benchmark, sans drawdown catastrophique.

## Campagnes (chaque fichier = une idée, avec ses résultats)

0. **[00-PLAN.md](./00-PLAN.md)** — ce fichier.
1. **[01-baseline-single.md](./01-baseline-single.md)** — les 8 stratégies, params par défaut, sur tous les jeux. Établit le point de départ.
2. **[02-tuning-params.md](./02-tuning-params.md)** — réglage des paramètres clés des meilleures stratégies (grilles).
3. **[03-buy-fraction.md](./03-buy-fraction.md)** — effet de la fraction d'achat (sizing) sur rendement/risque.
4. **[04-ensembles.md](./04-ensembles.md)** — combinaisons de 2-3 stratégies + pondérations.
5. **[05-consensus.md](./05-consensus.md)** — combineur déterministe par consensus (prototype).
6. **[05b-regime-filter.md](./05b-regime-filter.md)** — filtre de régime (SMA longue) → **meilleure piste**, implémentée en `core` (`trend_filter`).
7. **[06-synthese.md](./06-synthese.md)** — meilleures configs retenues, conclusions, limites.
8. **[07-court-terme.md](./07-court-terme.md)** — recherche de profit en 15m/1h (SL/TP, sous-fenêtres bull/bear). Conclusion : pas de profit court terme fiable sur cet échantillon (marché baissier) ; le RSI+stop-loss est seulement *défensif*.
9. **[08-invert-ensemble.md](./08-invert-ensemble.md)** — option `invert` au niveau de l'ensemble (inverse la décision finale du bot). N'aide que si l'ensemble est systématiquement perdant : `inverse[rsi]` −28 % → +42 %, mais inverser un ensemble gagnant le casse.

> Vérif end-to-end : `experiments/07-verify-trend-filter.ts` confirme que la stratégie
> `trend_filter` de `core` reproduit exactement le prototype de la campagne 5b.

## Journal d'exécution

- Chaque campagne a un script `experiments/NN-*.ts` lancé par
  `pnpm --filter @trading/api exec tsx research/experiments/NN-*.ts`.
- Les résultats bruts (tableaux Markdown) sont collés dans le `.md` correspondant,
  suivis de l'analyse et de la décision (garder / écarter / explorer plus loin).
