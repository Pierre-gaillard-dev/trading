# Stratégie — Cassure de canal de Donchian (`donchian_breakout`)

**Famille :** cassure (breakout) / suivi de tendance · **Clé :** `donchian_breakout`

## Idée

Le canal de Donchian trace le **plus haut** et le **plus bas** des N dernières bougies. Quand le prix **clôture au-dessus** du plus haut récent, c'est une cassure haussière (nouveau sommet local) → **acheter** et suivre la tendance. Quand il clôture sous le plus bas récent → **vendre**. C'est le cœur de la célèbre méthode des « Turtle Traders ».

## Indicateur & formules

Sur `period` (défaut 20), en excluant la bougie courante du calcul des extrêmes (sinon le prix « casse » toujours son propre niveau) :

- `upper_t = max(high_{t-1} … high_{t-period})`
- `lower_t = min(low_{t-1} … low_{t-period})`
- `middle_t = (upper_t + lower_t) / 2` (sert de stop suiveur / sortie)

> ⚠️ Détail d'implémentation crucial **à tester** : le canal se calcule sur les `period` bougies **précédentes**, pas en incluant la bougie en cours. Sinon la condition de cassure devient impossible à satisfaire correctement.

## Paramètres

| Param         | Type      | Défaut | Description                                                            |
| ------------- | --------- | ------ | ---------------------------------------------------------------------- |
| `entryPeriod` | `int > 0` | `20`   | Fenêtre du canal d'entrée (cassure du plus haut).                      |
| `exitPeriod`  | `int > 0` | `10`   | Fenêtre du canal de sortie (cassure du plus bas), souvent plus courte. |

**Validation** : périodes entières > 0.
**`minCandles` = `max(entryPeriod, exitPeriod) + 1`**.

## Règles de signal

```
soit upperEntry = plus haut des entryPeriod bougies précédentes
soit lowerExit  = plus bas  des exitPeriod  bougies précédentes
si données insuffisantes -> HOLD
si close_now > upperEntry  -> BUY    (cassure haussière)
si close_now < lowerExit   -> SELL   (cassure baissière / sortie)
sinon -> HOLD
```

## Forces / faiblesses

- ✅ Capte les **grandes tendances** dès leur début (cassure).
- ✅ Règles objectives, faciles à coder et à tester.
- ✅ Excellent en marché crypto qui « trend » fort.
- ❌ Beaucoup de **fausses cassures** en marché plat (le prix repique aussitôt).
- ❌ Sorties parfois tardives → rend une partie des gains.

## Cas de test (Vitest)

1. Données insuffisantes → `HOLD`.
2. `donchian()` sur série connue → `upper/lower/middle` attendus, **calculés sur les bougies précédentes** (test du décalage).
3. Clôture qui dépasse strictement le plus haut des N précédentes → `BUY`.
4. Clôture sous le plus bas des N précédentes → `SELL`.
5. Clôture **égale** au plus haut (sans le dépasser) → `HOLD` (comparaison stricte).
6. Marché en range serré → pas de cassure → `HOLD`.
7. `entryPeriod ≠ exitPeriod` → les deux canaux sont calculés sur les bonnes fenêtres.
8. Config invalide (période ≤ 0) → erreur.

## Squelette d'implémentation

```ts
export class DonchianBreakoutStrategy implements Strategy {
  readonly key = 'donchian_breakout';
  readonly minCandles: number;
  constructor(private readonly p: DonchianParams) {
    assert(p.entryPeriod > 0 && p.exitPeriod > 0);
    this.minCandles = Math.max(p.entryPeriod, p.exitPeriod) + 1;
  }
  decide(ctx: StrategyContext): Signal {
    const cs = ctx.candles;
    if (cs.length < this.minCandles) return 'HOLD';
    const prior = cs.slice(0, -1); // exclut la bougie courante
    const upper = Math.max(...prior.slice(-this.p.entryPeriod).map((c) => c.high));
    const lower = Math.min(...prior.slice(-this.p.exitPeriod).map((c) => c.low));
    const close = cs[cs.length - 1].close;
    if (close > upper) return 'BUY';
    if (close < lower) return 'SELL';
    return 'HOLD';
  }
}
```

## Sources

- [LuxAlgo — Donchian Channels breakout & trend-following](https://www.luxalgo.com/blog/donchian-channels-breakout-and-trend-following-strategy/)
- [TrendSpider — Donchian Channel strategies](https://trendspider.com/learning-center/donchian-channel-trading-strategies/)
