# Application `freelance` — Les profils et CV des freelances

## À quoi sert cette application ?

Un **freelance** est un utilisateur de Teranga Work qui propose ses services. Cette
application gère son **profil professionnel complet** — l'équivalent d'un CV
en ligne :

- le **profil principal** (`Freelancee`) : titre professionnel, présentation,
  liens GitHub et LinkedIn, technologies maîtrisées, service principal ;
- les **expériences** (`Experience`) : les postes occupés ;
- les **formations** (`Education`) : le parcours scolaire et universitaire ;
- les **réalisations** (`Realisation`) : les projets et travaux livrés.

> **Analogie pour non-développeur** : c'est le CV numérique du freelance.
  Le profil est la page de garde, et chaque section (expériences,
  formations, réalisations) s'empile derrière, exactement comme les rubriques
  d'un CV papier.

## Règle fondamentale : un seul profil par utilisateur

Comme pour les annonceurs, chaque freelance possède **un et un seul** profil
(`OneToOneField`). Les expériences, formations et réalisations appartiennent
chacune à un profil, et le système garantit qu'un freelance ne peut jamais
lire ou modifier les rubriques d'un **autre** freelance.

## Qui peut faire quoi ?

| Action | Freelance | Annonceur |
|---|---|---|
| Lire / créer / modifier son profil (`/api/freelance/me/`) | ✅ | ❌ (403) |
| Lister ses expériences, formations, réalisations | ✅ | ❌ (liste vide) |
| Créer / modifier / supprimer ses expériences, formations, réalisations | ✅ | ❌ (404) |

## Les fichiers, un par un

### `models.py` — Les quatre briques du CV

**`Freelancee` (la page de garde)**

| Champ | Signification |
|---|---|
| `user` | Lien unique vers le compte utilisateur. |
| `title` | Titre professionnel (ex. « Développeur Full-Stack »). |
| `description` | Présentation libre (5000 caractères max). |
| `githubUrl` / `linkedinUrl` | Liens vers les profils publics. Optionnels. |
| `technologies` | Les technologies maîtrisées : plusieurs possibles (relation « plusieurs-à-plusieurs » avec `Technologie`). |
| `service` | Le service principal proposé (lien vers `Service`). `PROTECT` : impossible de supprimer un service encore utilisé par un profil. |

**`Experience` (une ligne du parcours professionnel)**

| Champ | Signification |
|---|---|
| `freelance` | Le profil propriétaire. |
| `entreprise` / `poste` | Où, et en tant que quoi. |
| `startDate` / `endDate` | Période. `endDate` est optionnelle si le poste est en cours. |
| `current` | « Poste actuel » : si coché, la méthode `save` décoche automatiquement les autres postes marqués « actuels » — un seul poste en cours à la fois. |
| `description` | Missions réalisées dans ce poste. |

**`Education` (une formation suivie)**

Même logique qu'`Experience`, avec en plus :

| Champ | Signification |
|---|---|
| `role` | Type de formation : `UNIVERSITAIRE`, `FORMATION_PROFESSIONNELLE` ou `EN_LIGNE`. |
| `nom` / `etablissement` / `intitule` | Intitulé, établissement, diplôme. |
| `date_obtention` | Date d'obtention du diplôme. |
| `lien_verification` | URL permettant de vérifier le diplôme. |
| `current` | Formation en cours — même règle d'unicité que pour les expériences. |

**`Realisation` (un projet livré)**

| Champ | Signification |
|---|---|
| `title` / `description` | Le projet et son contexte. |
| `link` | Lien vers le projet en ligne (site, dépôt GitHub…). |

**`DiplomeObtenu`** : modèle présent mais **non relié** au reste (pas de
lien vers un profil, pas d'endpoint). C'est une coquille vide pour
l'instant, probablement destinée à la vérification de diplômes plus tard.

### `serializers.py` — Les traducteurs JSON et les validations

- **`ExperienceSerializer` / `EducationSerializer`** : vérifient la
  cohérence des dates — la fin doit être **après** le début, et une
  expérience « en cours » ne peut pas avoir de date de fin. Les messages
  d'erreur sont rattachés au champ `endDate` pour que le frontend puisse
  les afficher au bon endroit.
- **`RealisationSerializer`** : simple, expose `id`, `title`, `link`,
  `created_at`.
- **`FreelanceeSerializer`** : le plus riche. Points notables :
  - `technologies` reçoit une **liste d'identifiants** ;
  - `experiences`, `educations`, `realisations` sont **imbriqués en lecture
    seule** : lire le profil renvoie tout le CV d'un coup, mais ces rubriques
    se gèrent via leurs propres endpoints ;
  - à la création : vérification du rôle, unicité du profil, puis
    attachement des technologies ;
  - à la modification : mise à jour ciblée (`update_fields`) et
    remplacement éventuel de la liste de technologies.

### `views.py` — L'architecture d'isolement

Le fichier repose sur deux briques réutilisables :

**`FreelanceOwnershipMixin`** : fournit `get_freelance()`, qui récupère le
profil du freelance connecté ou renvoie 404. Toutes les vues s'en servent —
c'est ce qui garantit qu'on ne touche jamais au CV d'autrui.

**`OwnedResourceViewSet`** : un ViewSet générique dont héritent les trois
ressources (expériences, formations, réalisations). Son `get_queryset`
filtre systématiquement sur le profil connecté : un autre utilisateur
obtient une liste vide, et une tentative d'accès directe à un objet
d'autrui renvoie 404. `perform_create` attache automatiquement la ressource
au bon profil.

**`FreelanceViewSet`** : gère le profil principal via l'action `me`
(GET / POST / PATCH), avec exactement le même déroulement que le profil
annonceur : contrôle du rôle, puis lecture, création unique ou modification
partielle.

### `urls.py` — L'adresse des endpoints

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/freelance/me/` | GET / POST / PATCH | Profil principal du freelance connecté |
| `/api/experiences/` | GET / POST | Liste / création des expériences |
| `/api/experiences/{id}/` | GET / PATCH / DELETE | Détail d'une expérience |
| `/api/educations/` | GET / POST | Liste / création des formations |
| `/api/educations/{id}/` | GET / PATCH / DELETE | Détail d'une formation |
| `/api/realisations/` | GET / POST | Liste / création des réalisations |
| `/api/realisations/{id}/` | GET / PATCH / DELETE | Détail d'une réalisation |

## Liens avec les autres applications

- `User` : le profil appartient à un compte ; le rôle `freelance` est choisi
  lors de l'onboarding, qui remplit aussi profil, service et technologies.
- `Technologie` : le catalogue des compétences cochables.
- `Service` : le service principal proposé par le freelance.

## Points d'attention

- `DiplomeObtenu` est un modèle orphelin : à relier ou supprimer.
- Les champs `githubUrl` / `linkedinUrl` sont limités à 100 caractères, ce
  qui est court pour des URLs LinkedIn réelles — des liens longs seront
  rejetés par la base.
- Il n'existe pas encore de vue **publique** du profil freelance (pour que
  les annonceurs consultent un CV avant de recruter) : à prévoir dans une
  future itération.
