# Appeler l'API depuis le frontend

Le frontend utilise l'instance Axios exportée par `src/api/axios.ts`. Elle pointe vers `http://localhost:8000/api/` et ajoute automatiquement le JWT présent dans `localStorage.access_token`. Les réponses sont donc appelées avec des chemins relatifs à `/api/`.

## Missions annonceur

Les fonctions de `src/api/missionsApi.ts` couvrent le CRUD du backend :

```ts
import {
  createMission,
  getMissions,
  updateMission,
  deleteMission,
} from "./missionsApi";

const missions = await getMissions();

const created = await createMission({
  title: "Créer une application",
  description: "Développer une application web.",
  date_deadline: "2026-12-31",
  operateurMobileMoney: "WAVE",
  budget: 500000,
  service: 1,
});

await updateMission({ id: created.id, payload: { title: "Nouveau titre" } });
await deleteMission(created.id);
```

Routes backend utilisées : `GET /api/missions/`, `POST /api/missions/`, `PATCH /api/missions/:id/` et `DELETE /api/missions/:id/`. Le champ `annonceur` ne doit jamais être envoyé : le backend le déduit de l'utilisateur authentifié. Les services disponibles se récupèrent avec `getMissionServices()` via `GET /api/services/`.

Les pages utilisent React Query avec les clés `missions` et `mission-services`. Après une création, modification ou suppression, la liste est invalidée afin de refléter immédiatement l'état du serveur.

## Recherche freelance

Un freelance authentifié consulte la liste sur `GET /api/missions/` et le détail sur `GET /api/missions/:id/`. Dans l'application, ces URLs correspondent à `/espace/missions` et `/espace/missions/:missionId`. La page de recherche affiche des skeletons pendant le chargement, puis filtre les résultats localement. Le paramètre dynamique `missionId` est lu avec `useParams()` dans `MissionDetailPage.tsx`.

Les freelances disposent uniquement des droits de lecture. Les actions `POST`, `PATCH` et `DELETE` restent réservées aux annonceurs propriétaires de leurs missions.
