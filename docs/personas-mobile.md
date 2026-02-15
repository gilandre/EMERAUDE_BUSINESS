# Personas Mobile — Emeraude Business

Ce document décrit les 3 profils types d'utilisateurs de l'application mobile Emeraude Business, leurs usages, écrans principaux et points de douleur identifiés.

---

## 1. Administrateur Système

### Profil
- **Fonction** : DSI ou responsable IT
- **Responsabilités** : Gestion des utilisateurs, permissions, configuration globale, supervision
- **Fréquence d'usage mobile** : Quotidienne — consultations rapides et supervision

### Usage mobile
- Consultation Dashboard (KPIs globaux, solde trésorerie, évolution)
- Supervision des marchés à risque (ratio trésorerie critique)
- Gestion des alertes critiques (seuils dépassés, échéances proches)
- Paramétrage des notifications et rappels

### Écrans principaux
| Écran | Usage |
|-------|-------|
| **DashboardScreen** | Vue d'ensemble KPIs, graphes trésorerie, alertes récentes |
| **AlertesScreen** | Suivi et traitement des alertes système |
| **ProfilScreen** | Gestion équipe, permissions, paramétrage notifications |
| **ConfigurationRappelsScreen** | Configuration des rappels automatiques |
| **ParametresNotificationsScreen** | Templates et canaux de notification |

### Points de douleur identifiés
1. **ProfilScreen** : 5 menus non-cliquables (Informations personnelles, Sécurité & mot de passe, Informations entreprise, Équipe & permissions, Edit avatar) — aucune action au tap
2. **Pas de contrôle d'accès mobile** : Tout utilisateur avec des identifiants valides peut se connecter au mobile, sans autorisation admin
3. **ConfigurationRappelsScreen** : Le bouton "Enregistrer" ne sauvegarde pas au backend (handler local uniquement)
4. **ParametresNotificationsScreen** : Même problème — pas de persistance serveur
5. **DashboardScreen** : Les liens "Tout voir" (alertes, échéances) ne naviguent nulle part ou vers un écran incorrect

---

## 2. Responsable Marchés (Manager)

### Profil
- **Fonction** : Chef de projet, directeur commercial ou responsable de portefeuille
- **Responsabilités** : Supervision des marchés, validation des décaissements, suivi des bénéficiaires, coordination d'équipe
- **Fréquence d'usage mobile** : Plusieurs fois par jour — suivi opérationnel en déplacement

### Usage mobile
- Suivi détaillé des marchés (encaissements, décaissements, progression)
- Validation et suivi des flux financiers
- Gestion des bénéficiaires et paiements
- Discussion d'équipe sur les marchés

### Écrans principaux
| Écran | Usage |
|-------|-------|
| **MarchesScreen** | Liste et recherche des marchés du portefeuille |
| **MarcheDetailScreen** | Détail complet : aperçu, encaissements, décaissements |
| **BeneficiairesScreen** | Liste des bénéficiaires, paiements rapides |
| **BeneficiaireDetailScreen** | Historique transactions d'un bénéficiaire |
| **TresorerieScreen** | Vue consolidée trésorerie |
| **DiscussionMarcheScreen** | Échanges d'équipe sur un marché |

### Points de douleur identifiés
1. **MarcheDetailScreen** : Les onglets Encaissements/Décaissements affichent le formulaire de saisie EN PREMIER, puis la liste historique en dessous — l'utilisateur doit scroller au-delà du formulaire pour consulter l'historique
2. **BeneficiairesScreen** : Le bouton "Payer" sur chaque carte, le bouton filtre et le FAB (+) sont tous non-fonctionnels (pas de handler `onPress`)
3. **BeneficiaireDetailScreen** : Le bouton "Nouveau Paiement" a un handler vide, les cards de transactions ne sont pas cliquables
4. **DiscussionMarcheScreen** : Le bouton pièce jointe (📎) n'est pas fonctionnel
5. **MarchesScreen** : Le bouton filtre (SlidersHorizontal) n'a pas de handler
6. **Performance** : Pas de cache API, le dashboard charge ~500KB de données dont une grande partie est inutile sur mobile

---

## 3. Agent Terrain (Utilisateur opérationnel)

### Profil
- **Fonction** : Comptable, agent terrain, assistant administratif
- **Responsabilités** : Saisie quotidienne des opérations, upload de justificatifs, déclaration des frais
- **Fréquence d'usage mobile** : Continue tout au long de la journée — saisie sur le terrain

### Usage mobile
- Saisie de décaissements et encaissements
- Upload de justificatifs (photos, documents)
- Enregistrement des frais de déplacement
- Déclaration d'usage des fonds

### Écrans principaux
| Écran | Usage |
|-------|-------|
| **NouveauDecaissementScreen** | Saisie d'un nouveau décaissement |
| **NouvelEncaissementScreen** | Saisie d'un nouvel encaissement |
| **AjouterJustificatifScreen** | Upload de justificatifs (photo/document) |
| **FraisDeplacementScreen** | Liste et saisie des frais de déplacement |
| **DeclarationUsageScreen** | Déclaration de l'usage des fonds |
| **DecaissementDetailScreen** | Consultation détail d'un décaissement |

### Points de douleur identifiés
1. **FraisDeplacementScreen** : Les cards de frais ne sont pas cliquables (pas de vue détail)
2. **DecaissementDetailScreen** : Le bouton téléchargement de justificatif affiche un placeholder `Alert` au lieu d'un vrai téléchargement
3. **DeclarationUsageScreen** : La vignette de justificatif n'est pas cliquable (pas de visualisation plein écran)
4. **NouvelEncaissementScreen** : La zone de signature est un placeholder statique non-interactif
5. **Recherche sans debounce** : Taper "marché rapide" génère 16 requêtes API successives (une par caractère)
6. **CreateMarcheScreen** : Le toggle préfinancement n'est pas envoyé dans le body du POST à l'API
7. **LoginScreen** : Le lien "Créer un compte" n'a pas de handler `onPress`

---

## Synthèse des problèmes transversaux

| Catégorie | Nb problèmes | Impact |
|-----------|:------------:|--------|
| Boutons non-fonctionnels | 22 | Frustration utilisateur, fonctionnalités inaccessibles |
| Formulaires mal positionnés | 2 onglets | Consultation historique pénible (scroll obligatoire) |
| Pas de contrôle d'accès mobile | 1 | Risque sécurité — tout le monde peut se connecter |
| Performance (pas de cache/debounce) | 3 écrans | Lenteur, requêtes réseau excessives |
| Settings non connectés au backend | 2 écrans | Paramètres perdus à chaque session |
