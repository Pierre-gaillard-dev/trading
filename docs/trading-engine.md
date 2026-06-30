# Spécification — Moteur de trading (frais, slippage, sizing, précision, PnL, risque)

Cette fiche définit **les formules exactes** du cœur d'exécution, de façon à pouvoir écrire des tests déterministes. Tous les montants sont en **décimal** (`decimal.js`), **jamais en `float`**.

> Convention : v1 **long / flat** uniquement. On est soit à plat (pas de position), soit détenteur d'**un seul lot**. Pas de short, pas de pyramiding (un `BUY` n'a d'effet qu'à plat ; un `SELL` solde toute la position). Cela simplifie radicalement la base de coût et le PnL.

## 1. Spécification d'un symbole (`SymbolSpec`)

Inspirée des contraintes réelles de Binance (`exchangeInfo`). Pilote les arrondis et les rejets.

| Champ            | Exemple (BTCUSDT) | Rôle                                                              |
| ---------------- | ----------------- | ----------------------------------------------------------------- |
| `base`           | `BTC`             | Actif acheté/vendu.                                               |
| `quote`          | `USDT`            | Devise de cotation et du cash.                                    |
| `basePrecision`  | `8`               | Décimales max de la quantité.                                     |
| `quotePrecision` | `2`               | Décimales max des montants en quote.                              |
| `stepSize`       | `0.00001`         | Pas de quantité (lot size). Toute quantité doit être un multiple. |
| `minNotional`    | `10` (USDT)       | Notionnel minimum d'un ordre ; en dessous → **rejet**.            |

## 2. Frais & slippage

Deux paramètres, configurables **par portefeuille** :

| Param         | Type        | Défaut          | Description                                                         |
| ------------- | ----------- | --------------- | ------------------------------------------------------------------- |
| `feeRate`     | décimal ≥ 0 | `0.001` (0,1 %) | Frais proportionnels au notionnel (modèle « taker »).               |
| `slippageBps` | entier ≥ 0  | `5` (0,05 %)    | Dégradation du prix d'exécution, en points de base (1 bp = 0,01 %). |

### 2.1 Prix d'exécution (slippage)

Le slippage joue **toujours en défaveur** du trader :

- Achat : `execPrice = marketPrice × (1 + slippageBps / 10000)`
- Vente : `execPrice = marketPrice × (1 − slippageBps / 10000)`

`execPrice` est arrondi à `quotePrecision` (ROUND_HALF_UP).

### 2.2 Frais

Sur chaque exécution : `fee = notional × feeRate` où `notional = qty × execPrice`.
`fee` est arrondi à `quotePrecision`, **ROUND_UP** (l'exchange ne s'arrondit jamais en sa défaveur).
Les frais sont **toujours prélevés en quote** (USDT).

### 2.3 Effet sur le cash

- **Achat** : `cash -= (notional + fee)`. La position reçoit `qty` (entière).
- **Vente** : `cash += (notional − fee)`. La position diminue de `qty` (ici : passe à 0).

## 3. Sizing — `SizingPolicy` (port)

La stratégie dit _quoi_ (BUY/SELL/HOLD), la `SizingPolicy` dit _combien_. Interface pluggable ; **implémentation par défaut : fraction fixe du cash**.

```ts
export interface SizingPolicy {
  /** Quantité (en base) à acheter, déjà arrondie au stepSize, ou 0 si impossible. */
  sizeForBuy(input: {
    cash: Decimal;
    execPrice: Decimal;
    feeRate: Decimal;
    spec: SymbolSpec;
  }): Decimal;
}
```

### 3.1 `FixedFractionSizing` (défaut)

| Param      | Défaut | Description                                                        |
| ---------- | ------ | ------------------------------------------------------------------ |
| `fraction` | `0.95` | Part du cash disponible engagée à chaque achat (0 < fraction ≤ 1). |

Calcul (on veut `qty × execPrice × (1 + feeRate) ≤ cash × fraction`) :

```
budget = cash × fraction
rawQty = budget / (execPrice × (1 + feeRate))
qty    = floorToStep(rawQty, spec.stepSize)        // arrondi vers le BAS au lot
si qty × execPrice < spec.minNotional  -> qty = 0  // trade trop petit : on n'achète pas
```

> L'arrondi **vers le bas** garantit qu'on ne dépasse jamais le cash (invariant testé).

Autres implémentations prévues (mêmes tests, branchables plus tard) : `FixedNotionalSizing` (montant fixe par trade), `AllInSizing` (fraction = 1).

## 4. Gestion du risque (SL / TP) — niveau bot

Optionnels, configurés sur le `BotConfig`. Évalués **à chaque bougie clôturée, uniquement si en position, et AVANT** la consultation de la stratégie (le risque est prioritaire).

| Param           | Type                | Défaut | Description                                 |
| --------------- | ------------------- | ------ | ------------------------------------------- |
| `stopLossPct`   | décimal > 0 \| null | `null` | Vente si la perte latente atteint ce seuil. |
| `takeProfitPct` | décimal > 0 \| null | `null` | Vente si le gain latent atteint ce seuil.   |

Règle (sur le `close` de la bougie, pour rester déterministe) :

```
si en position:
  si stopLossPct  != null et close <= avgEntryPrice × (1 − stopLossPct)   -> SELL (raison: STOP_LOSS)
  si takeProfitPct!= null et close >= avgEntryPrice × (1 + takeProfitPct) -> SELL (raison: TAKE_PROFIT)
sinon -> on consulte la stratégie
```

