# Stratégie — Buy & Hold (référence / benchmark) (`buy_and_hold`)

**Famille :** référence (baseline) · **Clé :** `buy_and_hold`

## Idée

La stratégie la plus simple : **acheter une fois**, au tout début, puis **ne plus jamais vendre**. Elle ne cherche pas à « timer » le marché. Son rôle n'est pas de gagner, mais de servir d'**étalon** : une stratégie active n'a d'intérêt que si elle **bat le buy & hold** (après frais). C'est la référence à laquelle on compare toutes les autres dans le dashboard.

## Indicateur & formule

Aucun. La décision ne dépend que de l'état de la position.

## Paramètres

Aucun paramètre.
**`minCandles` = `1`**.

## Règles de signal

```
si position est null (jamais acheté) -> BUY
sinon                                 -> HOLD   (on ne vend jamais)
```

## Forces / faiblesses

- ✅ Zéro frais récurrents, zéro paramètre, imbattable en simplicité.
- ✅ Historiquement difficile à battre sur les actifs en tendance longue.
- ✅ Benchmark indispensable pour juger les autres stratégies.
- ❌ Subit **toutes** les baisses (drawdowns) sans protection.
- ❌ Aucune gestion du risque.

## Cas de test (Vitest)

1. Position `null` → `BUY`.
2. Déjà en position → `HOLD` (jamais de `SELL`).
3. Quelle que soit la série de prix (hausse, baisse, plat), après l'achat initial → toujours `HOLD`.
4. `minCandles = 1` : décide dès la première bougie.

## Squelette d'implémentation

```ts
export class BuyAndHoldStrategy implements Strategy {
  readonly key = 'buy_and_hold';
  readonly minCandles = 1;
  decide(ctx: StrategyContext): Signal {
    return ctx.position == null ? 'BUY' : 'HOLD';
  }
}
```

## Note

Cette stratégie est aussi le **cas de test le plus simple du `TradingBot`** : un scénario `ReplayFeed` où l'on vérifie qu'un seul ordre d'achat est passé puis que l'equity suit exactement le prix de l'actif (moins les frais d'entrée). Parfait pour valider la boucle complète avant d'attaquer les stratégies actives.
