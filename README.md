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
│   │   ├── data/mock.ts    # 204 triomphes + progression initiale
│   │   ├── routes/
│   │   │   ├── triumphs.ts # GET /api/triumphs
│   │   │   └── progress.ts # GET /api/progress
│   │   ├── services/
│   │   │   └── cache.ts    # Cache MongoDB (triumph_catalog, triumph_progress)
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

### Avec MongoDB (cache)

```bash
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/triumphs \
  npm run dev --workspace=backend
```

Sans `MONGODB_URL`, le backend répond directement depuis les données mockées.

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
| `npm test` | Tests unitaires frontend + backend |
| `npm run test:e2e` | Tests Playwright (frontend) |

### Frontend (`cd frontend`)

| Commande | Description |
|---|---|
| `npm run dev` | Serveur Vite (HMR) |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build |
| `npm test` | Tests unitaires (57 tests) |
| `npm run test:coverage` | Tests + rapport de couverture |
| `npm run test:e2e` | Tests E2E Playwright (25 scénarios) |
| `npm run lint` | Lint Oxlint |

### Backend (`cd backend`)

| Commande | Description |
|---|---|
| `npm run dev` | Serveur Express avec hot-reload (`tsx watch`) |
| `npm run build` | Compilation TypeScript → `dist/` |
| `npm start` | Démarre le serveur compilé |
| `npm test` | Tests unitaires (17 tests) |

## API Backend

| Endpoint | Description | Cache MongoDB |
|---|---|---|
| `GET /api/triumphs` | Liste des 204 triomphes | `triumph_catalog` (TTL 24 h) |
| `GET /api/progress` | Progression de chaque joueur | `triumph_progress` (TTL 5 min) |

Les collections MongoDB sont préfixées `triumph_` pour cohabiter avec d'autres applications sur le même cluster.

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

### Frontend — Tests unitaires (57 tests)

```bash
cd frontend && npm test
```

Couvrent : intégrité des données, hook `useTheme`, et les 5 composants (SectionTabs, Hero, Toolbar, EmptySection, TriumphTable).

### Frontend — Tests E2E Playwright (25 tests)

```bash
cd frontend && npm run build && npm run test:e2e
```

Scénarios : chargement, navigation, recherche, collapse/expand, masquer terminés, thème, badges, responsive 640 px.

### Backend — Tests unitaires (17 tests)

```bash
cd backend && npm test
```

Couvrent : intégrité des données mock (`mock.test.ts`), route `/api/triumphs` avec hit/miss de cache, route `/api/progress` avec hit/miss de cache.

## CI/CD

Le workflow `.github/workflows/build-and-publish.yml` :

1. **`test`** : installe les dépendances, lance les tests unitaires frontend + backend, les tests E2E Playwright, puis upload le rapport Playwright comme artefact.
2. **`build-and-push-frontend`** (needs: test) : build et push l'image Docker `bibulle/triumph-tracker-frontend:VX.Y.Z` vers DockerHub, met à jour le manifeste Kubernetes dans `myKubernetesConfig`.
3. **`build-and-push-backend`** (needs: test) : idem pour `bibulle/triumph-tracker-backend:VX.Y.Z`.

Secrets nécessaires : `ACTIONS_TOKEN`, `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

## Prochaines étapes

- [ ] Intégration API Bungie (OAuth + endpoints de progression)
- [ ] Remplacer les données mockées du backend par l'appel Bungie réel
- [ ] Authentification par joueur
- [ ] Mise à jour de la progression en temps réel (polling ou WebSocket)
- [ ] Données pour les sections Lifetime, Renegades, Kepler
- [ ] Descriptions complètes des triomphes (FR + EN)
