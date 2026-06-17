# Stratégie — MACD (Moving Average Convergence Divergence) (`macd`)

**Famille :** momentum / suivi de tendance · **Clé :** `macd`

## Idée

Le MACD mesure l'écart entre une EMA rapide et une EMA lente : c'est un indicateur de **momentum**. Quand cet écart (la « ligne MACD ») croise au-dessus de sa propre moyenne lissée (la « ligne de signal »), le momentum devient haussier → **acheter** ; croisement inverse → **vendre**.

## Indicateur & formules

Paramètres classiques `(12, 26, 9)` :

- `MACD_t = EMA(close, fast) − EMA(close, slow)` (fast=12, slow=26)
- `Signal_t = EMA(MACD, signalPeriod)` (signalPeriod=9)
- `Histogramme_t = MACD_t − Signal_t`

L'histogramme > 0 ⇔ MACD au-dessus du signal (biais haussier) ; < 0 ⇔ biais baissier. Le franchissement du zéro par l'histogramme correspond exactement au croisement MACD/Signal.

## Paramètres

| Param             | Type               | Défaut  | Description                                                                        |
| ----------------- | ------------------ | ------- | ---------------------------------------------------------------------------------- |
| `fastPeriod`      | `int > 0`          | `12`    | EMA rapide.                                                                        |
| `slowPeriod`      | `int > fastPeriod` | `26`    | EMA lente.                                                                         |
| `signalPeriod`    | `int > 0`          | `9`     | EMA de la ligne MACD.                                                              |
| `requirePositive` | `bool`             | `false` | Si vrai, n'achète que si `MACD > 0` (filtre de tendance, réduit les faux signaux). |

**Validation** : `fastPeriod < slowPeriod`, toutes périodes > 0.
**`minCandles`** : il faut `slowPeriod` bougies pour la 1re valeur MACD, puis `signalPeriod` valeurs MACD pour la 1re valeur de signal, plus 1 pour le croisement → `≈ slowPeriod + signalPeriod + 1` (à caler précisément selon le seed EMA choisi, et **à figer par un test**).

## Règles de signal

```
si MACD ou Signal indisponibles (null)              -> HOLD
soit m=MACD(now), mPrev=MACD(prev), s=Signal(now), sPrev=Signal(prev)
si crossesAbove(mPrev, m, sPrev, s)
   et (!requirePositive || m > 0)                    -> BUY
si crossesBelow(mPrev, m, sPrev, s)                  -> SELL
sinon                                                -> HOLD
```

## Forces / faiblesses

- ✅ Combine tendance et momentum ; populaire et lisible (3 composantes).
- ✅ L'histogramme donne une lecture de la **force** du mouvement.
- ❌ Indicateur **retardé** (basé sur des EMA) → signaux tardifs.
- ❌ Faux signaux en marché plat ; sensible aux trois paramètres.

## Cas de test (Vitest)

1. Données insuffisantes → `HOLD`.
2. `macd()` sur série connue → `{ macd, signal, histogram }` conformes aux fixtures (attention au **seed des EMA**, source d'erreurs).
3. Identité `histogram === macd − signal` sur toute la série.
4. Croisement MACD au-dessus du signal → `BUY`.
5. Croisement en dessous → `SELL`.
6. `requirePositive: true` : croisement haussier mais `MACD < 0` → `HOLD` (filtre actif).
7. Persistance au-dessus du signal sur plusieurs bougies → un seul `BUY`.
8. Config invalide (`fast >= slow`) → erreur.

## Squelette d'implémentation

```ts
export class MacdStrategy implements Strategy {
  readonly key = 'macd';
  readonly minCandles: number;
  constructor(private readonly p: MacdParams) {
    assert(p.fastPeriod < p.slowPeriod);
    this.minCandles = p.slowPeriod + p.signalPeriod + 1;
  }
  decide(ctx: StrategyContext): Signal {
    const closes = ctx.candles.map((c) => c.close);
    const { macd: m, signal: s } = macd(
      closes,
      this.p.fastPeriod,
      this.p.slowPeriod,
      this.p.signalPeriod,
    );
    const [mp, mn] = lastTwo(m),
      [sp, sn] = lastTwo(s);
    if (mp == null || mn == null || sp == null || sn == null) return 'HOLD';
    if (crossesAbove(mp, mn, sp, sn) && (!this.p.requirePositive || mn > 0)) return 'BUY';
    if (crossesBelow(mp, mn, sp, sn)) return 'SELL';
    return 'HOLD';
  }
}
```

## Sources

- [StockCharts — MACD Histogram](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/macd-histogram)
- [Capital.com — MACD strategies & settings](https://capital.com/en-int/learn/technical-analysis/macd-trading-strategy)
