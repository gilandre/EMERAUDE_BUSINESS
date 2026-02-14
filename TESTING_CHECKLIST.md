# Checklist de tests – Emeraude Business

**Date :** 7 février 2026  
**Version :** 0.1.0

---

## A. TESTS FONCTIONNELS (Manuel)

### 1. AUTHENTIFICATION

| # | Scénario | Statut | Implémenté | Notes |
|---|----------|--------|------------|-------|
| 1 | Connexion admin | ☐ À exécuter | ✅ | `admin@gestionmarches.com` / `Admin@2026` (seed) |
| 2 | Connexion user limité | ☐ À exécuter | ✅ | Profil USER (menus/perms restreints) |
| 3 | Déconnexion | ☐ À exécuter | ✅ | Menu compte → Déconnexion |
| 4 | Mot de passe oublié | ☐ Non implémenté | ❌ | Pas de flux "forgot password" |
| 5 | Tentatives échouées (lock compte) | ☐ Non implémenté | ❌ | Rate limit auth (5/15min) mais pas de lock compte |

### 2. MARCHÉS

| # | Scénario | Statut | Implémenté | Notes |
|---|----------|--------|------------|-------|
| 1 | Créer marché XOF | ☐ À exécuter | ✅ | Formulaire création + devise |
| 2 | Créer marché EUR | ☐ À exécuter | ✅ | |
| 3 | Créer marché USD | ☐ À exécuter | ✅ | |
| 4 | Éditer marché | ☐ À exécuter | ✅ | PUT /api/marches/[id] |
| 5 | Supprimer marché | ☐ À exécuter | ⚠️ | Vérifier si bouton présent |
| 6 | Filtrer marchés | ☐ À exécuter | ✅ | MarchesFiltersDropdown |
| 7 | Rechercher marché | ☐ À exécuter | ✅ | Champ recherche |
| 8 | Export Excel/PDF | ☐ À exécuter | ✅ | MarchesExportMenu |

### 3. ACCOMPTES

| # | Scénario | Statut | Implémenté | Notes |
|---|----------|--------|------------|-------|
| 1 | Ajouter accompte XOF | ☐ À exécuter | ✅ | AccompteForm |
| 2 | Ajouter accompte EUR (conversion auto) | ☐ À exécuter | ✅ | Conversion via taux marché |
| 3 | Éditer accompte | ☐ À exécuter | ⚠️ | API manquante – à vérifier |
| 4 | Supprimer accompte | ☐ À exécuter | ⚠️ | API manquante – à vérifier |
| 5 | Vérifier recalcul trésorerie | ☐ À exécuter | ✅ | Synthèse recalculée GET marches/[id] |

### 4. DÉCAISSEMENTS

| # | Scénario | Statut | Implémenté | Notes |
|---|----------|--------|------------|-------|
| 1 | Ajouter décaissement (tréso suffisante) | ☐ À exécuter | ✅ | POST /api/decaissements |
| 2 | Tenter décaissement (tréso insuffisante) → BLOQUÉ | ☐ À exécuter | ✅ | 400 "Trésorerie insuffisante" |
| 3 | Décaissement avec préfinancement | ☐ À exécuter | ✅ | disponible = solde + prefin restant |
| 4 | Valider décaissement | ☐ À exécuter | ⚠️ | Statuts PREVU/VALIDE non dans modèle |
| 5 | Payer décaissement | ☐ À exécuter | ⚠️ | Idem |

### 5. PRÉFINANCEMENT

| # | Scénario | Statut | Implémenté | Notes |
|---|----------|--------|------------|-------|
| 1 | Activer préfinancement | ☐ À exécuter | ✅ | PrefinancementPanel |
| 2 | Décaisser avec préfin | ☐ À exécuter | ✅ | |
| 3 | Atteindre limite préfin | ☐ À exécuter | ✅ | |
| 4 | Désactiver préfinancement | ☐ À exécuter | ✅ | Checkbox active |

### 6. DEVISES

| # | Scénario | Statut | Implémenté | Notes |
|---|----------|--------|------------|-------|
| 1 | Affichage montants formatés | ☐ À exécuter | ✅ | MontantDisplay + format API |
| 2 | Widget conversion | ☐ À exécuter | ✅ | MarcheConversionWidget |
| 3 | Créer marché EUR → vérifier XOF auto | ☐ À exécuter | ✅ | montantTotalXOF calculé |
| 4 | Modifier taux de change (non EUR/XOF) | ☐ À exécuter | ✅ | PUT devises/[id] |
| 5 | Tenter modifier EUR/XOF → BLOQUÉ | ☐ À exécuter | ✅ | **Implémenté** – 400 si tauxVersXOF |
| 6 | Historique taux | ☐ À exécuter | ✅ | GET /api/devises/taux/historique |

### 7. ALERTES

