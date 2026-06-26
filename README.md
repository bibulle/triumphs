# Destiny 2 — Triumph Tracker

Tableau de suivi partagé des triomphes Destiny 2 pour un groupe de joueurs. Pour chaque triomphe, l'état « fait / à faire » de chaque joueur est affiché, ainsi que les priorités et statuts personnels (persistés en base).

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
│   │   └── test/           # 76 tests unitaires
│   ├── e2e/app.spec.ts     # 26 tests Playwright
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
| `npm test` | Tests unitaires frontend + backend |
| `npm run test:e2e` | Tests Playwright |
| `npm run release:patch` | Bump patch, commit (incl. package-lock.json), tag, push |
| `npm run release:minor` | Bump minor, commit (incl. package-lock.json), tag, push |
| `npm run release:major` | Bump major, commit (incl. package-lock.json), tag, push |

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
| `npm test` | Tests unitaires (28 tests) |

## API Backend

| Endpoint | Description | Cache MongoDB |
|---|---|---|
| `GET /api/triumphs` | Catalogue des triomphes (Bungie API ou mock) | `triumph_catalog` (sans TTL, invalidé sur nouvelle version) |
| `GET /api/progress` | Progression de chaque joueur | `triumph_progress` (TTL 5 min) |
| `GET /api/annotations` | Priorités & flags de tous les joueurs | Persisté sans TTL (`triumph_annotations`) |
| `PUT /api/annotations/:player` | Sauvegarde les annotations d'un joueur | idem |
| `GET /api/version` | Version déployée du backend | Aucun (lu depuis `package.json`) |
| `GET /api/progress?force=true` | Progression joueurs en forçant le re-fetch (invalide le cache MongoDB) | — |

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

- **Onglets de section** : Triomphes, Titres, Rangs de Gardien (données dynamiques via API Bungie)
- **Hero** : nombre de triomphes de la section active + classement des joueurs trié par progression
- **Tableau** : triomphes par sous-catégories / catégories (catalogue chargé depuis Bungie)
  - En-têtes joueurs sticky, titre sticky, groupes pliables par section active
  - Color-coding par catégorie
  - Pastille ✓ par joueur, ligne dorée `allDone` + badge COMPLET
  - Groupe marqué et masqué quand tous ses triomphes sont terminés ("Masquer terminés")
- **Priorités & flags par joueur** : clic sur une cellule joueur ouvre un mini-éditeur (popover fixe) permettant de définir une priorité (0/1/2/4 → aucune/basse/moyenne/haute) et un statut personnel (besoin des autres / faisable seul / abandonné). Persistés en MongoDB via `PUT /api/annotations/:player`.
  - **Prio globale** : moyenne des prios joueurs, buckétée en 3 niveaux (seuils 1.5 / 2.5), affichée à droite de chaque triomphe avec le pire flag collectif
  - **Tri** : défaut (par groupe), prio globale (avec flag comme tiebreaker), statut, ou prio par joueur — en mode tri actif, le classement s'applique à tout l'onglet et non groupe par groupe
- **Mise à jour automatique** : la progression est re-fetchée toutes les 5 minutes en arrière-plan (= TTL du cache backend), sans rechargement de page. Un compte à rebours discret dans la Toolbar indique le prochain refresh automatique. Un bouton ↻ permet de forcer un rechargement immédiat (invalide aussi le cache backend via `?force=true`)
- **Détection de nouvelle version** : le frontend poll `/api/version` toutes les 5 minutes ; si la version change (nouveau déploiement), un bandeau invite à recharger la page
- **Recherche** : filtre live FR + EN + PT
- **Thème** : sombre par défaut, persisté en `localStorage`
- **Responsive** : adapté ≤ 640 px

## Tests

### Frontend — Tests unitaires (82 tests)

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

### Backend — Tests unitaires (29 tests)

```bash
cd backend && npm test
```

Couvrent : intégrité des données mock (`mock.test.ts`), service Bungie (`bungie.test.ts`) avec fetch mocké, route `/api/triumphs` avec toutes les branches (window cache, version check, re-fetch, fallback), route `/api/progress`, route `/api/version`.

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
- [ ] Filtrage configurable des sections affichées
