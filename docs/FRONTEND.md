# Frontend (React)

Application monopage (SPA) utilisée par les freelances, les annonceurs et les administrateurs.

| Élément | Valeur |
|---|---|
| Framework | React 19, TypeScript 6 |
| Build | Vite 8 (`@vitejs/plugin-react`) |
| Style | Tailwind CSS 4, `tw-animate-css`, composants façon shadcn sur `@base-ui/react` |
| Routage | React Router 7 |
| Données serveur | TanStack Query 5, axios |
| Formulaires | React Hook Form, validation Zod 4 |
| Icônes | lucide-react |
| Police | Geist (`@fontsource-variable/geist`) |
| Gestionnaire de paquets | pnpm, Node 22 |

## Scripts

```bash
pnpm install      # installer
pnpm dev          # serveur de développement (http://localhost:5173)
pnpm build        # vérification TypeScript + build de production (dist/)
pnpm preview      # servir le build
pnpm lint         # ESLint
pnpm typecheck    # TypeScript sans émission
pnpm prettier     # formatage
```

## Structure

```
frontend/src/
├── main.tsx            Point d'entrée : routes, QueryClient, ThemeProvider
├── App.tsx             Page d'accueil publique (landing)
├── App.css             Styles de la landing (un seul fond : --landing-bg)
├── index.css           Tailwind, palette de la marque, variante dark
├── api/                Un fichier par domaine (axios)
│   ├── axios.ts            Instance, injection du JWT, rafraîchissement automatique
│   ├── missionsApi.ts, propositionsApi.ts, freelanceApi.ts, onboardingApi.ts, userApi.ts
│   ├── matchingApi.ts, paiementApi.ts, meetingsApi.ts, suiviApi.ts
│   ├── message.ts, notificationApi.ts, chatApi.ts
├── hooks/              useAuth, useWebSocket (connexion partagée), useNotifications,
│                       useMessage, useSendMessage, useConversations, useChat, useOnboarding…
├── components/
│   ├── layout/             Header et footer de la landing
│   ├── sidebar.tsx, MobileSidebar.tsx
│   ├── BrandLogo.tsx       Logo adapté au thème (variant auto, light ou dark)
│   ├── chatbot/            Assistant Malaw (MalawAvatar, panneau, liste, écran vide)
│   ├── messagerie/, notification/, onboading/, profile/, settings/, dashboard/
│   ├── ui/                 Composants de base (button, card, dialog, drawer, input…)
│   └── protectedRoute.tsx, publicOnlyRoute.tsx
├── pages/
│   ├── auth/               Login, Register, VerifyMail, PasswordRecovery, NewPassword
│   ├── onboarding/
│   └── espace/             Espace connecté (voir les routes ci-dessous)
│       ├── workspace/          Espace projet : calendrier, visio, suivi par phases, historique
│       ├── annonceur/, freelance/, admin/
├── interfaces/, validations/, utils/, constants/
└── assets/images/      Logos (tw-brand-light/dark, tw-icon-light/dark), illustrations, malaw.jpg
```

## Routes

| Chemin | Page | Accès |
|---|---|---|
| `/` | Landing | Public |
| `/login`, `/register`, `/verify-email`, `/password-recovery`, `/new-password` | Authentification | Non connecté |
| `/onboarding` | Parcours d'inscription | Connecté |
| `/espace` | Tableau de bord | Connecté |
| `/espace/missions`, `/espace/missions/:missionId` | Recherche et détail d'une mission | Freelance |
| `/espace/candidatures`, `/espace/mes-missions`, `/espace/paiements-recus` | Suivi du freelance | Freelance |
| `/espace/publier-mission`, `/espace/mes-annonces`, `/espace/mes-annonces/:id/modifier` | Missions | Annonceur |
| `/espace/candidatures-recues` | Candidatures reçues, matching | Annonceur |
| `/espace/paiements-effectues` | Paiements | Annonceur |
| `/espace/projets` | Espace projet (coworking) | Freelance et annonceur |
| `/espace/messages` | Messagerie | Connecté |
| `/espace/assistant` | Assistant Malaw | Connecté |
| `/espace/profil`, `/espace/parametres` | Compte | Connecté |
| `/espace/admin`, `/espace/admin/services`, `/espace/admin/technologies`, `/espace/admin/signalements` | Administration | Admin |

