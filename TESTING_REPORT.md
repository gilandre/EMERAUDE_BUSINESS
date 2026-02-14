# Rapport de tests – Emeraude Business

**Date :** 7 février 2026  
**Version :** 0.1.0  
**Périmètre :** Vérification fonctionnelle, performance, sécurité.

> **Voir `TESTING_CHECKLIST.md`** pour la checklist complète détaillée.

---

## 1. Vérification fonctionnelle

### A. Authentification & RBAC

| Scénario | Statut | Notes |
|----------|--------|--------|
| Connexion admin (admin@gestionmarches.com / Admin@2026) | À exécuter | Credentials définis dans le seed. Vérifier après `npm run seed`. |
| Menus selon profil | Implémenté | Menus dynamiques via `GET /api/menus` (filtrés par `hasPermission` et profils). |
| Création utilisateur | Non implémenté | `GET/POST /api/users` sont des stubs. Création utilisateur à implémenter (formulaire admin + hash bcrypt). |
| Assignation profils | Non implémenté | Pas d’API PATCH/PUT user avec `profilId`. À ajouter côté API et UI. |
| Permissions appliquées | Implémenté | Chaque route API appelle `hasPermission(session.user.id, "xxx:read|create|...")` et renvoie 403 si refus. |

**Bugs / écarts identifiés :**
- **MIDDLEWARE :** La protection des routes protégées est en place via `withAuth` (next-auth) sur `/dashboard`, `/marches`, `/tresorerie`, `/admin`. Les routes API restent protégées par `getServerSession` dans chaque handler.
- **Audit login :** Dans `lib/auth.ts`, `LOGIN_FAILED` utilise `ipAddress: "TODO"`. À renseigner depuis `headers` ou équivalent si disponible.

---

### B. Marchés & Trésorerie

| Scénario | Statut | Notes |
|----------|--------|--------|
| Créer un marché (100 000 €) | Implémenté | `POST /api/marches` avec Zod (`createMarcheSchema`), audit log, alerte MARCHE_CREE. |
| Ajouter accompte #1 (30 000 €) → alerte | Implémenté | `POST /api/accomptes` déclenche `dispatchAlertEvent("ACOMPTE_RECU")` + notification in-app. |
| Ajouter accompte #2 (20 000 €) | Implémenté | Même endpoint. Total encaissements = 50 000 €. |
| Décaissement 60 000 € → DOIT ÉCHOUER | Implémenté | `POST /api/decaissements` calcule `disponible = encaissements - decaissements + (prefinancementMax - utilise)`. Sans préfinancement, disponible = 50 000 € ; 60 000 € renvoie 400 "Trésorerie insuffisante". |
| Décaissement 20 000 € → OK | Implémenté | 20 000 € ≤ 50 000 € → création + audit + alerte DECAISSEMENT_VALIDE. |
| Calculs automatiques | Implémenté | Synthèse (totalEncaissements, totalDecaissements, solde) calculée dans `GET /api/marches/[id]` et affichée (TresorerieWidget, liste, etc.). |

**Scénario de test manuel recommandé :**
1. Se connecter en admin.
2. Créer un marché (libellé "Test Tréso", montant 100 000 €).
3. Sur le détail du marché, onglet Accomptes : ajouter 30 000 € puis 20 000 €.
4. Onglet Décaissements : tenter 60 000 € → message d’erreur attendu ; puis 20 000 € → succès.
5. Vérifier solde = 30 000 € et notifications in-app si activées.

---

### C. Préfinancement

| Scénario | Statut | Notes |
|----------|--------|--------|
| Activer préfinancement 20 000 € | Implémenté | `POST /api/prefinancements` (upsert) avec `marcheId`, `montantMax: 20000`, `active: true`. |
| Décaisser 40 000 € (30K tréso + 10K préfin) | Implémenté | `disponible = 30000 + (20000 - 0) = 50000` ; 40 000 € autorisé. Après décaissement, préfinancement utilisé = 10 000 € (à confirmer dans le modèle Prisma : champ `utilise` mis à jour ou non – à vérifier dans l’implémentation actuelle). |
| Alertes préfinancement | Partiel | Règles TRESORERIE_SEUIL et jobs BullMQ (trésorerie faible / deadline) existent ; pas de règle dédiée "préfinancement utilisé à X%" dans le seed. |

**À vérifier dans le code :** Le modèle `Prefinancement` a un champ `utilise`. Vérifier que chaque décaissement qui “consomme” du préfinancement met à jour ce champ (sinon le calcul `disponible` dans `getSoldeMarche` reste correct car basé sur encaissements - decaissements + (montantMax - utilise), mais l’affichage “utilise” peut être faux).

---

### D. Système d’alertes

| Scénario | Statut | Notes |
|----------|--------|--------|
| Alertes automatiques | Implémenté | `dispatchAlertEvent` appelé sur création marché, accompte, décaissement. Worker BullMQ pour trésorerie faible et deadline. |
| Envoi email | Dépend de la config | Services email/SMS/push/webhook présents ; envoi réel dépend de `ConfigurationCanal` (canaux activés et credentials). |
| Notifications in-app | Implémenté | Création de `Notification` avec `canal: "in_app"` et `userId`. NotificationCenter (cloche + liste + marquer lu). |
| Historique alertes | Implémenté | `GET /api/alertes/historique` et `GET /api/alertes/executions` (notifications envoyées). Page admin/alertes/historique. |

