# BDD — User stories & scénarios (comportement attendu)

> **BDD = Behaviour-Driven Development.** On décrit le produit par des **user stories** (« en tant que… je veux… afin de… ») et des **scénarios** au format Gherkin (`Étant donné` / `Quand` / `Alors`). Chaque scénario décrit **un comportement observable** — donc **un test**.
>
> Lien avec le cours de tests : `Étant donné` = _Arrange_, `Quand` = _Act_, `Alors` = _Assert_.
>
> **Périmètre de ce fichier :** la partie **utilisateur / dashboard** (le [cahier des charges](./CAHIER_DES_CHARGES.md) couvre surtout le moteur de trading et les [stratégies](./strategies/README.md)). Ce document complète le cahier sur tout ce que vit l'utilisateur dans l'interface.

## Légende des statuts

- ✅ **Implémenté** (présent dans le code aujourd'hui)
- 🟡 **Partiel** (implémenté en partie, à compléter)
- 🔜 **À venir** (prévu, pas encore codé)

## Conventions Gherkin (français)

```
Fonctionnalité: <ce que l'on décrit>
  En tant que <rôle>
  Je veux <action / capacité>
  Afin de <bénéfice>

  Scénario: <cas précis>
    Étant donné <contexte / état initial>
    Quand <action déclenchée>
    Alors <résultat attendu>
    Et <résultat additionnel>
```

---

# 1. Authentification

## 1.1 Connexion ✅

```
Fonctionnalité: Connexion
  En tant qu'utilisateur
  Je veux me connecter avec mon email et mon mot de passe
  Afin d'accéder à mon tableau de bord

  Scénario: Connexion réussie
    Étant donné que je suis sur la page /login
    Et que je ne suis pas connecté
    Quand je saisis un email et mode de passe valides
    Et que je valide le formulaire
    Alors le serveur me renvoie un jeton (JWT)
    Et je suis redirigé vers /dashboard

  Scénario: Mot de passe incorrect
    Étant donné que je suis sur la page /login
    Quand je saisis un email connu mais un mauvais mot de passe
    Alors le serveur répond une erreur (HTTP 401)
    Et un message « Identifiants invalides » s'affiche
    Et je reste sur /login

  Scénario: Email inconnu
    Étant donné que je suis sur la page /login
    Quand je saisis un email qui n'existe pas
    Alors le serveur répond « Identifiants invalides » (HTTP 401)
    Et le message ne révèle pas si l'email existe ou non

  Scénario: Mot de passe non conforme aux règles (vérif. front)
    Étant donné que je suis sur la page /login
    Quand je saisis un mot de passe qui ne respecte pas les règles (ex. trop court)
    Et que je valide le formulaire
    Alors un message liste les règles non respectées
    Et aucune requête n'est envoyée au serveur

  Scénario: Champs vides
    Étant donné que je suis sur la page /login
    Quand je valide sans saisir email ou mot de passe
    Alors le formulaire bloque l'envoi (champs requis)

  Scénario: Retour visuel pendant la connexion
    Étant donné que j'ai validé le formulaire
    Quand la requête est en cours
    Alors le bouton est désactivé et affiche « Connexion… »
```

## 1.2 Déconnexion ✅

```gherkin
Fonctionnalité: Déconnexion
  En tant qu'utilisateur connecté
  Je veux me déconnecter
  Afin de sécuriser mon accès

  Scénario: Se déconnecter depuis le dashboard
    Étant donné que je suis connecté sur /dashboard
    Quand je clique sur « Se déconnecter »
    Alors mon jeton est effacé
    Et je suis redirigé vers /login

  Scénario: Plus d'accès après déconnexion
    Étant donné que je viens de me déconnecter
    Quand j'essaie d'accéder à /dashboard
    Alors je suis redirigé vers /login
```

## 1.3 Session & persistance 🟡

```gherkin
Fonctionnalité: Persistance de la session
  En tant qu'utilisateur connecté
  Je veux rester connecté entre les rechargements de page
  Afin de ne pas me reconnecter sans cesse

  Scénario: Rechargement de page en restant connecté  # ✅
    Étant donné que je suis connecté
    Quand je recharge la page
    Alors je suis toujours connecté
    Et je reste sur la page courante

  Scénario: Jeton expiré ou invalide  # 🔜
    Étant donné que mon jeton est expiré ou falsifié
    Quand j'ouvre une page protégée
    Alors je suis traité comme non connecté
    Et je suis redirigé vers /login
```

## 1.4 Robustesse du mot de passe (règle métier partagée) ✅

```gherkin
Fonctionnalité: Règles de robustesse du mot de passe
  En tant que système
  Je veux imposer un mot de passe robuste
  Afin de protéger les comptes

  Règle: au moins 12 caractères, une minuscule, une majuscule, un chiffre, un caractère spécial

  Scénario: Mot de passe conforme
    Quand on valide "Demo$Trade2026"
    Alors le résultat est « valide » sans erreur

  Plan du scénario: Règle manquante  # une ligne = un test
    Quand on valide <mot_de_passe>
    Alors le résultat contient l'erreur <erreur>

    Exemples:
      | mot_de_passe     | erreur                      |
      | "court1$A"       | Au moins 12 caractères      |
      | "toutminuscule1$"| Au moins une majuscule      |
      | "TOUTMAJUSCULE1$"| Au moins une minuscule      |
      | "SansChiffre!!Ab" | Au moins un chiffre        |
      | "SansSpecial12Ab" | Au moins un caractère spécial |
```

---

# 2. Navigation & protection des routes ✅

```gherkin
Fonctionnalité: Accès aux pages selon l'état de connexion
  En tant qu'utilisateur
  Je veux être dirigé vers la bonne page selon que je suis connecté ou non
  Afin de ne jamais voir une page interdite

  Scénario: Page protégée sans être connecté
    Étant donné que je ne suis pas connecté
    Quand j'ouvre /dashboard
    Alors je suis redirigé vers /login

  Scénario: Page de connexion alors que je suis déjà connecté
    Étant donné que je suis connecté
    Quand j'ouvre /login
    Alors je suis redirigé vers /dashboard

  Scénario: Racine du site
    Quand j'ouvre /
    Alors je suis redirigé vers /dashboard si connecté, sinon vers /login

  Scénario: URL inconnue  # 🔜
    Quand j'ouvre une URL qui n'existe pas
    Alors une page « 404 / introuvable » s'affiche
```

---

# 3. Tableau de bord

## 3.1 Vue d'accueil 🟡

```gherkin
Fonctionnalité: Page d'accueil du dashboard
  En tant qu'utilisateur connecté
  Je veux une page d'accueil
  Afin d'avoir une vue d'ensemble

  Scénario: Voir le dashboard  # ✅ (actuellement "Hello world")
    Étant donné que je suis connecté
    Quand j'ouvre /dashboard
    Alors je vois la page du tableau de bord

  Scénario: Vue d'ensemble des portefeuilles  # 🔜
    Étant donné que je possède des portefeuilles
    Quand j'ouvre /dashboard
    Alors je vois la liste de mes portefeuilles
    Et pour chacun son equity et son PnL courants
```

---

# 4. Gestion des portefeuilles 🔜

```gherkin
Fonctionnalité: Portefeuilles fictifs
  En tant qu'utilisateur
  Je veux créer et gérer des portefeuilles fictifs
  Afin d'y faire tourner des stratégies

  Scénario: Créer un portefeuille
    Étant donné que je suis sur la page des portefeuilles
    Quand je crée un portefeuille (nom, capital initial, frais, slippage)
    Alors il apparaît dans ma liste avec son capital de départ

  Scénario: Capital initial invalide
    Quand je saisis un capital initial ≤ 0
    Alors la création est refusée avec un message d'erreur

  Scénario: Voir le détail d'un portefeuille
    Quand j'ouvre un portefeuille
    Alors je vois son cash, ses positions, ses ordres, ses trades et ses métriques

  Scénario: Supprimer un portefeuille libre
    Étant donné qu'aucun bot ne tourne sur ce portefeuille
    Quand je le supprime
    Alors il disparaît de ma liste

  Scénario: Suppression refusée si un bot tourne
    Étant donné qu'un bot est en cours d'exécution sur ce portefeuille
    Quand j'essaie de le supprimer
    Alors l'opération est refusée (HTTP 409) avec un message clair
```

---

# 5. Configuration & contrôle des bots 🔜

```gherkin
Fonctionnalité: Bots de trading
  En tant qu'utilisateur
  Je veux configurer et piloter des bots
  Afin d'automatiser des stratégies sur mes portefeuilles

  Scénario: Créer un bot
    Quand je crée un bot (portefeuille, symbole, intervalle, stratégie + paramètres, sizing, SL/TP optionnels)
    Alors le bot est créé à l'état « CREATED »

  Scénario: Démarrer un bot
    Étant donné un bot à l'arrêt
    Quand je le démarre
    Alors son statut passe à « RUNNING »
    Et il commence à recevoir les prix et à passer des ordres fictifs

  Scénario: Arrêter un bot
    Étant donné un bot en marche
    Quand je l'arrête
    Alors son statut passe à « STOPPED »
    Et il ne passe plus d'ordres

  Scénario: Démarrage idempotent
    Étant donné un bot déjà en marche
    Quand je le redémarre
    Alors rien d'anormal ne se produit (pas de double exécution)

  Scénario: Plusieurs bots en parallèle
    Étant donné plusieurs bots sur des portefeuilles différents
    Quand ils tournent en même temps
    Alors chacun gère son portefeuille de façon isolée
```

---

# 6. Choix & paramétrage des stratégies 🔜

```gherkin
Fonctionnalité: Sélection de stratégie
  En tant qu'utilisateur
  Je veux choisir et régler une stratégie
  Afin de tester différentes approches

  Scénario: Lister les stratégies disponibles
    Quand j'ouvre le sélecteur de stratégie
    Alors je vois la liste (ex. ma_crossover, rsi, macd…) avec leurs paramètres

  Scénario: Paramétrer une stratégie
    Quand je choisis une stratégie
    Alors un formulaire affiche ses paramètres avec leurs valeurs par défaut

  Scénario: Paramètres invalides
    Quand je saisis des paramètres hors limites (ex. fenêtre ≤ 0)
    Alors la validation refuse et explique l'erreur
```

---

# 7. Visualisation des performances 🔜

```gherkin
Fonctionnalité: Graphiques et métriques
  En tant qu'utilisateur
  Je veux visualiser les performances
  Afin de juger si une stratégie est rentable

  Scénario: Graphique en bougies avec les trades
    Quand j'ouvre un portefeuille
    Alors je vois un graphique en bougies du symbole
    Et des marqueurs aux moments d'achat et de vente

  Scénario: Courbe d'equity
    Alors je vois l'évolution de la valeur du portefeuille dans le temps

  Scénario: Métriques de performance
    Alors je vois le PnL, le max drawdown, le ratio de Sharpe et le win rate

  Scénario: Comparaison au buy & hold
    Alors je vois la performance comparée à « acheter et garder » (alpha)
```

---

# 8. Données de marché temps réel 🔜

```gherkin
Fonctionnalité: Flux de prix en direct
  En tant qu'utilisateur
  Je veux voir les données et mon portefeuille se mettre à jour en direct
  Afin de suivre l'activité sans recharger

  Scénario: Réception des bougies en direct
    Étant donné que je regarde un portefeuille actif
    Quand une nouvelle bougie est clôturée
    Alors le graphique se met à jour automatiquement

  Scénario: Mise à jour en direct après un trade
    Quand un bot exécute un ordre
    Alors le cash, les positions et l'equity se mettent à jour à l'écran

  Scénario: Reconnexion du flux
    Étant donné que la connexion temps réel est coupée
    Quand elle est rétablie
    Alors les mises à jour reprennent sans recharger la page
```

---

# Couverture & traçabilité

- Les scénarios ✅/🟡 décrivent du code **existant** : ils sont directement transformables en tests (Vitest pour la logique et les routes via `app.inject`, Playwright pour les parcours dashboard de bout en bout).
- Les scénarios 🔜 servent de **feuille de route** : on les implémentera lot par lot (cf. [cahier §10](./CAHIER_DES_CHARGES.md)).
- Règle : **tout nouveau comportement utilisateur ajoute (ou met à jour) un scénario ici**, puis le ou les tests correspondants.
