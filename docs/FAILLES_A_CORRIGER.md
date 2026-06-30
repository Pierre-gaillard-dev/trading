# Failles à corriger

Liste des comportements suspects relevés en écrivant les tests unitaires (`api` + `shared`).
**Aucune n'a été corrigée dans le code** : les tests existants documentent le comportement *actuel*
(certains sont marqués « à signaler »). Pour chaque faille : où, ce qui se passe, ce qui devrait
se passer, et comment vérifier.

> ⚠️ En corrigeant : adapter aussi le test qui documente le comportement actuel (il deviendra faux
> une fois la faille réglée) et, si une règle change, répercuter dans la fiche/`docs` concernée.

---

## 1. `initialCash` accepte les zéros en tête

- **Fichier** : `packages/shared/src/schemas/portfolio.ts`
- **Symptôme** : `"01000"` est accepté comme capital initial (regex `^\d+(\.\d+)?$` + `Number > 0`).
- **Attendu (à décider)** : refuser les zéros non significatifs (`"01000"`), ou normaliser la valeur.
- **Risque** : montants ambigus stockés tels quels en base ; affichage incohérent côté dashboard.
- **Test concerné** : `portfolio.test.ts` → « accepte (à signaler) un montant avec zéros en tête ».
- **Piste** : durcir le regex (`^(0|[1-9]\d*)(\.\d+)?$`) ou normaliser via `Number(value).toString()`.

## 2. `feeRate` n'a aucun plafond

- **Fichier** : `packages/shared/src/schemas/portfolio.ts`
- **Symptôme** : `feeRate: "999"` (soit 99 900 % de frais par trade) passe la validation.
- **Attendu** : borner le taux de frais à une plage réaliste (ex. `0 ≤ feeRate ≤ 0.1`, soit 10 %).
- **Risque** : un portefeuille avec des frais aberrants vide instantanément le cash à chaque trade.
- **Test concerné** : `portfolio.test.ts` → « accepte (à signaler) un feeRate > 1 ».
- **Piste** : `decimalString.refine((v) => Number(v) >= 0 && Number(v) <= 0.1, 'Taux de frais hors limites')`.

## 3. Incohérence de nettoyage du symbole (bot vs watchlist)

- **Fichiers** :
  - `packages/shared/src/schemas/bot.ts` (`createBotSchema.symbol`) — **PAS** de `.trim()`
  - `packages/shared/src/schemas/watchlist.ts` (`addWatchedSymbolSchema.symbol`) — `.trim()` présent
- **Symptôme** : `"BTCUSDT "` (espace final) est accepté pour la watchlist mais **rejeté** pour la
  création de bot.
- **Attendu** : comportement homogène — rogner le symbole dans les deux schémas.
- **Risque** : un même symbole copié-collé fonctionne à un endroit, échoue à l'autre → UX déroutante.
- **Test concerné** : `bot.test.ts` (shared) → « rejette (à signaler) un symbole avec espace final, non rogné ».
- **Piste** : ajouter `.trim()` avant `.regex(...)` dans `createBotSchema.symbol`.

## 4. Prix non numérique décodé en `NaN`

- **Fichier** : `apps/api/src/services/binance/binance.client.ts` → `parseStreamMessage`
- **Symptôme** : un évènement `trade` avec `p: "abc"` renvoie `{ kind: 'price', price: NaN }`
  (`Number(payload.p)` n'est pas validé). Idem pour les champs d'une bougie (`o/h/l/c/v`).
- **Attendu** : ignorer (renvoyer `null`) un message dont le prix/les valeurs ne sont pas numériques.
- **Risque** : un `NaN` se propage dans le moteur (prix, equity, PnL) et corrompt l'état du portefeuille.
- **Test concerné** : `binance.client.unit.test.ts` → « renvoie un prix NaN (à signaler) … ».
- **Piste** : après `Number(...)`, vérifier `Number.isFinite(price)` ; sinon `return null`.

## 5. Suppressions idempotentes (204 au lieu de 404)

- **Fichiers** :
  - `apps/api/src/controllers/portfolio.controller.ts` → `remove`
  - `apps/api/src/controllers/watchlist.controller.ts` → `remove`
- **Symptôme** : `DELETE` d'un portefeuille / symbole **inexistant** (ou non possédé) renvoie `204`,
  jamais `404`. Le controller ne vérifie pas l'existence/propriété avant de supprimer.
- **Attendu (à décider)** : soit assumer l'idempotence (laisser `204` — c'est défendable en REST),
  soit renvoyer `404` quand la ressource n'existe pas / n'appartient pas à l'utilisateur.
- **Risque** : un utilisateur peut « supprimer » l'id d'un autre sans retour d'erreur (fuite d'info
  faible, mais incohérent avec les routes `trades`/`positions` qui, elles, renvoient `404`).
- **Tests concernés** :
  - `portfolio.test.ts` → « renvoie 204 même pour un id inexistant (idempotent, à confirmer) »
  - `watchlist.test.ts` → « renvoie 204 même si le symbole n'existait pas (idempotent) »
- **Piste** : si on veut `404`, faire un `findById`/check de propriété avant le `remove` (comme `bot.stop`
  qui, lui, renvoie déjà `404` correctement).

---

## Notes

- Failles **2** et **4** sont les plus importantes (intégrité de l'argent / de l'état du moteur).
- Failles **1**, **3**, **5** sont des incohérences/durcissements (qualité, UX, cohérence d'API).
- Les tests listés ci-dessus **passent actuellement** car ils décrivent l'existant ; à inverser une
  fois la correction faite.
