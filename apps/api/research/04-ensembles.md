# Campagne 4 — Ensembles (combinaisons & pondérations)

**Script** : `experiments/04-ensembles.ts` · briques tunées de la campagne 2, sur les 3 jeux daily, **moyenne sur 5 seeds** (l'ensemble est probabiliste). `σ(PnL)` mesure la dispersion entre seeds.

## Synthèse par ensemble (moyenne sur BTC/ETH/SOL 1d)

| Ensemble | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |
|---|--:|--:|--:|--:|--:|
| donchian + macd8/21/5 | 210.56 | 170.48 | 0.49 | 56.73 | 1/3 |
| 3·donchian + 1·macd | 182.17 | 142.09 | 0.53 | 55.49 | 2/3 |
| maEMA20/100 + macd8/21/5 | 161.38 | 121.29 | 0.52 | 62.09 | 3/3 |
| **donchian 20/5 (réf, seule)** | 155.63 | 115.55 | **0.64** | **46.35** | **3/3** |
| 2·donchian + 1·maEMA20/100 | 130.44 | 90.35 | 0.56 | 47.03 | 3/3 |
| donchian + maEMA20/100 | 127.03 | 86.94 | 0.51 | 51.59 | 3/3 |
| donchian + maEMA50/100 | 83.19 | 43.11 | 0.42 | 53.14 | 2/3 |
| donchian + maEMA20/100 + macd | 82.78 | 42.70 | 0.30 | 60.72 | 1/3 |
| 2·donchian + 1·rsi | 78.85 | 38.77 | 0.44 | 49.61 | 2/3 |

## Analyse

1. **Aucun ensemble ne bat la brique `donchian 20/5` seule sur le risque ajusté** :
   elle garde le **meilleur Sharpe (0,64)** et le **plus faible drawdown (46 %)**, 3/3
   contre B&H. Les ensembles affichent parfois un PnL brut plus élevé mais un Sharpe
   inférieur.
2. **Le mécanisme probabiliste de l'ensemble injecte une grosse variance.** `σ(PnL)`
   monte jusqu'à **457 pts** (ex. `3·donchian+1·macd` sur SOL). Cause : le score pondéré
   sert de **probabilité** de passer l'ordre ; quand les membres **divergent**, le tirage
   aléatoire tranche au hasard → résultats instables d'un seed à l'autre. Les meilleurs
   « PnL moyens » (donchian+macd : +170) ne battent le B&H que **1/3** : ce sont des
   coups de chance portés par l'outlier SOL, pas une edge fiable.
3. Ajouter une **mean-reversion** (rsi) **dilue** la tendance (Sharpe 0,44) — confirmé.
4. Les ensembles les plus **robustes** (3/3) restent dominés par leur composante donchian :
   `2·donchian + 1·maEMA20/100` (Sharpe 0,56) est le meilleur compromis multi-stratégies.

## Décision → piste forte pour la campagne 5

Le problème n'est pas *quelles* stratégies combiner mais *comment* : **résoudre la
divergence au hasard détruit le risque ajusté**. Hypothèse à tester : une **combinaison
déterministe par consensus** (agir seulement quand le score pondéré dépasse un seuil,
**sans aléa**) devrait **supprimer la variance** et potentiellement battre la brique seule.
→ Campagne 5 : prototyper ce combineur déterministe ; s'il gagne, l'implémenter dans
`core` (avec tests).
