# Destiny 2 — Triumph Tracker

Tableau de suivi partagé des triomphes Destiny 2 pour un groupe de joueurs. Pour chaque triomphe, l'état « fait / à faire » de chaque joueur est affiché en lecture seule.

## Stack

| Couche | Technologie |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 |
| Backend | Express 5 + TypeScript (Node 20) |
| Base de données | MongoDB (Mongoose) — cache avec TTL |
| Style | CSS Modules + variables CSS (thèmes sombre/clair) |
| Tests unitaires | Vitest + Testing Library |
| Tests E2E | Playwright (Chromium) |
| Lint | Oxlint |
| CI/CD | GitHub Actions → Docker → Kubernetes |

## Structure du dépôt

```
triumphs/
├── frontend/               # SPA React (Vite)
│   ├── src/
│   │   ├── data.ts         # Types, constantes, données mockées (fallback)
│   │   ├── hooks/useTheme.ts
│   │   ├── components/     # SectionTabs, Hero, Toolbar, TriumphTable, EmptySection
│   │   └── test/           # 57 tests unitaires
│   ├── e2e/app.spec.ts     # 25 tests Playwright
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.ts      # Proxy /api → http://localhost:3001
│   └── package.json
├── backend/                # API Express
│   ├── src/
│   │   ├── data/mock.ts    # 204 triomphes + progression initiale (fallback)
│   │   ├── routes/
│   │   │   ├── triumphs.ts # GET /api/triumphs
│   │   │   └── progress.ts # GET /api/progress
│   │   ├── services/
│   │   │   ├── bungie.ts   # Client API Bungie (catalogue dynamique)
│   │   │   └── cache.ts    # Cache MongoDB (catalog, progress, manifest_check)
│   │   └── server.ts       # Point d'entrée Express (port 3001)
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Dev local (frontend + backend)
└── .github/workflows/
    └── build-and-publish.yml
```

## Lancer le projet

### Développement local

```bash
# Terminal 1 — backend
cd backend && npm install && npm run dev   # http://localhost:3001

# Terminal 2 — frontend
cd frontend && npm install && npm run dev  # http://localhost:5173
```

Le frontend proxifie automatiquement `/api/*` vers le backend (voir `vite.config.ts`).

### Avec API Bungie + MongoDB (recommandé)

```bash
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/triumphs \
BUNGIE_API_KEY=your_key_here \
  npm run dev --workspace=backend
```

Avec les deux variables, le backend :
1. Interroge l'API Bungie toutes les 30 min au maximum (vérification légère de la version du manifest)
2. Re-télécharge les définitions uniquement si le manifest a changé (patch Bungie du mardi)
3. Sert le catalogue depuis MongoDB entre les mises à jour

Sans `BUNGIE_API_KEY` ou sans `MONGODB_URL`, le backend répond depuis les données mockées (`data/mock.ts`).

### Docker Compose

```bash
MONGODB_URL=mongodb+srv://... docker compose up
# Frontend : http://localhost:8080
# Backend  : http://localhost:3001
```

## Scripts

### Racine (workspace npm)

| Commande | Description |
|---|---|
| `npm run dev` | Lance frontend + backend en parallèle |
| `npm run build` | Build frontend puis backend |
| `npm test` | Tests unitaires frontend (67) + backend (25) |
| `npm run test:e2e` | Tests Playwright (26 scénarios) |

### Frontend (`cd frontend`)

| Commande | Description |
|---|---|
| `npm run dev` | Serveur Vite (HMR) |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build |
| `npm test` | Tests unitaires (67 tests) |
| `npm run test:coverage` | Tests + rapport de couverture |
| `npm run test:e2e` | Tests E2E Playwright (26 scénarios) |
| `npm run lint` | Lint Oxlint |

### Backend (`cd backend`)

| Commande | Description |
|---|---|
| `npm run dev` | Serveur Express avec hot-reload (`tsx watch`) |
| `npm run build` | Compilation TypeScript → `dist/` |
| `npm start` | Démarre le serveur compilé |
| `npm test` | Tests unitaires (25 tests) |

## API Backend