---

### E. Audit Trail

| Scénario | Statut | Notes |
|----------|--------|--------|
| Logs connexion | Implémenté | Dans `lib/auth.ts` : `LOGIN` et `LOGIN_FAILED` avec `AuditLog`. |
| Logs CRUD marchés | Implémenté | CREATE et UPDATE dans `POST /api/marches` et `PUT /api/marches/[id]`. |
| Logs accès menus | Non tracé | Les appels à `GET /api/menus` ne créent pas d’entrée d’audit. Optionnel. |
| Exporter audit | Implémenté | `GET /api/audit?export=csv` et `?export=json` (permission `audit:export`). Liste paginée avec `GET /api/audit` (permission `audit:read`). |

**Bugs / écarts :**
- Aucun bug bloquant identifié. `ipAddress` dans les logs d’auth reste à renseigner si besoin (ex. via headers côté API).

---

## 2. Performance

| Vérification | Résultat | Détail |
|--------------|----------|--------|
| Temps de chargement < 2 s | À mesurer | Dépend du réseau et de la base. Pas de test de charge réalisé dans ce rapport. |
| Requêtes DB optimisées | Vérifié (code) | Utilisation de `select` / `include` ciblés : marches (liste et détail), accomptes, decaissements, alertes/regles. Agrégats avec `aggregate` et `_count` au lieu de charger des listes entières. |
| N+1 | À surveiller | **Worker `alert-scheduler.worker.ts` :** pour chaque marché actif, 3 requêtes (aggregate accomptes, aggregate decaissements, findUnique prefinancement). Si le nombre de marchés est élevé, envisager un groupBy ou des agrégats globaux. Aucun N+1 identifié dans les routes API principales. |
| Cache Redis | Partiel | Redis utilisé pour BullMQ (file d’alertes). Pas de cache HTTP (ex. cache de réponses API) implémenté ; les lectures passent directement par Prisma. |

**Recommandations :**
- Utiliser Prisma Studio pour contrôler les requêtes réelles (onglet “Query” ou logs Prisma).
- Pour des listes très longues (marches, audit), garder une pagination stricte (déjà en place).

---

## 3. Sécurité

| Vérification | Résultat | Détail |
|--------------|----------|--------|
| Middleware auth routes protégées | OK | `withAuth` (next-auth) sur `/dashboard`, `/marches`, `/tresorerie`, `/admin`. Redirection vers `/login` si non authentifié. |
| Validation Zod entrées | OK | Tous les POST/PUT métier utilisent un schéma Zod : marches, accomptes, decaissements, prefinancements, alertes/regles, login. Erreurs 400 avec `details` en cas d’échec. |
| CSRF | Mitigé | NextAuth en credentials + session JWT. Les formulaires sont soumis en POST depuis l’app ; pas de cookie CSRF dédié. En production, utiliser HTTPS et s’assurer que les origines sont contrôlées. |
| Headers sécurisés | OK | Ajout dans `next.config.ts` : `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation désactivés). Pas de Helmet (Node) ; équivalent via headers Next.js. |

**Recommandations :**
- En production : HTTPS obligatoire, `NEXTAUTH_URL` en https, `NEXTAUTH_SECRET` fort et unique.
- Vérifier que les routes API sensibles (users, audit, alertes) refusent bien les appels sans session (déjà le cas avec `getServerSession`).

---

## 4. Bugs et écarts documentés

| Priorité | Description | Fichier / zone |
|----------|-------------|-----------------|
| Moyenne | Création / édition utilisateurs non implémentée | `POST/GET /api/users` stubs |
| Moyenne | Assignation de profil à un utilisateur non implémentée | API users + page admin utilisateurs |
| Basse | `ipAddress` dans les logs d’audit (login) = "TODO" | `lib/auth.ts` |
| Basse | Pas d’audit explicite sur l’accès menus | Optionnel |
| Info | Worker scheduler : boucle sur les marchés (N+1 si beaucoup de marchés) | `workers/alert-scheduler.worker.ts` |
| Info | Pas de cache Redis sur les lectures API | Évolutif |

---

## 5. Résumé des corrections effectuées (étape 12)

- **Middleware :** Remplacement du TODO par `withAuth` (next-auth) pour protéger dashboard, marches, tresorerie, admin.
- **API Audit :** Implémentation de `GET /api/audit` (liste paginée, filtres userId, entity, action, from, to) et export `?export=csv` / `?export=json` (permission `audit:export`).
- **Headers de sécurité :** Ajout dans `next.config.ts` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).

---

## 6. Checklist d’exécution manuelle recommandée

1. **Auth :** Connexion avec admin@gestionmarches.com / Admin@2026 après `npm run seed`.
2. **Menus :** Vérifier que le menu affiché correspond au profil (admin voit tout).
3. **Marchés :** Créer un marché 100 000 €, ajouter 2 accomptes (30k + 20k), tenter décaissement 60k (échec), puis 20k (succès).
4. **Préfinancement :** Sur le même marché, activer préfinancement 20 000 €, puis décaissement 40 000 € (succès attendu).
5. **Alertes :** Vérifier cloche (notifications in-app) et page admin/alertes/historique.
6. **Audit :** Appeler `GET /api/audit` (liste) puis `GET /api/audit?export=csv` (export) avec un utilisateur ayant `audit:read` / `audit:export`.

---

*Rapport généré dans le cadre de l’étape 12 – Tests complets de l’application.*
