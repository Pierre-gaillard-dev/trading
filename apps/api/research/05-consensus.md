# Campagne 5 — Combineur déterministe par consensus (prototype)

**Script** : `experiments/05-consensus.ts` · prototype hors `core` d'un combineur **sans aléa** : `score ≥ buyTh → BUY`, `score ≤ −sellTh → SELL`, sinon HOLD. Testé sur daily.

## Synthèse (moyenne sur BTC/ETH/SOL 1d)

| Variante | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |
|---|--:|--:|--:|--:|--:|
| **donchian 20/5 (réf, seule)** | 155.63 | 115.55 | **0.64** | 46.35 | **3/3** |
| consensus≥1 (don+maEMA) | 177.83 | 137.75 | 0.62 | 42.27 | 2/3 |
| consensus≥.5 (don+maEMA) | 143.55 | 103.47 | 0.60 | 46.82 | 3/3 |
| consensus≥.5 (2·don+maEMA) | 139.60 | 99.52 | 0.58 | 45.48 | 2/3 |
| consensus≥.5 (don+maEMA+macd) | 21.07 | -19.01 | 0.22 | 51.31 | 1/3 |
| consensus≥1 (don+maEMA+macd) | 0.00 | -40.08 | 0.00 | 0.00 | 0/3 |

## Analyse

1. **Le déterminisme fonctionne** : `σ(PnL) = 0` partout (vs jusqu'à 457 en campagne 4).
   On a éliminé la loterie du tirage aléatoire. ✅
2. **Mais aucune combinaison ne bat la brique `donchian 20/5` seule** (Sharpe 0,64).
   Le meilleur consensus robuste (`≥.5 don+maEMA`, 3/3) plafonne à 0,60.
3. **Pourquoi l'unanimité échoue** : ces stratégies sont **événementielles** — elles
   n'émettent BUY/SELL que sur la **bougie du croisement/cassure**, pas en continu.
   Exiger que 2-3 d'entre elles signalent **la même bougie** ne se produit quasi jamais :
   `consensus≥1 (don+maEMA)` → **2 trades**, `consensus≥1 (trio)` → **0 trade**.
   Le consensus n'a de sens qu'entre stratégies qui émettent un **état continu**.

## Conclusions

- **Négatif utile** : empiler des stratégies n'apporte **pas d'edge** ici ; la simplicité
  (une brique tunée) gagne. À recommander au produit.
- **Positif pour l'ingénierie** : un **mode seuil déterministe** pour l'ensemble est
  strictement meilleur que le mode probabiliste actuel (reproductibilité, zéro variance,
  cohérent avec la règle de déterminisme du projet) **sans rien coûter** en perf. → candidat
  à implémenter dans `core` (avec tests).
- Reste une piste pour *vraiment* augmenter le rendement ajusté : un **filtre de régime**
  (ne trader que dans le sens de la tendance de fond). → testé en campagne 5b ci-dessous.
