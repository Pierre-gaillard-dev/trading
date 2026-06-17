# Stratégie — RSI (Relative Strength Index) (`rsi`)

**Famille :** retour à la moyenne (mean reversion) · **Clé :** `rsi`

## Idée

Le RSI est un **oscillateur** borné entre 0 et 100 qui mesure la vitesse et l'ampleur des hausses récentes par rapport aux baisses. Intuition : un actif qui a beaucoup monté est « suracheté » (les acheteurs s'essoufflent) → il pourrait redescendre ; trop baissé = « survendu » → rebond probable. On **achète en survente** (RSI bas) et on **vend en surachat** (RSI haut).

## Indicateur & formule (lissage de Wilder)

Sur une période `n` (par défaut 14), à partir des variations de clôture `Δ = close_t − close_{t-1}` :
- `gain = max(Δ, 0)`, `perte = max(−Δ, 0)`.
- **Première valeur** : `avgGain = moyenne des gains sur n`, `avgLoss = moyenne des pertes sur n`.
- **Valeurs suivantes (lissage de Wilder)** :
  `avgGain_t = (avgGain_{t-1}·(n−1) + gain_t) / n`
  `avgLoss_t = (avgLoss_{t-1}·(n−1) + perte_t) / n`
- `RS = avgGain / avgLoss` puis `RSI = 100 − 100 / (1 + RS)`.
- Cas limite : si `avgLoss = 0` → `RSI = 100` ; si `avgGain = 0` → `RSI = 0`.

> ⚠️ Le lissage de Wilder ≠ moyenne simple. C'est un piège classique d'implémentation **à tester explicitement** : la première valeur utilise une moyenne simple, les suivantes le lissage récursif.

## Paramètres

| Param | Type | Défaut | Description |
|---|---|---|---|
| `period` | `int > 1` | `14` | Fenêtre du RSI. |
| `oversold` | `0–100` | `30` | Seuil de survente (déclenche l'achat). |
| `overbought` | `0–100` | `70` | Seuil de surachat (déclenche la vente). |

Variantes : seuils `20/80` (moins de faux signaux, moins de trades) ; période plus courte = plus sensible.
**Validation** : `0 < oversold < overbought < 100`, `period > 1`.
**`minCandles` = `period + 1`** (besoin d'au moins une valeur de RSI, donc `period` variations).

## Règles de signal

Deux variantes possibles ; on retient par défaut la **variante « franchissement »** (moins bavarde, déterministe) :

```
soit r = RSI(now), rPrev = RSI(prev)
si RSI indisponible (null)                 -> HOLD
si rPrev >= oversold   && r < oversold     -> BUY    (entrée en survente)
si rPrev <= overbought && r > overbought   -> SELL   (entrée en surachat)
sinon                                       -> HOLD
```

Variante « niveau » (plus simple, plus de signaux) : `BUY si r < oversold`, `SELL si r > overbought`. À documenter comme option `mode: 'cross' | 'level'` si tu veux la tester aussi.

## Forces / faiblesses

- ✅ Excellent en marché **sans tendance** (range) : achète bas, vend haut.
- ✅ Borné et lisible.
- ❌ **Dangereux en forte tendance** : en gros bull market, le RSI peut rester > 70 longtemps → vendre trop tôt ; en bear market rester < 30 → acheter dans la chute.
- ❌ Sensible au choix des seuils.

## Cas de test (Vitest)

1. Données insuffisantes → `HOLD`.
2. **Première valeur de RSI** sur série connue == valeur attendue (moyenne simple).
3. **Lissage de Wilder** sur la valeur suivante == valeur attendue (formule récursive) — le test qui attrape l'erreur la plus fréquente.
4. Série de hausses uniquement → `avgLoss = 0` → `RSI = 100`.
5. Série de baisses uniquement → `avgGain = 0` → `RSI = 0`.
6. Franchissement descendant sous `oversold` → `BUY` ; rester sous le seuil ensuite → `HOLD` (un seul signal).
7. Franchissement montant au-dessus de `overbought` → `SELL`.
8. RSI qui oscille entre les seuils → `HOLD`.
9. Config invalide (`oversold >= overbought`, période ≤ 1) → erreur.

## Squelette d'implémentation

```ts
export class RsiStrategy implements Strategy {
  readonly key = 'rsi';
  readonly minCandles: number;
  constructor(private readonly p: RsiParams) {
    assert(0 < p.oversold && p.oversold < p.overbought && p.overbought < 100 && p.period > 1);
    this.minCandles = p.period + 1;
  }
  decide(ctx: StrategyContext): Signal {
    const closes = ctx.candles.map(c => c.close);
    if (closes.length < this.minCandles) return 'HOLD';
    const r = rsi(closes, this.p.period);          // série avec null en tête
    const [prev, now] = lastTwo(r);
    if (prev == null || now == null) return 'HOLD';
    if (prev >= this.p.oversold && now < this.p.oversold) return 'BUY';
    if (prev <= this.p.overbought && now > this.p.overbought) return 'SELL';
    return 'HOLD';
  }
}
```

## Sources
- [StockCharts — RSI (lissage de Wilder)](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi)
- [Fidelity — What is RSI](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/RSI)
- [QuantInsti — RSI formula & Python](https://blog.quantinsti.com/rsi-indicator/)
