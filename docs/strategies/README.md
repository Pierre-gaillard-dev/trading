# Stratégies de trading — index & contrat commun

Ce dossier décrit chaque stratégie implémentée par les bots. **Chaque fiche est pensée pour être traduite directement en tests** : les règles de signal y sont écrites de façon déterministe, et une section « Cas de test » liste les scénarios à couvrir avec Vitest.

> ⚠️ Rappel : projet **pédagogique**, paper trading **fictif**. Ces stratégies sont des classiques d'analyse technique, **pas** des conseils en investissement. Aucune ne « gagne » de façon garantie — l'intérêt du projet est justement de **mesurer** si elles seraient rentables (voir métriques dans le cahier des charges).

## Liste des stratégies

| Clé (`strategyKey`) | Fiche                                                        | Famille                          | Idée en une phrase                                                              |
| ------------------- | ------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------- |
| `ma_crossover`      | [moving-average-crossover.md](./moving-average-crossover.md) | Suivi de tendance                | Acheter quand une MA courte passe au-dessus d'une MA longue.                    |
| `rsi`               | [rsi.md](./rsi.md)                                           | Retour à la moyenne              | Acheter en survente (RSI bas), vendre en surachat (RSI haut).                   |
| `macd`              | [macd.md](./macd.md)                                         | Momentum / tendance              | Acheter quand la ligne MACD croise au-dessus de sa ligne de signal.             |
| `bollinger_bands`   | [bollinger-bands.md](./bollinger-bands.md)                   | Volatilité / retour à la moyenne | Acheter au contact de la bande basse, vendre au contact de la bande haute.      |
| `momentum_roc`      | [momentum-roc.md](./momentum-roc.md)                         | Momentum                         | Acheter quand le rendement sur N périodes passe au-dessus de 0 (ou d'un seuil). |
| `donchian_breakout` | [donchian-breakout.md](./donchian-breakout.md)               | Cassure / suivi de tendance      | Acheter sur cassure du plus haut des N dernières périodes.                      |
| `buy_and_hold`      | [buy-and-hold.md](./buy-and-hold.md)                         | Référence (benchmark)            | Acheter une fois, ne plus jamais vendre. Sert d'étalon.                         |
| `candle_streak`     | [candle-streak.md](./candle-streak.md)                       | Retour à la moyenne (contrarien) | Acheter après N bougies rouges d'affilée, vendre après M bougies vertes.        |

## Contrat commun : l'interface `Strategy`

Toutes les stratégies implémentent la même interface (port défini dans `packages/core`). Une stratégie est une **fonction pure et déterministe** : à entrée identique, sortie identique. Elle ne fait **aucune IO**, n'appelle ni l'horloge système ni l'aléa, et ne mute pas son contexte.

```ts
/** Décision émise par une stratégie pour une bougie donnée. */
export type Signal = 'BUY' | 'SELL' | 'HOLD';

/** Tout ce dont une stratégie a besoin pour décider. Immuable. */
export interface StrategyContext {
  /** Bougies clôturées, ordre chronologique (la plus récente en dernier). */
  readonly candles: readonly Candle[];
  /** Position actuelle sur le symbole, ou null si à plat (flat). */
  readonly position: Position | null;
}

export interface Strategy {
  /** Identifiant stable utilisé en base et dans l'API. */
  readonly key: string;
  /** Nombre minimal de bougies requis avant de pouvoir décider. */
  readonly minCandles: number;
  /** Décision pour la dernière bougie du contexte. Pure & déterministe. */
  decide(context: StrategyContext): Signal;
}
```

### Conventions de signal partagées par toutes les stratégies

- `BUY` n'a d'effet que si on est **à plat** (`position === null`) ; sinon le bot ignore (idempotence des positions, pas de pyramidage en v1).
- `SELL` n'a d'effet que si on est **en position** ; vendu = retour à plat. Pas de vente à découvert en v1.
- `HOLD` = ne rien faire.
- Si `candles.length < minCandles` → la stratégie renvoie **toujours `HOLD`** (données insuffisantes). C'est un cas de test obligatoire pour chaque stratégie.
- On décide sur **bougies clôturées** uniquement (pas sur la bougie en cours de formation) pour éviter le « repaint » et garder le déterminisme.

> Le **sizing** (quelle quantité acheter/vendre) n'est PAS dans la stratégie : la stratégie dit _quoi_ faire (BUY/SELL/HOLD), le `TradingBot` + une politique de sizing décident _combien_. Cela garde les stratégies pures et testables isolément.

## Indicateurs (fonctions pures réutilisables)

Les fiches s'appuient sur des indicateurs implémentés dans `packages/core/src/application/indicators/` :

| Indicateur | Signature                                                      | Notes                                                           |
| ---------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| SMA        | `sma(values: number[], period: number): (number \| null)[]`    | `null` tant que `i < period - 1`.                               |
| EMA        | `ema(values: number[], period: number): (number \| null)[]`    | seed = SMA des `period` premières valeurs ; `k = 2/(period+1)`. |
| RSI        | `rsi(closes: number[], period = 14): (number \| null)[]`       | lissage de **Wilder** (voir fiche RSI).                         |
| MACD       | `macd(closes, fast, slow, signal)`                             | renvoie `{ macd, signal, histogram }`.                          |
| Écart-type | `stddev(values: number[], period: number): (number \| null)[]` | population (÷N), cohérent avec Bollinger.                       |
| ROC        | `roc(closes: number[], period: number): (number \| null)[]`    | en %.                                                           |

Chaque indicateur a ses propres tests unitaires (valeurs connues, gestion des `null` en début de série, périodes invalides).

## Détection de croisement (helper commun)

Beaucoup de stratégies reposent sur un **croisement** (crossover/crossunder). On factorise un helper testé une fois :

```ts
/** true si `a` passe strictement au-dessus de `b` entre l'avant-dernier et le dernier point. */
crossesAbove(aPrev, aNow, bPrev, bNow): boolean  // aPrev <= bPrev && aNow > bNow
crossesBelow(aPrev, aNow, bPrev, bNow): boolean  // aPrev >= bPrev && aNow < bNow
```

Cas de test du helper : croisement haussier, baissier, simple contact (égalité) sans franchissement, séries plates.

## Sources (analyse technique)

- [StockCharts — RSI / ChartSchool](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi)
- [StockCharts — Bollinger Bands](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-overlays/bollinger-bands)
- [TrendSpider — Golden/Death Cross](https://trendspider.com/learning-center/golden-cross-death-cross-trading-strategies/)
- [QuantInsti — Bollinger Bands](https://blog.quantinsti.com/bollinger-bands/)
