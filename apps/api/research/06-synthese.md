# Campagne 6 — Synthèse & recommandations

Récapitulatif des 6 campagnes de backtests sur vraie data Binance (3 actifs × 3 échelles
de temps, moteur live complet : frais 0,1 % + slippage 5 bps).

## Ce qui marche (par ordre d'impact)

1. **Choisir la bonne échelle de temps.** Les suiveurs de tendance gagnent gros en **daily**
   et perdent en **15m/1h** (le sur-trading + les frais détruisent le capital). C'est le
   facteur n°1, devant le choix de la stratégie.
2. **Filtre de régime (SMA200)** — *la meilleure amélioration trouvée*. Appliqué à un
   croisement de moyennes, il **augmente le Sharpe** (maEMA : −0,77 → −0,21), **réduit le
   drawdown** (donchian : 39,6 % → 28,2 %) et bat le buy & hold **6/6**. → implémenté dans
   `core` sous la clé **`trend_filter`** (avec tests).
3. **Tuning des paramètres** : sur le daily, ralentir les moyennes double l'alpha
   (`donchian 20/5`, `ma EMA 20/100`, `ma EMA 50/100` = trio robuste 3/3). Sur l'hourly,
   des params lents + filtres (`requirePositive`, SMA 50/200) transforment des perdants en
   gagnants relatifs avec un drawdown ~2× moindre.
4. **`buyFraction` = levier de RISQUE, pas d'alpha** (Sharpe quasi invariant). À exposer
   comme curseur « agressivité » plutôt qu'à figer à 0,10.

## Ce qui ne marche PAS

- **Empiler des stratégies n'ajoute pas d'edge** : aucun ensemble ne bat la meilleure brique
  seule sur le risque ajusté.
- **L'ensemble probabiliste actuel injecte de la variance pure** (σ(PnL) jusqu'à 457 entre
  seeds) sans contrepartie. Un **mode seuil déterministe** serait strictement meilleur
  (reproductibilité, cohérent avec la règle de déterminisme du projet). → piste d'ingénierie.
- **Mean-reversion** (rsi, bollinger, momentum_roc, candle_streak) : bon win rate mais alpha
  négatif sur cet échantillon ; à réserver aux marchés en range, non couverts ici.

## Configurations recommandées (paper trading)

| Objectif | Config | Échelle | Pourquoi |
|---|---|---|---|
| **Meilleur risque ajusté** | `trend_filter` (EMA 20/100, SMA200) | 1d | Sharpe le plus stable, DD réduit, 6/6 vs B&H |
| **Rendement brut max (daily)** | `donchian_breakout` (entry 20, exit 5) | 1d | +115 alpha, Sharpe 0,64, 3/3 |
| **Défensif / hourly** | `ma_crossover` SMA 50/200 ou `trend_filter` | 1h | DD ~25-30 %, bat le B&H 3/3 |
| Curseur risque | `buyFraction` 0,5 (équilibré) → 1,0 (agressif) | — | exposition, pas alpha |

## Limites (honnêteté méthodologique)

- **Pas de train/test split** : les params « tunés » sont optimisés sur le même historique
  qu'évalués → risque de **surapprentissage**. Les chiffres sont des bornes optimistes.
- Échantillon limité (3 actifs, ~2021-2026, surtout crypto haussière puis baissière).
- Pas de coûts de financement, pas de gestion de position fractionnée, long-only (v1).
- **Aucun de ces résultats n'est un conseil financier** — projet pédagogique, argent fictif.

## Livrables de cette session

- Harnais de recherche réutilisable : `research/fetch.ts`, `research/lib/`, `research/experiments/`.
- 6 campagnes documentées (`00`→`06`).
- Nouvelle stratégie **`trend_filter`** dans `packages/core` (+ tests colocalisés + fiche
  `docs/strategies/trend-filter.md` + câblage registre/API).
