# Campagne 2 — Tuning des paramètres (stratégies de tendance)

**Script** : `experiments/02-tuning.ts` · grilles sur ma_crossover (SMA/EMA × 7 paires), donchian (3×3), macd (3 jeux × requirePositive). Classé par **alpha moyen**, séparé Daily / Hourly.

## Daily (BTC/ETH/SOL 1d) — top configs

| Config | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |
|---|--:|--:|--:|--:|--:|
| macd 8/21/5 | 325.48 | 285.39 | 0.62 | 55.27 | 2/3 |
| macd 5/35/5 | 205.55 | 165.47 | 0.48 | 58.20 | 1/3 |
| donchian 10/5 | 159.52 | 119.43 | 0.54 | 54.35 | 2/3 |
| donchian 55/5 | 155.74 | 115.66 | 0.66 | 34.39 | 2/3 |
| **donchian 20/5** | 155.63 | 115.55 | **0.64** | 46.35 | **3/3** |
| ma EMA 50/200 | 129.10 | 89.02 | 0.56 | 52.27 | 2/3 |
| **ma EMA 20/100** | 123.25 | 83.17 | 0.58 | 49.27 | **3/3** |
| **ma EMA 50/100** | 115.04 | 74.96 | 0.58 | 46.36 | **3/3** |
| ma EMA 9/21 (défaut) | 113.86 | 73.77 | 0.57 | 59.21 | 3/3 |

## Hourly (BTC/ETH/SOL 1h) — top configs

| Config | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |
|---|--:|--:|--:|--:|--:|
| ma SMA 50/200 | -18.37 | 24.97 | -0.99 | 28.78 | 3/3 |
| macd 12/26/9 **+** | -20.10 | 23.24 | -2.28 | 24.42 | 3/3 |
| donchian 55/20 | -23.99 | 19.35 | -1.89 | 29.50 | 3/3 |
| ma EMA 50/200 | -24.97 | 18.37 | -1.53 | 29.39 | 3/3 |
| donchian 55/5 | -25.10 | 18.24 | -2.78 | 29.24 | 3/3 |

(« **+** » = `requirePositive` : MACD n'achète que si la ligne MACD est au-dessus de 0.)

## Analyse

1. **Sur le daily, le tuning double quasiment l'alpha.** `donchian 20/5` est le choix le
   plus **robuste** : bat le B&H **3/3**, Sharpe 0,64, +115 pts d'alpha. `ma EMA 20/100`
   et `ma EMA 50/100` sont aussi 3/3 avec Sharpe 0,58. `macd 8/21/5` a l'alpha le plus
   élevé (+285) mais **seulement 2/3** et une grosse variance (il a explosé sur SOL/BTC) →
   spectaculaire mais moins fiable.
2. **Sur l'hourly, le levier est de RALENTIR.** Les paires longues (50/200) et les
   **filtres** (`requirePositive`, sortie longue) font passer plusieurs configs à **3/3**
   contre B&H, avec un **drawdown divisé par ~2** (24-30 % vs 50 %+ pour les params courts).
   Le PnL absolu reste négatif car la fenêtre 1h (déc.→juin) était un marché baissier
   (B&H ≈ −45 %), mais l'alpha et le profil de risque sont bons.
3. **Confirmation centrale** : plus l'échelle est courte, plus il faut des paramètres
   **lents** et des **filtres** pour éviter le sur-trading. C'est la clé de la campagne 5.

## Décisions

- **Paramètres retenus comme briques** des ensembles (campagne 4) :
  - Daily : `donchian 20/5`, `ma EMA 20/100`, `ma EMA 50/100`.
  - Hourly : `ma SMA 50/200`, `macd 12/26/9 +`, `donchian 55/20`.
- Tester l'idée d'un **filtre de régime/tendance** comme nouvelle stratégie (campagne 5).
- Avant les ensembles, mesurer l'effet du **sizing** (`buyFraction`) — campagne 3.
