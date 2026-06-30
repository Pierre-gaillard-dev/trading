# Campagne 1 — Baseline : stratégies seules, paramètres par défaut

**Script** : `experiments/01-baseline.ts` · 8 stratégies × 8 jeux = 64 backtests, déterministes (seed unique, stratégie seule). `buyFraction = 0,95`, frais 0,1 %, slippage 5 bps.

## Synthèse par stratégie (moyenne sur les 8 jeux)

| Stratégie | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |
|---|--:|--:|--:|--:|--:|
| ma_crossover | 16.01 | **24.11** | -4.09 | 49.62 | 5/8 |
| donchian_breakout | 0.58 | **8.68** | -3.80 | 43.13 | 5/8 |
| buy_and_hold | -7.82 | 0.28 | -1.43 | 54.93 | 5/8 |
| macd | -12.13 | -4.03 | -5.10 | 57.01 | 1/8 |
| candle_streak | -20.17 | -12.08 | -1.97 | 55.83 | 3/8 |
| rsi | -27.96 | -19.86 | -1.27 | 44.41 | 5/8 |
| bollinger_bands | -32.01 | -23.91 | -1.97 | 51.38 | 2/8 |
| momentum_roc | -36.36 | -28.27 | -8.65 | 68.01 | 1/8 |

## Meilleures lignes individuelles (alpha décroissant, extrait)

| Config | Jeu | PnL % | vs B&H | B&H % | MaxDD % | Sharpe | Trades |
|---|---|--:|--:|--:|--:|--:|--:|
| ma_crossover | BTCUSDT 1d | 161.21 | +108.98 | 52.23 | 59.45 | 0.67 | 80 |
| macd | SOLUSDT 1d | 145.78 | +106.87 | 38.91 | 61.06 | 0.66 | 103 |
| ma_crossover | SOLUSDT 1d | 123.74 | +84.83 | 38.91 | 61.00 | 0.62 | 66 |
| donchian_breakout | SOLUSDT 1d | 76.28 | +37.37 | 38.91 | 59.25 | 0.52 | 46 |
| ma_crossover | ETHUSDT 1d | 56.62 | +27.51 | 29.11 | 57.19 | 0.41 | 82 |

## Analyse

1. **L'échelle de temps domine tout.** Sur **1d**, les stratégies de suivi de tendance
   (ma_crossover, macd, donchian) explosent le buy & hold (+85 à +109 pts d'alpha).
   Sur **15m / 1h**, presque tout perd lourdement : 100-700 trades, et les frais +
   slippage rongent le capital (Sharpe jusqu'à −29). **Le sur-trading est l'ennemi n°1.**
2. **`ma_crossover` est le grand gagnant** : +24 pts d'alpha moyen, bat le B&H sur 5/8
   jeux, brille sur le daily. C'est le socle naturel des campagnes suivantes.
3. **`donchian_breakout`** est le second suiveur de tendance solide (+8,7 alpha, 5/8).
4. Les stratégies de **retour à la moyenne** (rsi, bollinger) ont un bon **win rate**
   (60-75 %) mais un alpha négatif : elles gagnent souvent un peu et perdent gros
   rarement — profil inverse de la tendance.
5. Les **drawdowns sont élevés partout** (40-78 %) : piste pour la campagne sizing /
   gestion du risque (SL/TP).

## Décisions

- **Garder** ma_crossover et donchian_breakout comme cœurs ; les **tuner** (campagne 2).
- **Concentrer** les backtests porteurs sur le **daily** (et tester si un tuning rend
  le 1h viable), car le court terme est structurellement perdant ici.
- Explorer un **filtre de tendance** pour couper le sur-trading sur petites échelles
  (piste campagne 5).
- macd sur SOLUSDT/BTCUSDT 1d est très bon ponctuellement → le réévaluer tuné.
