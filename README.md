# Destiny 2 — Triumph Tracker

Tableau de suivi partagé des triomphes Destiny 2 pour un groupe de joueurs. Pour chaque triomphe, l'état « fait / à faire » de chaque joueur est affiché en lecture seule (alimenté par le backend, pas saisi manuellement).

## Stack

| Couche | Technologie |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Style | CSS Modules + variables CSS (thèmes sombre/clair) |
| Tests unitaires | Vitest + Testing Library |
| Tests E2E | Playwright (Chromium) |
| Lint | Oxlint |

## Lancer le projet

```bash
npm install
npm run dev          # http://localhost:5173
```

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (HMR) |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build (`http://localhost:4173`) |
| `npm test` | Tests unitaires (run unique) |
| `npm run test:watch` | Tests unitaires en mode watch |
| `npm run test:coverage` | Tests unitaires + rapport de couverture |
| `npm run test:e2e` | Tests end-to-end Playwright |
| `npm run lint` | Lint Oxlint |

## Architecture

```
src/
├── data.ts                  # Données mockées, types, constantes
├── hooks/
│   └── useTheme.ts          # Bascule thème sombre/clair (localStorage)
├── components/
│   ├── SectionTabs.tsx      # Onglets de section (Monument, Lifetime…)
│   ├── Hero.tsx             # Compteur + classement des joueurs
│   ├── Toolbar.tsx          # Recherche, expand/collapse, filtres, thème
│   ├── TriumphTable.tsx     # Tableau principal (groupes pliables, statuts)
│   └── EmptySection.tsx     # État « à venir » pour sections sans données
├── test/
│   ├── setup.ts             # Configuration Testing Library
│   ├── data.test.ts         # Tests des données et helpers
│   ├── useTheme.test.ts     # Tests du hook de thème
│   ├── SectionTabs.test.tsx
│   ├── Hero.test.tsx
│   ├── Toolbar.test.tsx
│   ├── EmptySection.test.tsx
│   └── TriumphTable.test.tsx
└── App.tsx                  # Composant racine, état global UI
e2e/
└── app.spec.ts              # Tests end-to-end (25 scénarios Playwright)
```

## Fonctionnalités

- **Onglets de section** : Monument of Triumph, Lifetime, Renegades, Kepler (badge « à venir »)
- **Hero** : nombre total de triomphes + classement des joueurs trié par progression
- **Tableau** : 204 triomphes répartis en 17 sous-catégories dans 5 catégories
  - Colonne titre sticky à gauche, en-têtes joueurs sticky en haut
  - Groupes pliables/dépliables (chevron + « Tout déplier / replier »)
  - Color-coding par catégorie (Worlds / Stories / Combat / Teamwork / Competitions)
  - Pastille de statut ✓ / vide par joueur (lecture seule)
  - Ligne `allDone` dorée + badge COMPLET quand tous les joueurs ont validé
- **Recherche** : filtre live FR + EN, coopère avec le pliage et « Masquer terminés »
- **Thème** : sombre par défaut, clair disponible, persisté en `localStorage`
- **Responsive** : adapté ≤ 640px

## Données et état

Les données sont actuellement **mockées** dans `src/data.ts` (constante `RAW`, issue du prototype de design). L'état de progression de chaque joueur sera fourni par l'API Bungie côté backend.

### Structure attendue depuis le backend

```ts
// Pour chaque joueur, un Set d'IDs de triomphes validés
type Progress = Record<Player, Set<string>>;
```

Remplacer `buildInitialProgress()` dans `src/data.ts` par un appel API et passer le résultat via props ou un contexte React.

## Tests

### Tests unitaires (Vitest + Testing Library)

Couvrent :
- Intégrité des données (`DATA`, `GROUPS`, `CAT_FR`, `SUB_FR`, `buildInitialProgress`)
- Hook `useTheme` (valeur initiale, toggle, persistance localStorage)
- Composant `SectionTabs` (rendu, onglet actif, badge « à venir », callback `onSelect`)
- Composant `Hero` (titre, compteur, leaderboard trié, mode sans données)
- Composant `Toolbar` (recherche, labels conditionnels, tous les callbacks)
- Composant `EmptySection` (label, message)
- Composant `TriumphTable` (groupes, items, collapse, recherche, hideDone, allDone, statuts)

```bash
npm test
# → 57 tests, 7 fichiers
```

### Tests E2E (Playwright)

Couvrent 25 scénarios dans le navigateur Chromium :
- Chargement initial (titre, compteur, leaderboard, footer)
- Navigation entre sections (onglets, état « à venir », retour)
- Recherche live (match, no-match, clear)
- Collapse/expand (tout replier, tout déplier, clic sur groupe)
- Masquer/afficher triomphes terminés
- Bascule de thème (sombre → clair → sombre, persistance au rechargement)
- Badges de statut (allDone, curseur non-pointer)
- Responsive 640px

```bash
npm run build && npm run preview &   # serveur de prévisualisation
npm run test:e2e
```

## Prochaines étapes

- [ ] Intégration API Bungie (OAuth + endpoints de progression)
- [ ] Authentification par joueur
- [ ] Mise à jour de la progression en temps réel (polling ou WebSocket)
- [ ] Données pour les sections Lifetime, Renegades, Kepler
- [ ] Descriptions des triomphes (FR + EN)
