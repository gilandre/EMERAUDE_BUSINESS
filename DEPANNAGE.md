# Guide de dépannage - Emeraude Business

## L'application ne compile pas / ne démarre pas

### 1. Erreur EPERM sur `.next/trace` (Windows)

**Symptôme :**
```
Error: EPERM: operation not permitted, open 'E:\EMERAUDE_BUSINESS\.next\trace'
```

**Causes :** Plusieurs processus Next.js accèdent au même dossier `.next` (ex. `npm run dev` + `npm run build` en parallèle).

**Solutions :**
1. **Arrêter tous les processus** : Fermez tous les terminaux où `npm run dev` ou `npm run build` tourne (Ctrl+C).
2. **Supprimer le cache et rebuilder :**
   ```powershell
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm run build
   ```
3. **Antivirus** : Ajoutez le dossier du projet aux exclusions de Windows Defender si le problème persiste.
4. **Un seul processus à la fois** : Ne lancez jamais `npm run build` pendant que `npm run dev` est actif.

---

### 2. Erreur `ENOENT: no such file or directory, open '.next\server\edge-runtime-webpack.js'`

**Symptôme :** En lançant `npm run dev:all`, une requête (ex. page d’accueil) provoque une erreur indiquant que le fichier `edge-runtime-webpack.js` est introuvable.

**Cause :** Avec deux processus Next (api + web), le fichier du runtime Edge peut ne pas être créé à temps avant l’exécution du middleware.

**Solutions :**
1. **Utiliser `npm run dev:all`** : Un script surveille désormais `.next/server` et recopie `webpack-runtime.js` vers `edge-runtime-webpack.js` dès que possible. Attendez le message « Ready » puis rechargez la page.
2. **Si l’erreur revient :** Arrêtez le serveur (Ctrl+C), supprimez le dossier `.next`, relancez `npm run dev:all`, attendez « Ready », appelez une fois `http://localhost:3000/api/health`, puis exécutez une fois :
   ```powershell
   node scripts/ensure-edge-runtime.js
   ```
   Puis rechargez l’application.

---

### 3. Mode développement (recommandé)

Pour le développement, utilisez **`npm run dev`** au lieu de `npm run start` :
- Ne nécessite pas de build préalable
- Rechargement à chaud
- Évite les conflits avec le build

```powershell
npm run dev
```

Puis ouvrez http://localhost:3000

---

### 4. Mode production (build + start)

Pour une utilisation en production :

```powershell
# 1. S'assurer qu'aucun processus n'utilise .next
# 2. Builder
npm run build

# 3. Lancer (si build réussi)
npm run start
```

Si vous voyez **« .next/standalone not found »** : le build a échoué. Relancez `npm run build` après avoir nettoyé le dossier `.next`.

---

### 5. Erreur NextAuth CLIENT_FETCH_ERROR

**Symptôme :** `[next-auth][error][CLIENT_FETCH_ERROR]` dans la console.

**Causes fréquentes :**
1. **NEXTAUTH_URL incorrect** – En développement local, doit être `http://localhost:3000` (avec le port). Vérifiez votre fichier `.env`.
2. **Serveur arrêté** – L’app tourne-t-elle sur le bon port ?
3. **Redis** – Si Redis n’est pas disponible, le rate limit peut interférer. Vérifiez `REDIS_URL`.

**Solution :** Dans `.env`, définir :
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre-secret-minimum-32-caracteres
```

---

### 5. Prérequis

- **Node.js** 18+ 
- **PostgreSQL** et **Redis** en cours d'exécution (voir `docker-compose.dev.yml`)
- Fichier `.env` configuré avec `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_URL` et `NEXTAUTH_SECRET`
