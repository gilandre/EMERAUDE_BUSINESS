# Analyse : TypeError: Cannot read properties of null (reading 'useEffect')

## 1. Symptôme

```
TypeError: Cannot read properties of null (reading 'useEffect')
    at process.env.NODE_ENV.exports.useEffect (node_modules/react/cjs/react.development.js:1225:33)
    at QueryClientProvider (node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js:23:9)
```

L’erreur survient au premier rendu (ou à l’hydratation), dans `QueryClientProvider` de `@tanstack/react-query`, lorsqu’il appelle le hook `useEffect` de React.

## 2. Cause racine : plusieurs instances de React

### 2.1 Mécanisme des hooks React

- React maintient un **dispatcher** (objet interne) qui contient les implémentations des hooks (`useState`, `useEffect`, etc.).
- Lors du rendu d’un arbre de composants, React assigne ce dispatcher au module React utilisé pour ce rendu.
- Un hook fait en pratique : `ReactCurrentDispatcher.current.useEffect(...)`.
- Si **un autre** module `react` est utilisé (autre instance), son `ReactCurrentDispatcher.current` n’a pas été initialisé pour ce rendu → il reste `null` → **"Cannot read properties of null (reading 'useEffect')"**.

### 2.2 D’où viennent plusieurs instances ?

- **Next.js** utilise et bundle sa propre copie de React (RSC, client, dev overlay).
- Les dépendances (**@tanstack/react-query**, sonner, recharts, etc.) déclarent `react` en peerDependency et sont résolues par Node/webpack.
- Si le résolveur (webpack ou Node) pointe vers **deux chemins différents** pour `react` (par ex. `node_modules/react` vs `node_modules/next/node_modules/react` ou une copie dans un sous‑package), on obtient **deux modules React** en mémoire.
- Dès qu’un composant (ex. `QueryClientProvider`) est issu d’un bundle qui a résolu `react` vers l’instance B alors que l’arbre est rendu avec l’instance A, les hooks de l’instance B voient un dispatcher null → erreur.

### 2.3 Contexte Next.js 15 + App Router

- Plusieurs compilations (server, client, middleware, dev overlay).
- Le **React Dev Overlay** (HotReload, AppDevOverlay) et votre app partagent l’écran ; si l’un des deux ou une dépendance (ex. react-query) utilise une autre instance de React, l’erreur peut apparaître au moment où `QueryClientProvider` est rendu dans cet arbre.

## 3. Solutions durables (sans régression)

### 3.1 Forcer une seule résolution de React (webpack)

Dans `next.config.ts`, on s’assure que **tous** les imports de `react` et `react-dom` (y compris ceux de `@tanstack/react-query` et autres libs) résolvent vers **le même** `react` / `react-dom` du projet :

```ts
webpack: (config, { isServer }) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    react: require.resolve("react"),
    "react-dom": require.resolve("react-dom"),
  };
  return config;
},
```

- À faire **côté client** (et éventuellement côté server si vous utilisez des hooks côté serveur dans des composants bundlés).
- Ne pas écraser `config.resolve.alias` sans le spread pour garder les alias internes Next.js.

### 3.2 Aligner les versions (package.json)

- Utiliser **une seule version** de `react` et `react-dom` dans le projet.
- Vérifier que `@tanstack/react-query` (et toute lib qui utilise des hooks) est compatible avec React 19.
- Optionnel : `overrides` (npm) / `resolutions` (pnpm/yarn) pour forcer la même version dans tout l’arbre :

```json
"overrides": {
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

### 3.3 Ne pas externaliser React Query côté serveur inutilement

- `serverExternalPackages` s’applique au **serveur**. Mettre `@tanstack/react-query` dedans peut changer la façon dont le serveur résout les dépendances ; en général, pour les libs à hooks utilisées surtout côté client, il vaut mieux **ne pas** les mettre dans `serverExternalPackages` sauf besoin explicite (ex. éviter de bundlér un gros module côté serveur). Retirer `@tanstack/react-query` de `serverExternalPackages` si on l’y a ajouté “pour voir” et qu’il n’y a pas de raison forte.

### 3.4 Vérifier la place du provider

- Un seul `QueryClientProvider` (ou wrapper qui le contient) qui enveloppe **tout** l’arbre qui utilise les hooks React Query.
- Le placer dans un layout racine ou dashboard, côté **client** (`"use client"`), sans le dupliquer (éviter un provider dans la racine et un autre plus bas qui réutilise une autre instance de React).

## 4. Ce qu’il faut éviter (pour ne pas réintroduire le bug)

- **Ne pas** charger `QueryClientProvider` uniquement côté client avec `ssr: false` si ça fait rester l’UI sur “Chargement…” ou casse l’hydratation.
- **Ne pas** mélanger plusieurs stratégies (plusieurs layouts avec des providers React Query différents) sans s’assurer qu’ils utilisent la même instance de React.
- **Ne pas** ajouter des alias webpack qui pointent vers une autre version de React que celle du projet (ex. vers `next/dist/...` sans nécessité).

## 5. Résumé

| Cause | Action |
|--------|--------|
| Plusieurs instances de React en mémoire | Alias webpack `react` / `react-dom` → `require.resolve("react")` (et idem pour react-dom) |
| Versions différentes dans l’arbre | Aligner react/react-dom, optionnellement avec overrides |
| Externalisation inutile | Retirer `@tanstack/react-query` de `serverExternalPackages` si pas nécessaire |
| Mauvais placement du provider | Un seul QueryClientProvider, côté client, en haut de l’arbre concerné |

En appliquant **au minimum** l’alias webpack et en gardant un seul provider bien placé, l’erreur « Cannot read properties of null (reading 'useEffect') » doit disparaître de façon stable, sans régression d’affichage ou de chargement.