| # | Scénario | Statut | Implémenté | Notes |
|---|----------|--------|------------|-------|
| 1 | Créer règle alerte | ☐ À exécuter | ✅ | admin/alertes/nouveau |
| 2 | Déclencher alerte (tréso < seuil) | ☐ À exécuter | ✅ | Worker scheduler |
| 3 | Recevoir notification in-app | ☐ À exécuter | ✅ | NotificationCenter |
| 4 | Test envoi email | ☐ À exécuter | ✅ | Bouton test /api/alertes/test |
| 5 | Désactiver alerte | ☐ À exécuter | ✅ | active: false |
| 6 | Historique alertes | ☐ À exécuter | ✅ | admin/alertes/historique |

### 8. ADMINISTRATION

| # | Scénario | Statut | Implémenté | Notes |
|---|----------|--------|------------|-------|
| 1 | Créer utilisateur | ☐ À exécuter | ✅ | admin/utilisateurs |
| 2 | Assigner profil | ☐ À exécuter | ✅ | Select profil |
| 3 | Modifier permissions profil | ☐ À exécuter | ✅ | admin/profils → matrice |
| 4 | Suspendre utilisateur | ☐ À exécuter | ✅ | Bouton UserX |
| 5 | Consulter audit logs | ☐ À exécuter | ✅ | admin/audit |
| 6 | Configuration système | ☐ À exécuter | ✅ | admin/configuration |

### 9. DASHBOARDS

| # | Scénario | Statut | Implémenté | Notes |
|---|----------|--------|------------|-------|
| 1 | Affichage KPI | ☐ À exécuter | ✅ | dashboard page |
| 2 | Graphiques actualisés | ☐ À exécuter | ✅ | TreasuryLineChart, etc. |
| 3 | Filtres fonctionnels | ☐ À exécuter | ✅ | |
| 4 | Export dashboard PDF | ☐ À exécuter | ⚠️ | Vérifier si implémenté |

### 10. MOBILE

| # | Scénario | Statut | Implémenté | Notes |
|---|----------|--------|------------|-------|
| 1 | Responsive design | ☐ À exécuter | ✅ | Tailwind md: breakpoints |
| 2 | Navigation mobile | ☐ À exécuter | ✅ | BottomNav |
| 3 | Formulaires tactiles | ☐ À exécuter | ✅ | min-h-44 touch targets |
| 4 | PWA installable | ☐ À exécuter | ✅ | InstallPrompt, manifest |
| 5 | Offline mode | ☐ À exécuter | ✅ | Page /offline, cache |

---

## B. TESTS PERFORMANCE

| # | Vérification | Statut | Détail |
|---|--------------|--------|--------|
| 1 | Page chargement < 2s | ☐ À mesurer | Lighthouse / DevTools |
| 2 | API response time < 500ms | ☐ À mesurer | Monitoring / logs |
| 3 | Lighthouse score > 90 | ☐ À mesurer | `npx lighthouse http://localhost:3000` |
| 4 | Pas de requêtes N+1 | ✅ Vérifié (code) | select/include ciblés |
| 5 | Cache Redis actif | ✅ Partiel | BullMQ, rate-limit ; pas de cache API |

---

## C. TESTS SÉCURITÉ

| # | Vérification | Statut | Détail |
|---|--------------|--------|--------|
| 1 | Authentification requise routes protégées | ✅ | withAuth middleware + getServerSession |
| 2 | Permissions vérifiées | ✅ | hasPermission sur toutes routes API |
| 3 | Validation Zod sur toutes entrées | ✅ | marches, accomptes, decaissements, prefinancements, alertes, users, profils |
| 4 | Pas de secrets exposés | ✅ | .env, pas de credentials dans code |
| 5 | CORS configuré | ⚠️ | Pas de CORS explicite (same-origin par défaut) |
| 6 | Rate limiting actif | ✅ | Auth 5/15min, Alertes 10/min, Default 100/15min |

---

## Procédure d’exécution manuelle

### Prérequis
```bash
npm run seed          # Créer données de test
docker-compose -f docker-compose.dev.yml up -d  # Redis, Postgres
npm run dev           # Lancer l'application
```

### Credentials de test (seed)
- **Admin :** admin@gestionmarches.com / Admin@2026
- **Manager :** manager@gestionmarches.com / Manager@2026
- **User :** user@gestionmarches.com / User@2026

### Scénario rapide (≈15 min)
1. Connexion admin
2. Créer marché 100 000 XOF
3. Ajouter accompte 30 000
4. Tenter décaissement 60 000 → échec attendu
5. Décaissement 20 000 → succès
6. Activer préfinancement 20 000
7. Décaissement 40 000 → succès
8. Créer règle alerte, test envoi
9. Admin → Créer utilisateur, modifier profil
10. Consulter audit

---

## Écarts / Non implémenté

| Priorité | Description |
|----------|-------------|
| Moyenne | Mot de passe oublié (flux email) |
| Moyenne | Lock compte après X tentatives échouées |
| Basse | Édition/Suppression accomptes |
| Basse | Statuts décaissement (PREVU/VALIDE/PAYE) |
| Info | Export dashboard PDF |

---

*Checklist générée – Étape 47 – Tests complets application.*
