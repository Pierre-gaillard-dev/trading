# Campagne 8 — Inversion au niveau de l'ENSEMBLE (option `invert`)

**Script** : `experiments/10-invert-ensemble.ts` · pour quelques ensembles de stratégies
sélectionnées, compare la décision **normale** vs **inversée** (`invert: true`). L'inversion
agit sur la **décision finale agrégée** de l'ensemble : quand les stratégies sélectionnées
pencheraient pour acheter → on vend (et inversement), HOLD inchangé. Moyenne 8 jeux × 5 seeds.

## Résultats (moyenne 8 jeux × 5 seeds)

| Ensemble | PnL moy % | Alpha moy | Sharpe moy | DD moy % | Profitable |
|---|--:|--:|--:|--:|--:|
| rsi seul | -27.96 | -19.86 | -1.27 | 44.41 | 0/8 |
| **inverse[rsi seul]** | **+41.66** | +49.76 | -1.73 | 40.33 | 3/8 |
| rsi + bollinger (mean-reversion) | -20.42 | -12.32 | -1.66 | 49.42 | 1/8 |
| **inverse[rsi + bollinger]** | **+11.49** | +19.58 | -2.11 | 38.37 | 3/8 |
| ma_crossover + donchian (tendance) | +32.14 | +40.24 | -3.51 | 44.61 | 3/8 |
| inverse[ma_crossover + donchian] | -31.50 | -23.40 | -2.01 | 53.80 | 0/8 |

## Analyse

1. **L'option fait exactement ce qui était demandé** : elle inverse la décision **nette de
   l'ensemble** des stratégies sélectionnées (pas chaque membre séparément). On nie le score
   pondéré agrégé → même intensité (donc même fréquence d'action), direction opposée.
2. **Inverser un ensemble perdant aide** : `inverse[rsi]` passe de −28 % à **+42 %** ;
   `inverse[rsi+bollinger]` de −20 % à **+11 %**. Économiquement : inverser des stratégies
   de retour à la moyenne (perdantes en marché qui tend) revient à faire du momentum.
3. **Inverser un ensemble gagnant le détruit** : `ma_crossover + donchian` (+32 %) devient
   −31 % une fois inversé. Donc **pas un bouton à profit** : ça ne paie que si l'ensemble se
   trompe systématiquement.
4. Implémentation : flag `invert` sur `EnsembleStrategy` / `createEnsemble`, exposé sur
   `POST /api/bots` et `POST /api/backtest`, persisté dans `BotConfig`. Déterministe (pour
   un seed donné), testé (core + bot-manager + route).

## Décision

- Option livrée comme **interrupteur unique au niveau du bot/backtest** (`invert: true`).
- Reste du **surapprentissage** sur un marché donné : l'inverse n'est utile que si la base
  est durablement perdante, ce qui n'est pas prévisible à l'avance. À valider en train/test.
- Rappel : paper trading fictif, aucun conseil financier.
