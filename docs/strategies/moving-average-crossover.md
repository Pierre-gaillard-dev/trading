# Stratégie — Croisement de moyennes mobiles (`ma_crossover`)

**Famille :** suivi de tendance (trend following) · **Clé :** `ma_crossover`

## Idée

Une moyenne mobile **courte** réagit vite aux prix, une **longue** réagit lentement. Quand la courte passe **au-dessus** de la longue, la tendance récente devient haussière → **acheter**. Quand elle repasse **en dessous**, la tendance se retourne → **vendre**. C'est la base du fameux _golden cross_ (50/200) et _death cross_.

## Indicateurs & formules

- **SMA** (moyenne mobile simple) sur `period` valeurs :
  `SMA_t = (P_t + P_{t-1} + … + P_{t-period+1}) / period`
- **EMA** (moyenne mobile exponentielle), plus réactive, pondère les prix récents :
  `k = 2 / (period + 1)` ; seed `EMA_0 = SMA(period)` ; puis `EMA_t = P_t·k + EMA_{t-1}·(1 - k)`

La stratégie est paramétrée par le **type** de MA (`SMA` ou `EMA`) et par les deux périodes.

## Paramètres

| Param        | Type               | Défaut  | Description              |
| ------------ | ------------------ | ------- | ------------------------ |
| `maType`     | `'SMA' \| 'EMA'`   | `'EMA'` | Type de moyenne mobile.  |
| `fastPeriod` | `int > 0`          | `9`     | Période de la MA courte. |
| `slowPeriod` | `int > fastPeriod` | `21`    | Période de la MA longue. |

Combinaisons classiques : `50/200` (golden cross, daily), `9/21` ou `20/50` (intraday crypto), `13/26`.
**Validation** : `fastPeriod < slowPeriod`, périodes entières > 0, sinon erreur de configuration.
**`minCandles` = `slowPeriod + 1`** (il faut une valeur de MA longue + la précédente pour détecter le croisement).

## Règles de signal

Soit `fast` et `slow` les séries de MA. On regarde le dernier point (`now`) et le précédent (`prev`) :

```
si fast.length < minCandles          -> HOLD
si crossesAbove(fastPrev, fastNow, slowPrev, slowNow)  -> BUY
si crossesBelow(fastPrev, fastNow, slowPrev, slowNow)  -> SELL
sinon                                                  -> HOLD
```

> On signale **sur le croisement** (transition), pas sur l'état « fast > slow ». Sinon on émettrait BUY à chaque bougie tant que la courte est au-dessus.

## Forces / faiblesses

- ✅ Simple, robuste, capte bien les grandes tendances.
- ✅ Peu de paramètres, facile à tester.
- ❌ **En retard** (lagging) : entre/sort après le vrai retournement.
- ❌ **Whipsaws** en marché plat (range) : multiplie les faux signaux et les frais.

## Cas de test (Vitest)

1. Données insuffisantes (`candles < minCandles`) → `HOLD`.
2. Croisement haussier net (courte franchit la longue par le bas) → `BUY`.
3. Croisement baissier net → `SELL`.
4. Courte reste au-dessus plusieurs bougies après le croisement → un seul `BUY`, puis `HOLD`.
5. Contact sans franchissement (égalité momentanée) → `HOLD`.
6. Marché plat (prix constants) → MAs égales, jamais de signal → `HOLD`.
7. `maType: 'SMA'` vs `'EMA'` sur la même série → valeurs/signaux conformes aux fixtures calculées à la main.
8. Config invalide (`fastPeriod >= slowPeriod`, période ≤ 0) → erreur à la construction.
9. Cohérence indicateur : `sma`/`ema` sur série connue == valeurs attendues (null en début de série).

## Squelette d'implémentation

```ts
export class MaCrossoverStrategy implements Strategy {
  readonly key = 'ma_crossover';
  readonly minCandles: number;
  constructor(private readonly p: MaCrossoverParams) {
    assert(p.fastPeriod < p.slowPeriod && p.fastPeriod > 0);
    this.minCandles = p.slowPeriod + 1;
  }
  decide(ctx: StrategyContext): Signal {
    const closes = ctx.candles.map((c) => c.close);
    if (closes.length < this.minCandles) return 'HOLD';
    const fast = movingAverage(this.p.maType, closes, this.p.fastPeriod);
    const slow = movingAverage(this.p.maType, closes, this.p.slowPeriod);
    const [fp, fn] = lastTwo(fast),
      [sp, sn] = lastTwo(slow);
    if (crossesAbove(fp, fn, sp, sn)) return 'BUY';
    if (crossesBelow(fp, fn, sp, sn)) return 'SELL';
    return 'HOLD';
  }
}
```

## Sources

- [TrendSpider — Golden Cross & Death Cross](https://trendspider.com/learning-center/golden-cross-death-cross-trading-strategies/)
- [TradersUnion — MA crossover strategies](https://tradersunion.com/interesting-articles/trading-strategies/ma-crossover-strategies/)
