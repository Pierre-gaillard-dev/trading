# Spécification — Métriques de performance (formules exactes)

Toutes les métriques sont des **fonctions pures** de `packages/core/src/application/metrics/`, calculées à partir de deux sources :
- la **courbe d'equity** : série `[{ t, equity }]` échantillonnée à chaque bougie ;
- la liste des **aller-retours clôturés** (round trips) : `[{ entryPrice, exitPrice, qty, fees, openedAt, closedAt, pnl }]`.

> Convention : un **trade** = un aller-retour complet (un BUY suivi de son SELL). Le `pnl` d'un trade est **net de frais** (cf. [trading-engine.md §6](./trading-engine.md)).

## 1. Rendements par période
À partir de la courbe d'equity `E_0, E_1, …, E_n` :

`r_t = E_t / E_{t-1} − 1`   (pour `t = 1..n`)

## 2. PnL global
- **PnL absolu** : `E_n − E_0`
- **PnL %** : `E_n / E_0 − 1`

## 3. Max drawdown (MDD)
Plus forte baisse depuis un sommet, sur la courbe d'equity. On suit le pic courant :
```
peak = E_0 ; mdd = 0
pour chaque E_t:
  peak = max(peak, E_t)
  dd   = (E_t − peak) / peak      // ≤ 0
  mdd  = min(mdd, dd)
maxDrawdown = |mdd|               // rapporté en valeur positive (ex. 0.23 = -23 %)
```

## 4. Ratio de Sharpe
Mesure le rendement ajusté du risque, **annualisé**.

```
moy   = moyenne(r)
ecart = écart-type ÉCHANTILLON de r           // ÷ (n−1)
sharpe = ((moy − rfPerPeriod) / ecart) × √(periodsPerYear)
```
- `rfPerPeriod` : taux sans risque par période. **Défaut = 0**.
- `ecart = 0` (rendements constants) → Sharpe défini comme `0` (éviter division par zéro).
- `periodsPerYear` dépend de l'intervalle de bougie (facteur d'annualisation) :

| Intervalle | `periodsPerYear` |
|---|---|
| `1m` | 525 600 |
| `5m` | 105 120 |
| `15m` | 35 040 |
| `1h` | 8 760 |
| `4h` | 2 190 |
| `1d` | 365 |

> ⚠️ Le choix **écart-type échantillon (÷ n−1)** vs population est un piège classique : on fige **n−1** et on le teste.

## 5. Statistiques sur les trades
Sur les aller-retours clôturés :
- **Nombre de trades** : `count`.
- **Win rate** : `nbTradesGagnants / nbTrades` (un trade gagnant a `pnl > 0`). Si `nbTrades = 0` → `0`.
- **Gain moyen / perte moyenne** : moyenne des `pnl > 0` / moyenne des `pnl < 0`.
- **Profit factor** : `Σ(gains) / |Σ(pertes)|`. Pertes nulles → `Infinity` (à représenter proprement, ex. `null` + flag).
- **Exposition (time in market)** : `Σ(durées en position) / durée totale` ∈ [0, 1].

## 6. Comparaison au benchmark
Le but du projet : savoir si une stratégie **bat le buy & hold** (cf. [stratégie buy_and_hold](./strategies/buy-and-hold.md)).
- `alpha = PnL%(stratégie) − PnL%(buy_and_hold)` sur la même période et le même actif.
- Affiché côte à côte dans le dashboard.

## 7. Cas de test (Vitest)
1. **Rendements** sur série connue → valeurs attendues ; série de longueur 1 → `[]`.
2. **PnL absolu & %** sur courbe connue.
3. **Max drawdown** : courbe croissante monotone → `0` ; courbe avec creux connu → valeur exacte (ex. pic 100 → creux 70 → `0.30`).
4. **Sharpe** : rendements constants → `0` (pas de division par zéro) ; série connue + intervalle `1d` → valeur attendue (vérifie l'annualisation et le `n−1`).
5. **Win rate** : 0 trade → `0` ; mix gagnants/perdants → ratio exact ; trade à `pnl = 0` compté comme **non gagnant**.
6. **Profit factor** : aucune perte → cas `Infinity`/`null` géré ; cas standard → ratio exact.
7. **Exposition** : toujours en position → `1` ; jamais → `0`.
8. **Alpha** : stratégie vs buy & hold sur la même fixture → différence attendue.
9. Robustesse : courbe vide / un seul point → pas de crash, valeurs neutres.

## 8. Signatures (esquisse)
```ts
export function periodReturns(equity: EquityPoint[]): number[];
export function totalPnl(equity: EquityPoint[]): { abs: Decimal; pct: number };
export function maxDrawdown(equity: EquityPoint[]): number;          // ∈ [0,1]
export function sharpeRatio(returns: number[], periodsPerYear: number, rfPerPeriod?: number): number;
export function tradeStats(trades: ClosedTrade[]): {
  count: number; winRate: number; avgWin: Decimal; avgLoss: Decimal;
  profitFactor: number | null; exposure: number;
};
```

## Voir aussi
- [Cahier des charges §5.4](./CAHIER_DES_CHARGES.md) · [Moteur de trading](./trading-engine.md) · [Stratégies](./strategies/README.md)
