# Stratégie — Croisement filtré par régime de tendance (`trend_filter`)

**Famille :** suivi de tendance + filtre de régime · **Clé :** `trend_filter`

## Idée

Un croisement de moyennes mobiles classique (comme `ma_crossover`) **génère beaucoup de
faux signaux en marché baissier** : on « attrape les couteaux qui tombent ». On ajoute donc
un **filtre de régime** : une SMA longue (`trendPeriod`, défaut 200) qui définit la tendance
de fond. **On n'autorise les achats que si le prix est au-dessus de cette SMA.** Sous la
SMA (régime baissier), les achats sont bloqués ; seules les **sorties** (SELL) passent.

Cette stratégie est issue de la recherche d'optimisation (`apps/api/research/`), où le filtre
SMA200 a, sur 6 jeux (BTC/ETH/SOL × 1d/1h), **amélioré le Sharpe et réduit le drawdown** de
toutes les entrées testées, et battu le buy & hold **6/6**.

## Paramètres

| Param         | Type           | Défaut | Description                                                   |
| ------------- | -------------- | ------ | ------------------------------------------------------------- |
| `maType`      | `'SMA'\|'EMA'` | `EMA`  | Type de moyenne pour le croisement d'entrée.                  |
| `fastPeriod`  | `int > 0`      | `20`   | Moyenne rapide (entrée).                                      |
| `slowPeriod`  | `int > fast`   | `100`  | Moyenne lente (entrée).                                       |
| `trendPeriod` | `int > 1`      | `200`  | SMA de tendance de fond (filtre de régime).                   |

**Validation** : `fastPeriod` entier `> 0`, `slowPeriod` entier `> fastPeriod`,
`trendPeriod` entier `> 1`.
**`minCandles` = `max(slowPeriod, trendPeriod) + 1`**.

## Règles de signal

```
si bougies insuffisantes (< minCandles) -> HOLD
soit base = signal du croisement (fast vs slow) :
    fast croise AU-DESSUS de slow -> BUY
    fast croise EN-DESSOUS de slow -> SELL
    sinon -> HOLD
soit trend = SMA(closes, trendPeriod) à la dernière bougie
si prix < trend (régime baissier) :
    renvoyer SELL si base == SELL, sinon HOLD   (achats bloqués)
sinon :
    renvoyer base
```

> Rappel contrat : `BUY` n'agit que si l'on est à plat, `SELL` que si l'on est en position
> (géré par le `TradingBot`). La stratégie reste pure et déterministe.

## Forces / faiblesses

- ✅ Réduit nettement le **drawdown** et améliore le **Sharpe** vs un croisement nu.
- ✅ Plus **robuste** d'un actif/échelle à l'autre (a battu le B&H sur les 6 jeux testés).
- ✅ Coupe le sur-trading en marché baissier (on reste surtout en cash).
- ❌ Rate quelques rebonds de bear market (entrées retardées tant que le prix n'a pas
  repassé la SMA longue).
- ❌ Comme tout suiveur de tendance : peu efficace en marché sans direction (range).

## Cas de test (Vitest) — `trend-filter.strategy.test.ts`

1. Données insuffisantes (`< minCandles`) → `HOLD`.
2. Croisement haussier **ET** prix > SMA de tendance → `BUY`.
3. Croisement haussier **mais** prix < SMA de tendance → achat bloqué → `HOLD`.
4. Croisement baissier sous la SMA de tendance → `SELL` (les sorties passent toujours).
5. Pas de croisement → `HOLD`.
6. Paramètres invalides (`fastPeriod ≤ 0`, `slowPeriod ≤ fastPeriod`, `trendPeriod ≤ 1`) → erreur.
7. Intégration registre : présente dans `STRATEGY_KEYS`, fabriquée par `createStrategy`.
