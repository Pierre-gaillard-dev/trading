# Spécification — API REST & protocole WebSocket

Contrat entre `apps/api` (Fastify) et `apps/web`. Types partagés et validés via **zod** dans `packages/shared`. Tous les corps sont en JSON ; tous les montants sont des **chaînes décimales** (pas de `number` flottant) pour préserver la précision.

## 1. Conventions

- Base URL REST : `/api`.
- Format d'erreur uniforme :
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {} } }
  ```
- Codes HTTP : `200` OK, `201` créé, `204` sans contenu, `400` validation, `404` introuvable, `409` conflit d'état (ex. start d'un bot déjà démarré), `500` erreur serveur.
- Montants : chaînes (`"10000.00"`). Horodatages : epoch ms (entier) ou ISO 8601 (à figer ; défaut **epoch ms**).
- Idempotence : `start`/`stop` d'un bot sont idempotents (re-`start` d'un bot `RUNNING` → `200`, pas d'erreur ni de double-démarrage).

## 2. Endpoints REST

### Stratégies

| Méthode | Chemin            | Description                                                                                            |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `GET`   | `/api/strategies` | Liste des stratégies disponibles + **schéma de paramètres** (pour générer le formulaire du dashboard). |

Réponse :

```json
[
  {
    "key": "rsi",
    "name": "RSI",
    "family": "mean_reversion",
    "params": [
      { "name": "period", "type": "int", "default": 14, "min": 2 },
      { "name": "oversold", "type": "number", "default": 30 },
      { "name": "overbought", "type": "number", "default": 70 }
    ]
  }
]
```

### Portefeuilles

| Méthode  | Chemin                          | Description                                                          |
| -------- | ------------------------------- | -------------------------------------------------------------------- |
| `GET`    | `/api/portfolios`               | Liste (avec equity & PnL courants).                                  |
| `POST`   | `/api/portfolios`               | Crée un portefeuille.                                                |
| `GET`    | `/api/portfolios/:id`           | Détail.                                                              |
| `DELETE` | `/api/portfolios/:id`           | Supprime (refusé `409` si un bot tourne dessus).                     |
| `GET`    | `/api/portfolios/:id/positions` | Positions courantes.                                                 |
| `GET`    | `/api/portfolios/:id/orders`    | Historique des ordres.                                               |
| `GET`    | `/api/portfolios/:id/trades`    | Aller-retours / fills.                                               |
| `GET`    | `/api/portfolios/:id/metrics`   | Métriques (cf. [metrics.md](./metrics.md)) + comparaison buy & hold. |

`POST /api/portfolios` (corps) :

```json
{
  "name": "RSI sur BTC",
  "baseCurrency": "USDT",
  "initialCash": "10000.00",
  "feeRate": "0.001",
  "slippageBps": 5
}
```

### Bots

| Méthode  | Chemin                | Description                     |
| -------- | --------------------- | ------------------------------- |
| `GET`    | `/api/bots`           | Liste des bots + statut.        |
| `POST`   | `/api/bots`           | Crée un bot (config).           |
| `GET`    | `/api/bots/:id`       | Détail.                         |
| `POST`   | `/api/bots/:id/start` | Démarre (idempotent).           |
| `POST`   | `/api/bots/:id/stop`  | Arrête (idempotent).            |
| `DELETE` | `/api/bots/:id`       | Supprime (doit être `STOPPED`). |

`POST /api/bots` (corps) :

```json
{
  "portfolioId": "pf_123",
  "symbol": "BTCUSDT",
  "interval": "1m",
  "strategyKey": "rsi",
  "params": { "period": 14, "oversold": 30, "overbought": 70 },
  "sizing": { "type": "fixed_fraction", "fraction": 0.95 },
  "risk": { "stopLossPct": "0.05", "takeProfitPct": "0.10" }
}
```

`risk.stopLossPct` / `takeProfitPct` peuvent être `null`. Validation : `symbol` connu, `strategyKey` connu, `params` conformes au schéma de la stratégie, `0 < fraction ≤ 1`.

## 3. Protocole WebSocket

- Endpoint : `/ws`.
- Le client **s'abonne** à un portefeuille ou un bot ; le serveur **pousse** les mises à jour.
- Tous les messages : `{ "type": "...", "payload": { ... } }`.

### Messages client → serveur

```json
{ "type": "subscribe",   "payload": { "portfolioId": "pf_123" } }
{ "type": "unsubscribe", "payload": { "portfolioId": "pf_123" } }
```

### Messages serveur → client

| `type`       | Quand                            | `payload`                                            |
| ------------ | -------------------------------- | ---------------------------------------------------- |
| `candle`     | Nouvelle bougie clôturée         | `{ symbol, interval, candle: { t, o, h, l, c, v } }` |
| `order`      | Ordre créé/rejeté/rempli         | `{ portfolioId, order }`                             |
| `trade`      | Fill exécuté                     | `{ portfolioId, trade }`                             |
| `portfolio`  | Equity/cash/positions mis à jour | `{ portfolioId, cash, equity, positions }`           |
| `bot_status` | Changement d'état d'un bot       | `{ botId, status, reason? }`                         |
| `error`      | Erreur de flux                   | `{ code, message }`                                  |

> Le `ReplayFeed` émet exactement les mêmes messages `candle` que le live → le front et les tests E2E sont identiques en live et en rejeu.

## 4. Cas de test

- **Contrat REST (Vitest)** : création portefeuille (validation des montants en chaîne), création bot avec params invalides → `400` + `code`, start idempotent → `200`, delete d'un portefeuille avec bot actif → `409`, `GET /strategies` renvoie les schémas attendus.
- **WebSocket (Vitest)** : `subscribe` puis réception d'un `candle`/`trade` ; `unsubscribe` stoppe les pushes ; message inconnu → `error`.
- **Perf (k6)** : montée en charge sur `GET /portfolios/:id/metrics` (seuil ex. p95 < 200 ms) et tenue de N connexions WebSocket simultanées avec M bots actifs.
- **E2E (Playwright)** : parcours complet via l'API + dashboard (cf. [cahier §7](./CAHIER_DES_CHARGES.md)).

## Voir aussi

- [Cahier des charges §5.5](./CAHIER_DES_CHARGES.md) · [Moteur de trading](./trading-engine.md) · [Métriques](./metrics.md)