| Endpoint | Description | Cache MongoDB |
|---|---|---|
| `GET /api/triumphs` | Catalogue des triomphes (Bungie API ou mock) | `triumph_catalog` (sans TTL, invalidé sur nouvelle version) |
| `GET /api/progress` | Progression de chaque joueur | `triumph_progress` (TTL 5 min) |

Les collections MongoDB sont préfixées `triumph_` pour cohabiter avec d'autres applications sur le même cluster.

### Stratégie de cache du catalogue

Quand `BUNGIE_API_KEY` et `MONGODB_URL` sont définis :

1. `manifest_check` (TTL 30 min) — flag indiquant que la version a été vérifiée récemment
2. Si le flag est présent → sert `triumph_catalog` sans appel réseau
3. Sinon → `GET /Platform/Destiny2/Manifest/` (léger) pour comparer les versions
4. Version inchangée → renouvelle le flag, sert le cache
5. Nouvelle version → re-télécharge les 4 fichiers de définitions EN/FR (~plusieurs Mo), reconstruit le catalogue, met à jour le cache

Variables d'environnement :

| Variable | Requis | Description |
|---|---|---|
| `BUNGIE_API_KEY` | Recommandé | Clé API obtenue sur bungie.net/en/Application |
| `MONGODB_URL` | Recommandé | URL MongoDB Atlas ou autre |

## Fonctionnalités

- **Onglets de section** : Monument of Triumph, Lifetime, Renegades, Kepler (badge « à venir »)
- **Hero** : nombre total de triomphes + classement des joueurs trié par progression
- **Tableau** : 204 triomphes dans 17 sous-catégories / 5 catégories
  - En-têtes joueurs sticky, titre sticky, groupes pliables
  - Color-coding par catégorie
  - Pastille ✓ par joueur, ligne dorée `allDone` + badge COMPLET
- **Recherche** : filtre live FR + EN
- **Thème** : sombre par défaut, persisté en `localStorage`
- **Responsive** : adapté ≤ 640 px

## Tests

### Frontend — Tests unitaires (67 tests)

```bash
cd frontend && npm test
```

Couvrent : intégrité des données, hooks (`useTheme`, `useAppData`), les 5 composants (SectionTabs, Hero, Toolbar, EmptySection, TriumphTable), service `api.ts`.

### Frontend — Tests E2E Playwright (26 tests)

```bash
cd frontend && npm run build && npm run test:e2e
```

Scénarios : chargement, navigation, recherche, collapse/expand, masquer terminés, thème, badges, responsive 640 px, version affichée.  
Les tests mockent `/api/triumphs` et `/api/progress` via `page.route()` (fixture automatique dans `e2e/fixtures.ts`).

### Backend — Tests unitaires (25 tests)

```bash
cd backend && npm test
```

Couvrent : intégrité des données mock (`mock.test.ts`), service Bungie (`bungie.test.ts`) avec fetch mocké, route `/api/triumphs` avec toutes les branches (window cache, version check, re-fetch, fallback), route `/api/progress`.

## CI/CD

Le workflow `.github/workflows/build-and-publish.yml` :

1. **`test`** : installe les dépendances, lance les tests unitaires frontend + backend, les tests E2E Playwright, puis upload le rapport Playwright comme artefact.
2. **`build-and-push-frontend`** (needs: test) : build et push l'image Docker `bibulle/triumph-tracker-frontend:VX.Y.Z` vers DockerHub.
3. **`build-and-push-backend`** (needs: test) : idem pour `bibulle/triumph-tracker-backend:VX.Y.Z`.
4. **`update-k8s`** (needs: frontend + backend) : met à jour les deux manifestes Kubernetes dans `myKubernetesConfig` en un seul commit atomique (évite les conflits de push concurrent).

Secrets nécessaires : `ACTIONS_TOKEN`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

## Prochaines étapes

- [ ] Connexion API Bungie pour la progression réelle des joueurs (`GET /Destiny2/{membershipType}/Profile/{membershipId}/?components=900`)
- [ ] Résolution du `membershipId` de chaque joueur via `SearchDestinyPlayer`
- [ ] Authentification par joueur (OAuth Bungie) pour les comptes privés
- [ ] Mise à jour de la progression en temps réel (polling ou WebSocket)
- [ ] Données pour les sections Lifetime, Renegades, Kepler