`protectedRoute.tsx` vérifie la session ; `publicOnlyRoute.tsx` redirige un utilisateur déjà connecté.

## Couche API

- `api/axios.ts` crée l'instance avec `baseURL = http://localhost:8000/api/`.
  - Le jeton d'accès est lu dans `localStorage` (`access_token`) et ajouté à chaque requête non publique.
  - Sur un 401, le `refresh_token` est utilisé une seule fois ; les requêtes concurrentes sont mises en file d'attente puis rejouées.
- Chaque domaine expose des fonctions typées (`getMissions`, `soumettreLivrable`…). Les composants ne les appellent pas directement : ils passent par `useQuery` et `useMutation`.
- Clés de cache à connaître :
  - `["suivi", missionId]` et `["suivi-historique", missionId]` pour le coworking ;
  - `["propositions-workspace"]` pour l'espace projet ;
  - `["currentUser"]` pour l'utilisateur.

> L'URL du backend est écrite en dur dans `axios.ts`. En production, remplacez-la par une variable `VITE_API_URL`.

## Temps réel

`hooks/useWebSocket.ts` gère **une seule** connexion WebSocket, partagée par tous les hooks, vers `/ws/chat/`. Elle reçoit :
- les nouveaux messages de chat (`useMessage`, `useConversations`) ;
- les notifications (`useNotifications`), affichées dans la cloche de l'en-tête.

## Thème et identité visuelle

| Jeton | Couleur | Usage |
|---|---|---|
| `brand-ink` | `#094145` | Texte, fonds forts |
| `brand-green` | `#35D370` | Actions principales, succès |
| `brand-violet` | `#22177D` | Accents, liens |
| `brand-peach` | `#FED3BF` | Accents doux, alertes |
| `brand-sand` | `#E9DECE` | Surfaces secondaires |
| `brand-canvas` | `#FAF8F4` | Fond de la landing |

- **Clair et sombre** : `ThemeProvider` pose la classe `dark` sur `<html>` ; Tailwind utilise `@custom-variant dark (&:is(.dark *))`. Le choix est enregistré (light, dark ou system).
- **Logo** : `<BrandLogo />` affiche `tw-brand-light.png` ou `tw-brand-dark.png` selon le thème. En sombre, le violet devient lavande. `iconOnly` affiche le symbole seul (sidebar repliée). `variant="light"` ou `"dark"` force une version.
- **Landing** : toujours en clair, avec un seul fond (`--landing-bg`).
- **Assistant** : `<MalawAvatar size="xs | sm | md | lg" />` remplace l'icône bot partout sauf dans la sidebar.

## Espace projet (coworking)

`pages/espace/workspace/` :
- `ProjectWorkspacePage.tsx` : en-tête de la mission, calendrier, vue d'ensemble, visio LiveKit ;
- `SuiviProjet.tsx` :
  - `SuiviPhasesCard` : phases cadrage puis développement, soumission de livrables, examen par l'annonceur avec enregistreur vocal (MediaRecorder), bandeaux de retard et d'annulation ;
  - `HistoriqueCard` : frise des événements.

## Qualité

```bash
pnpm typecheck
pnpm lint
```

Des erreurs TypeScript préexistantes subsistent dans quelques fichiers (imports inutilisés, `user` possiblement nul dans `AssistantChatPanel.tsx`, `selectedId` dans `StepServices.tsx`). Elles sont à corriger avant de rendre `pnpm build` bloquant en intégration continue.
