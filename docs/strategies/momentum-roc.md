# Stratégie — Momentum / Rate of Change (`momentum_roc`)

**Famille :** momentum · **Clé :** `momentum_roc`

## Idée

« Ce qui monte tend à continuer de monter. » On mesure le **rendement** sur les N dernières périodes (Rate of Change). S'il devient positif (ou dépasse un seuil), le momentum est haussier → **acheter** ; s'il devient négatif (ou passe sous un seuil bas) → **vendre**.

## Indicateur & formule

Rate of Change sur `period` (en %) :

`ROC_t = (close_t − close_{t-period}) / close_{t-period} × 100`

- `ROC > 0` : prix au-dessus de son niveau d'il y a `period` bougies → momentum haussier.
- `ROC < 0` : momentum baissier.
- Le franchissement de la **ligne zéro** est le signal central.

## Paramètres

| Param | Type | Défaut | Description |
|---|---|---|---|
| `period` | `int > 0` | `12` | Horizon du rendement. |
| `buyThreshold` | `number` | `0` | ROC au-dessus duquel on achète (en %). |
| `sellThreshold` | `number` | `0` | ROC en dessous duquel on vend (en %). |

Variante : `buyThreshold = +2`, `sellThreshold = -2` crée une **zone morte** autour de 0 qui réduit les faux signaux.
**Validation** : `period > 0`, `sellThreshold <= buyThreshold`.
**`minCandles` = `period + 2`** (il faut `ROC(now)` et `ROC(prev)` pour détecter un franchissement ; `ROC` exige `period+1` clôtures).

## Règles de signal

```
soit r = ROC(now), rPrev = ROC(prev)
si r ou rPrev indisponible -> HOLD
si rPrev <= buyThreshold  && r > buyThreshold   -> BUY
si rPrev >= sellThreshold && r < sellThreshold  -> SELL
sinon -> HOLD
```

## Forces / faiblesses

- ✅ Très simple, capte tôt les accélérations de tendance.
- ✅ Un seul paramètre principal (`period`).
- ❌ Bruité : ROC est volatil, d'où l'intérêt des seuils / zone morte.
- ❌ Mauvais en marché plat ; achète parfois au sommet d'un pic.

## Cas de test (Vitest)

1. Données insuffisantes → `HOLD`.
2. `roc()` sur série connue → valeurs en % attendues (et `null` en début de série).
3. Hausse continue → ROC franchit 0 vers le haut → `BUY`.
4. Baisse continue → ROC franchit 0 vers le bas → `SELL`.
5. Zone morte (`buy=+2`, `sell=-2`) : ROC à `+1` → `HOLD` (pas de signal dans la bande).
6. ROC qui reste positif plusieurs bougies → un seul `BUY`.
7. `close_{t-period} == 0` (cas dégénéré) → division par zéro gérée (renvoie `null`/`HOLD`, jamais `Infinity`/`NaN`).
8. Config invalide (`period <= 0`, `sell > buy`) → erreur.

## Squelette d'implémentation

```ts
export class MomentumRocStrategy implements Strategy {
  readonly key = 'momentum_roc';
  readonly minCandles: number;
  constructor(private readonly p: MomentumParams) {
    assert(p.period > 0 && p.sellThreshold <= p.buyThreshold);
    this.minCandles = p.period + 2;
  }
  decide(ctx: StrategyContext): Signal {
    const closes = ctx.candles.map(c => c.close);
    const r = roc(closes, this.p.period);
    const [prev, now] = lastTwo(r);
    if (prev == null || now == null) return 'HOLD';
    if (prev <= this.p.buyThreshold && now > this.p.buyThreshold) return 'BUY';
    if (prev >= this.p.sellThreshold && now < this.p.sellThreshold) return 'SELL';
    return 'HOLD';
  }
}
```

## Sources
- [TrendSpider — Rate of Change (ROC)](https://trendspider.com/learning-center/rate-of-change-roc-indicator-a-comprehensive-guide/)
- [Fidelity — Rate of Change](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/roc)
- [QuantifiedStrategies — ROC backtest](https://www.quantifiedstrategies.com/rate-of-change-trading-strategy/)
