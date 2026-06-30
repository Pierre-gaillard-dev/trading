# Campagne 7 — Recherche de profit en COURT TERME (15m / 1h)

**Script** : `experiments/09-short-term.ts` · objectif : trouver un **PnL positif** (pas juste « battre le buy & hold ») en 15m/1h. Nouveaux jeux étendus (10 000 bougies, ≈14 mois en 1h / 104 j en 15m), découpés en **30 sous-fenêtres** (5 par jeu). On teste mean-reversion, tendance, et le **stop-loss / take-profit** (levier nouveau). Multi-seed (1,2,3).

## Le contexte : 21 des 30 sous-fenêtres sont baissières

Les données récentes (mi-2025 → mi-2026) sont surtout en baisse. Faire du profit **long-only**
quand le marché chute est structurellement quasi impossible — ce n'est pas un défaut de
stratégie, c'est le marché.

## Toutes les sous-fenêtres (30)

| Config | PnL moy % | PnL médian % | Profitable | Trades moy |
|---|--:|--:|--:|--:|
| buy_and_hold (réf) | **-5.29** | -8.06 | 9/30 | 1 |
| rsi 14 + SL3/TP6 | -5.92 | -6.01 | 8/30 | 24 |
| rsi 14 (30/70) | -6.32 | -4.84 | 10/30 | 15 |
| rsi 7 (25/75) | -7.45 | -5.72 | 9/30 | 33 |
| donchian 20/10 + SL3/TP6 | -9.46 | -12.03 | 6/30 | 60 |
| … (tendance ma/macd) | -11 à -23 | | 1-4/30 | 88-152 |

**Aucune config n'a un PnL moyen positif.** Les moins mauvaises ≈ buy & hold.

## Sous-fenêtres HAUSSIÈRES (10) — qui capte la hausse ?

| Config | PnL moy % | Profitable | Trades moy |
|---|--:|--:|--:|
| **buy_and_hold (réf)** | **+14.76** | **9/10** | 1 |
| ma EMA 9/21 + SL2/TP10 | +3.37 | 4/10 | 84 |
| rsi 14 (30/70) | +1.72 | 6/10 | 15 |
| ma EMA 9/21 | +0.17 | 3/10 | 84 |
| (le reste) | ≤ 0 | | |

→ **En marché haussier, ne rien faire (buy & hold) bat toutes les stratégies actives.**
Le trading actif churn en frais et **rate** l'essentiel du mouvement.

## Sous-fenêtres BAISSIÈRES (20) — qui limite la casse ?

| Config | PnL moy % | Profitable | Trades moy |
|---|--:|--:|--:|
| **rsi 14 + SL3/TP6** | **-8.69** | 3/20 | 26 |
| rsi 14 (30/70) | -10.34 | 4/20 | 15 |
| donchian 20/10 + SL3/TP6 | -13.80 | 1/20 | 58 |
| buy_and_hold (réf) | -15.32 | 0/20 | 1 |
| ma EMA 9/21 (tendance) | -20.57 | 0/20 | 90 |

→ En marché baissier, **personne ne profite** ; le RSI + stop-loss **perd le moins** (−8,7 % vs
−15,3 % pour le buy & hold). C'est **défensif**, pas profitable.

## Conclusion (sans complaisance)

1. **Sur ce marché (récent, surtout baissier), aucune stratégie ne fait de profit fiable en
   court terme.** Le profit n'apparaît que dans les fenêtres haussières — et là, **buy & hold
   gagne**, le trading actif fait moins bien.
2. Le **SL/TP aide à perdre moins** en baisse, mais ne crée pas de profit.
3. La **tendance** (ma/donchian/macd) est la **pire** en court terme : 88-152 trades, frais
   qui rongent tout. La **mean-reversion (RSI)** est la moins mauvaise approche active.
4. Pour viser un vrai profit court terme, il faudrait des leviers que ce moteur ne modélise
   pas : **vente à découvert** (gagner en baisse), effet de levier, signaux intraday
   (carnet d'ordres), ou détection de régime pour **rester hors marché** en baisse.

## Décision

- **Pas de code shippé ici** : il serait malhonnête de présenter une stratégie « profitable »
  court terme — la donnée dit qu'elle n'existe pas dans cet échantillon.
- Recommandation court terme la plus défendable : **RSI 14 + stop-loss** comme profil
  **défensif** (limite la casse), en sachant qu'il ne profite qu'en marché porteur.
- Le vrai profit reste sur le **daily en tendance** (campagnes 1-2). Le court terme long-only
  est un piège sur cet échantillon.
