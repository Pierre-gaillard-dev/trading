# Stratégie — Série de bougies (`candle_streak`)

**Famille :** retour à la moyenne (contrarien) · **Clé :** `candle_streak`

## Idée

« Une chute s'épuise, une hausse aussi. » On compte les bougies consécutives de même
couleur. Après **N bougies rouges** d'affilée (baisse continue), on parie sur le rebond →
**acheter**. Après **M bougies vertes** d'affilée (hausse continue), on prend ses gains →
**vendre**. Stratégie volontairement naïve, utile comme cas d'école et comme membre d'un
ensemble pondéré.

## Couleur d'une bougie

- **Rouge** : `close < open` (a clôturé sous son ouverture).
- **Verte** : `close > open`.
- **Neutre** : `close == open` → casse la série (ni rouge ni verte).

## Paramètres

| Param         | Type      | Défaut | Description                                          |
| ------------- | --------- | ------ | --------------------------------------------------- |
| `redToBuy`    | `int > 0` | `3`    | Bougies rouges consécutives qui déclenchent l'achat. |
| `greenToSell` | `int > 0` | `5`    | Bougies vertes consécutives qui déclenchent la vente.|

**Validation** : `redToBuy > 0`, `greenToSell > 0` (entiers).
**`minCandles` = `max(redToBuy, greenToSell)`** (il faut au moins ce nombre de bougies pour
qu'une série puisse atteindre le seuil).

## Règles de signal

```
soit c = couleur de la dernière bougie
si bougies insuffisantes (< minCandles) -> HOLD
si c == neutre -> HOLD
soit k = longueur de la série de couleur c finissant sur la dernière bougie
si c == rouge && k >= redToBuy   -> BUY
si c == verte && k >= greenToSell -> SELL
sinon -> HOLD
```

> Rappel contrat : `BUY` n'agit que si l'on est à plat, `SELL` que si l'on est en position
> (géré par le `TradingBot`). La stratégie reste pure : elle ne lit que les bougies.

## Forces / faiblesses

- ✅ Ultra-simple, aucun indicateur, lisible sur le graphe (compter les bougies).
- ✅ Contrarien : achète dans les creux, vend dans les pics.
- ❌ Naïve : en tendance forte, « 3 rouges » peut n'être que le début d'une longue chute
  (on achète trop tôt) ; « 5 verts » coupe une tendance haussière prématurément.
- ❌ Sensible au bruit des petites bougies (un doji casse la série).

## Cas de test (Vitest)

1. Données insuffisantes (`< minCandles`) → `HOLD`.
2. Exactement `redToBuy` rouges consécutives en fin de série → `BUY`.
3. `redToBuy - 1` rouges → `HOLD`.
4. Exactement `greenToSell` vertes consécutives → `SELL`.
5. Série de rouges interrompue par une bougie verte/neutre, puis repart → le compteur
   redémarre (pas de `BUY` tant que le seuil n'est pas réatteint).
6. Bougie neutre (`close == open`) en dernier → `HOLD`.
7. Plus de rouges que `redToBuy` (ex. 4 alors que seuil 3) → toujours `BUY` (seuil = minimum).
8. Paramètres invalides (`redToBuy <= 0`, non entier) → erreur.

## Squelette d'implémentation

```ts
export class CandleStreakStrategy implements Strategy {
  readonly key = 'candle_streak';
  readonly minCandles: number;
  constructor(p: CandleStreakParams) {
    assert(p.redToBuy > 0 && p.greenToSell > 0);
    this.minCandles = Math.max(p.redToBuy, p.greenToSell);
  }
  decide(ctx: StrategyContext): Signal {
    const cs = ctx.candles;
    if (cs.length < this.minCandles) return 'HOLD';
    const c = color(cs.at(-1));            // 'red' | 'green' | 'flat'
    if (c === 'flat') return 'HOLD';
    const k = trailingStreak(cs, c);       // bougies consécutives de couleur c
    if (c === 'red' && k >= this.redToBuy) return 'BUY';
    if (c === 'green' && k >= this.greenToSell) return 'SELL';
    return 'HOLD';
  }
}
```

## Note

Stratégie « pour rire » / pédagogique : aucune base théorique solide, parfaite pour
illustrer qu'une règle simple se mesure objectivement (cf. backtest & métriques) plutôt que
de se juger à l'intuition.
