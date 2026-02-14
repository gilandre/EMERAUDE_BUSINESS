# Politique de sécurité - Emeraude Business

## Secrets et variables d'environnement

- **Aucun secret en dur** dans le code source
- `.env` est dans `.gitignore` - ne jamais committer de credentials
- Utiliser `process.env.*` pour toute configuration sensible
- Credentials DB : fournir via `DATABASE_URL` (chiffrement TLS recommandé en production)

Variables requises :
- `DATABASE_URL` - Connexion PostgreSQL
- `REDIS_URL` - Redis pour cache/rate-limit
- `NEXTAUTH_SECRET` - Signing JWT
- `NEXTAUTH_URL` - URL de l'application

## Rate limiting

- **Auth** (`/api/auth/*`) : 5 requêtes / 15 min
- **Alertes trigger/test** : 10 requêtes / min
- **API générale** : 100 requêtes / 15 min (routes avec `withApiMetrics`)

## Headers de sécurité

- Content-Security-Policy
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## Validation et sanitization

- Tous les inputs API validés avec Zod
- Sanitization XSS via `sanitizeString()` pour champs texte
- Vérification des permissions avant chaque action

## CSRF

- Endpoint `/api/csrf` pour obtenir un token
- Cookie `csrf_token` httpOnly, SameSite
- Header `X-CSRF-Token` ou champ `_csrf` dans le body pour POST/PUT/DELETE

## 2FA (MFA)

- TOTP via speakeasy
- `/api/totp/setup` - Générer secret + QR code + backup codes
- `/api/totp/enable` - Activer après vérification du code
- `/api/totp/disable` - Désactiver (code requis)
- Codes de secours hashés (SHA256)

## API Keys

- Génération : `POST /api/api-keys` (permission config:update)
- Format : `eb_` + 64 caractères hex
- Stockage : hash SHA256 uniquement, jamais le key brut
- Scopes : marchers:read, alertes:trigger, etc.
- Rotation : supprimer l'ancienne, créer une nouvelle
- Audit : table `api_key_usages` pour chaque appel
