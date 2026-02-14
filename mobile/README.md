# Emeraude Business - Application mobile Android

Application mobile native pour la gestion de marchés BTP.

## Prérequis

- Node.js 18+
- Expo CLI
- Android Studio (pour émulateur) ou appareil Android physique

## Installation

```bash
cd mobile
npm install
```

## Configuration

1. Copier `.env.example` vers `.env`
2. Configurer `EXPO_PUBLIC_API_URL` :
   - Émulateur Android : `http://10.0.2.2:3000`
   - Appareil physique : `http://<IP_PC>:3000`

## Lancement

```bash
npm run android
```

## Design

- **Couleurs** : Bleu primaire (#0066cc), fond clair (#f8fafc)
- **Typographie** : Hiérarchie claire, lisibilité mobile
- **Formulaires** : Champs optimisés tactile, bordures arrondies
- **Cartes** : Ombres légères, espacement généreux

## API

L'app utilise les mêmes endpoints que le web avec authentification Bearer (JWT) :

- `POST /api/auth/mobile/login` - Connexion
- `GET /api/dashboard` - Tableau de bord
- `GET /api/marches` - Liste des marchés
