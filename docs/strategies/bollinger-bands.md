# Stratégie — Bandes de Bollinger (`bollinger_bands`)

**Famille :** volatilité + retour à la moyenne (variante cassure possible) · **Clé :** `bollinger_bands`

## Idée

On encadre le prix par une moyenne mobile ± un multiple de l'**écart-type** (volatilité). Les bandes se resserrent quand le marché est calme, s'élargissent quand il s'agite. **Mode retour à la moyenne (par défaut)** : le prix touche la bande basse → trop bas, on **achète** ; touche la bande haute → trop haut, on **vend**. **Mode cassure (option)** : sortir au-dessus de la bande haute = élan haussier → on **achète**.

## Indicateur & formules

Sur `period` (défaut 20), multiplicateur `k` (défaut 2) :
- `middle = SMA(close, period)`
- `σ = écart-type (population, ÷ period) des `period` dernières clôtures`
- `upper = middle + k·σ` ; `lower = middle − k·σ`

> ⚠️ Écart-type **population (÷N)** vs **échantillon (÷(N−1))** : choisir population (convention Bollinger) et **le tester**, sinon les bandes diffèrent légèrement.

## Paramètres

| Param | Type | Défaut | Description |
|---|---|---|---|
| `period` | `int > 1` | `20` | Fenêtre de la SMA et de l'écart-type. |
| `k` | `number > 0` | `2` | Nombre d'écarts-types pour les bandes. |
| `mode` | `'reversion' \| 'breakout'` | `'reversion'` | Sens d'interprétation des touches de bande. |

**Validation** : `period > 1`, `k > 0`.
**`minCandles` = `period + 1`** (besoin de la bande courante et de la précédente pour détecter une transition).

## Règles de signal

**Mode `reversion`** (par défaut) — on signale au **franchissement** pour éviter de répéter le signal tant que le prix longe la bande :

```
si bandes indisponibles -> HOLD
si close repasse <= lower (croise vers le bas la bande basse)  -> BUY
si close repasse >= upper (croise vers le haut la bande haute) -> SELL
sinon -> HOLD
```

**Mode `breakout`** (inversé) :

```
si close franchit au-dessus de upper -> BUY
si close franchit au-dessous de lower -> SELL
sinon -> HOLD
```

> Option avancée fréquente : sortir une position quand le prix **revient sur la bande médiane** (`middle`). À documenter comme règle de sortie si tu l'implémentes.

## Forces / faiblesses

- ✅ S'adapte à la volatilité (bandes dynamiques).
- ✅ Le « squeeze » (bandes resserrées) signale souvent un mouvement imminent.
- ❌ En mode reversion : se faire « rouler dessus » en forte tendance (le prix longe la bande).
- ❌ Choix `reversion` vs `breakout` change tout — facile de se tromper de régime de marché.

## Cas de test (Vitest)

1. Données insuffisantes → `HOLD`.
2. `bands()` sur série connue → `middle/upper/lower` conformes (test de l'écart-type **population**).
3. Série de prix constants → `σ = 0` → `upper == lower == middle` ; aucune touche → `HOLD`.
4. Mode reversion : franchissement de la bande basse → `BUY`.
5. Mode reversion : franchissement de la bande haute → `SELL`.
6. Mode breakout : même série → signaux **inversés** par rapport à reversion.
7. Prix qui longe la bande sur plusieurs bougies → un seul signal (grâce au franchissement).
8. Config invalide (`k <= 0`, `period <= 1`) → erreur.

## Squelette d'implémentation

```ts
export class BollingerBandsStrategy implements Strategy {
  readonly key = 'bollinger_bands';
  readonly minCandles: number;
  constructor(private readonly p: BollingerParams) {
    assert(p.period > 1 && p.k > 0);
    this.minCandles = p.period + 1;
  }
  decide(ctx: StrategyContext): Signal {
    const closes = ctx.candles.map(c => c.close);
    if (closes.length < this.minCandles) return 'HOLD';
    const { upper, lower } = bollinger(closes, this.p.period, this.p.k);
    const [cPrev, cNow] = lastTwo(closes);
    const [uPrev, uNow] = lastTwo(upper), [lPrev, lNow] = lastTwo(lower);
    const touchLow  = crossesBelow(cPrev, cNow, lPrev, lNow);
    const touchHigh = crossesAbove(cPrev, cNow, uPrev, uNow);
    if (this.p.mode === 'breakout') return touchHigh ? 'BUY' : touchLow ? 'SELL' : 'HOLD';
    return touchLow ? 'BUY' : touchHigh ? 'SELL' : 'HOLD'; // reversion
  }
}
```

## Sources
- [StockCharts — Bollinger Bands](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-overlays/bollinger-bands)
- [QuantInsti — Bollinger Bands explained](https://blog.quantinsti.com/bollinger-bands/)
