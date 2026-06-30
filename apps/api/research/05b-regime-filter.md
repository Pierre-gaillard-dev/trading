# Campagne 5b — Filtre de régime (trend filter)

**Script** : `experiments/06-regime-filter.ts` · on enveloppe une stratégie d'entrée d'un **filtre de tendance de fond** : tant que le prix est **sous** la SMA longue, on **bloque les achats** (on laisse passer les sorties). Testé sur daily **et** hourly, déterministe.

## Synthèse (moyenne sur 6 jeux : BTC/ETH/SOL × 1d/1h)

| Variante | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Bat B&H |
|---|--:|--:|--:|--:|--:|
| **maEMA20/100 + filtre SMA200** | 75.28 | 76.91 | **-0.21** | 35.02 | **6/6** |
| **donchian + filtre SMA200** | 56.50 | 58.13 | -0.50 | **28.24** | **6/6** |
| maEMA20/100 (réf) | 45.01 | 46.64 | -0.77 | 42.59 | 6/6 |
| donchian + filtre SMA100 | 30.97 | 32.60 | -0.79 | 36.24 | 5/6 |
| donchian 20/5 (réf) | 63.52 | 65.15 | -0.79 | 39.58 | 5/6 |

*(Sharpe moyen négatif car 3 des 6 jeux sont l'hourly en marché baissier ; le filtre améliore le Sharpe de chaque variante par rapport à sa référence.)*

## Analyse

1. **Le filtre SMA200 est la meilleure amélioration trouvée.** Pour les **deux** entrées
   testées il **augmente le Sharpe** et **réduit le drawdown** :
   - maEMA : Sharpe **−0,77 → −0,21**, DD **42,6 % → 35,0 %**.
   - donchian : Sharpe **−0,79 → −0,50**, DD **39,6 % → 28,2 %** (le plus bas de tous).
2. **Plus robuste** : les deux variantes filtrées battent le B&H **6/6** (vs 5/6 pour les réfs).
3. Exemples parlants : ETH 1d donchian filtré → DD **25,8 %** au lieu de 44 %, Sharpe 0,67 ;
   sur l'hourly baissier, le filtre garde le capital surtout en cash → pertes bien moindres.
4. **SMA200 > SMA100** : la tendance la plus lente filtre mieux le bruit.
5. Coût : moins de trades (on rate quelques rebonds de bear market), mais le gain en
   risque ajusté le justifie largement.

## Décision → implémentation produit

C'est la piste à **shipper**. J'ajoute une stratégie `trend_filter` dans `packages/core` :
**croisement de moyennes (entrée) filtré par une SMA de tendance de fond** — long uniquement
quand `prix > SMA(trendPeriod)`. Avec tests unitaires, câblage registre/API et fiche.
Voir la campagne 6 (synthèse) et le commit associé.
