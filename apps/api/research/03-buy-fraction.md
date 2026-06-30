# Campagne 3 — Effet de la fraction d'achat (sizing)

**Script** : `experiments/03-buy-fraction.ts` · balaie `buyFraction` ∈ {0.10 … 1.00} sur deux configs robustes (donchian 20/5 daily, ma SMA 50/200 hourly).

## donchian 20/5 (daily)

| buyFraction | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |
|--:|--:|--:|--:|--:|--:|
| 0.10 | 14.64 | -25.44 | 0.57 | 6.50 | 0/3 |
| 0.50 | 80.07 | 39.98 | 0.62 | 27.82 | 2/3 |
| 0.95 | 155.63 | 115.55 | 0.64 | 46.35 | 3/3 |
| 1.00 | 163.36 | 123.28 | 0.64 | 48.15 | 3/3 |

## ma SMA 50/200 (hourly, marché baissier sur la fenêtre)

| buyFraction | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |
|--:|--:|--:|--:|--:|--:|
| 0.10 | -2.02 | 41.32 | -1.03 | 3.50 | 3/3 |
| 0.50 | -9.90 | 33.44 | -1.01 | 16.35 | 3/3 |
| 0.95 | -18.37 | 24.97 | -0.99 | 28.78 | 3/3 |
| 1.00 | -19.29 | 24.05 | -0.99 | 30.04 | 3/3 |

## Analyse

1. **`buyFraction` est un levier de RISQUE, pas d'alpha** : le **Sharpe est quasi
   constant** quel que soit le réglage (0,64 en daily, −1,0 en hourly). Augmenter la
   fraction multiplie à la fois le rendement et le drawdown, ~proportionnellement.
2. En marché **haussier** (daily), plus on investit, plus on gagne (1.0 → +123 alpha,
   mais DD 48 %). En marché **baissier** (hourly), rester surtout en cash protège : à
   0,10, alpha +41 et DD seulement 3,5 %.
3. Le défaut produit (`0.10`) est **très conservateur** : bon garde-fou anti-drawdown,
   mais laisse beaucoup de rendement sur la table en tendance haussière.

## Décisions

- La fraction se choisit selon **l'appétit pour le risque**, pas pour battre un benchmark.
- Pour les campagnes suivantes (ensembles), je garde **0,95** afin de comparer les
  stratégies à exposition élevée comparable, et je documenterai le DD associé.
- Piste produit : exposer `buyFraction` comme curseur « agressivité » au lieu d'un défaut figé.