> Variante réaliste « intrabar » (tester SL sur `low` et TP sur `high`) : reportée ; nécessite une règle de priorité si les deux sont touchés dans la même bougie (par défaut SL prioritaire). v1 = sur `close`.

## 5. Cycle de vie d'un ordre

```
Stratégie/Risque -> Signal -> Sizing -> Order(PENDING)
   -> ExecutionEngine.execute(order, marketPrice)
        -> calcule execPrice (slippage) + fee
        -> valide (qty>0, notional>=minNotional, cash suffisant pour un BUY, qty détenue pour un SELL)
        -> si invalide: Order(REJECTED, reason)
        -> sinon: produit Fill, mute Portfolio, Order(FILLED)
```

- **MARKET** (v1) : exécuté immédiatement au `execPrice`.
- **LIMIT** (v1.1) : `FILLED` seulement si le prix franchit la limite (`BUY` si `marketPrice ≤ limitPrice`, `SELL` si `marketPrice ≥ limitPrice`), sinon reste `PENDING`. _(à détailler au lot concerné)_

### Motifs de rejet (`OrderStatus.REJECTED`)

`INSUFFICIENT_FUNDS`, `INSUFFICIENT_POSITION`, `BELOW_MIN_NOTIONAL`, `NON_POSITIVE_QUANTITY`.

## 6. PnL & equity (définitions)

- **Base de coût** : `avgEntryPrice = execPrice` de l'achat (pas de pyramiding en v1).
- **PnL réalisé d'un aller-retour** (net de frais) :
  `realized = (qtySell × execSell − feeSell) − (qtyBuy × execBuy + feeBuy)`
  C'est déjà reflété dans le `cash` après la vente.
- **PnL latent** (position ouverte, brut) : `unrealized = qty × (marketPrice − avgEntryPrice)`.
- **Equity (mark-to-market)** : `equity = cash + Σ(position.qty × marketPrice)`.

## 7. Exemple chiffré (à transformer en test)

Portefeuille : `cash = 10 000 USDT`, `feeRate = 0.001`, `slippageBps = 5`, `fraction = 0.95`. Symbole BTCUSDT (`stepSize = 0.00001`, `minNotional = 10`). `marketPrice = 20 000`.

- `execPrice (BUY) = 20000 × (1 + 0.0005) = 20010.00`
- `budget = 10000 × 0.95 = 9500`
- `rawQty = 9500 / (20010 × 1.001) = 0.474288…` → `qty = 0.47428` (floor au stepSize)
- `notional = 0.47428 × 20010 = 9490.34 (…)` ; `fee = ⌈9490.34 × 0.001⌉₂ = 9.50`
- `cash = 10000 − (9490.34 + 9.50) = 500.16` ; position = `0.47428 BTC @ 20010`

Puis vente à `marketPrice = 22 000` :

- `execPrice (SELL) = 22000 × (1 − 0.0005) = 21989.00`
- `notional = 0.47428 × 21989 = 10428.94` ; `fee = 10.43`
- `cash = 500.16 + (10428.94 − 10.43) = 10918.67`
- `realized ≈ (10428.94 − 10.43) − (9490.34 + 9.50) = +918.67 USDT`

_(les valeurs exactes seront figées par les tests une fois `decimal.js` branché)_

## 8. Cas de test (Vitest)

**Slippage / frais / prix d'exécution**

1. `execPrice` BUY/SELL conforme à la formule (arrondi quote).
2. `fee` arrondi **vers le haut** à `quotePrecision`.

**Sizing (`FixedFractionSizing`)** 3. Quantité calculée = exemple §7 (floor au stepSize). 4. Le total débité ne dépasse **jamais** le cash (invariant). 5. `fraction` = 1 (all-in) : engage tout le cash, reste ≥ 0. 6. Cash trop faible → `qty = 0` → pas d'ordre. 7. Notionnel sous `minNotional` → `qty = 0`.

**ExecutionEngine** 8. BUY nominal → Fill correct, cash & position mis à jour. 9. BUY sans fonds → `REJECTED: INSUFFICIENT_FUNDS`, état inchangé. 10. SELL sans position → `REJECTED: INSUFFICIENT_POSITION`. 11. Quantité ≤ 0 → `REJECTED: NON_POSITIVE_QUANTITY`. 12. Notionnel < minNotional → `REJECTED: BELOW_MIN_NOTIONAL`.

**Risque (SL/TP)** 13. En position, `close` sous le stop → `SELL (STOP_LOSS)`, stratégie non consultée. 14. En position, `close` au-dessus du take-profit → `SELL (TAKE_PROFIT)`. 15. SL et TP `null` → comportement piloté uniquement par la stratégie. 16. À plat → SL/TP ignorés.

**PnL / equity** 17. Aller-retour gagnant → `realized` net de frais conforme à §7. 18. `equity` mark-to-market = `cash + qty × marketPrice`. 19. PnL latent = `qty × (marketPrice − avgEntryPrice)`.

**Précision** 20. `floorToStep` : arrondi correct au stepSize, jamais au-dessus. 21. Aucun montant monétaire n'est un `number` flottant (revue + types).

## Voir aussi

- [Cahier des charges §5.1](./CAHIER_DES_CHARGES.md) · [Métriques](./metrics.md) · [Stratégies](./strategies/README.md)
