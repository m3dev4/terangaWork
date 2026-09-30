# Application `config` — La configuration du projet

## À quoi sert cette application ?

`config` n'est pas une application métier : c'est le **poste de pilotage**
du backend. Elle ne contient ni modèles, ni endpoints propres. Elle décide
de tout ce qui est transverse : quelle base de données, quelles
applications sont chargées, qui a le droit d'appeler l'API, comment les
emails partent, où les fichiers sont stockés…

> **Analogie pour non-développeur** : si le backend est un restaurant,
  `config` est le bureau du directeur. On n'y cuisine pas, mais c'est là
  qu'on décide du menu (applications), des fournisseurs (base de données,
  Cloudinary, Resend) et des horaires d'ouverture (CORS, sécurité).

## Les fichiers, un par un

### `settings.py` — Tous les réglages

Le fichier est organisé en sections. Chaque valeur sensible est lue depuis
un fichier `.env` grâce à `python-decouple` (`config("MA_VARIABLE")`) : les
secrets ne vivent jamais dans le code.

**Surveillance (Sentry)** : chaque erreur survenant sur le serveur est
envoyée à Sentry avec sa trace complète. C'est le « boîtier noir » du
backend : quand quelque chose casse en production, l'équipe le voit
immédiatement, avec le contexte.

**Sécurité de base** :

| Réglage | Rôle |
|---|---|
| `SECRET_KEY` | Clé de chiffrement interne de Django. Lue depuis `.env`. |
| `DEBUG` | Mode débogage : `True` en développement, **jamais** en production. |
| `ALLOWED_HOSTS` | Liste blanche des noms de domaine autorisés à parler au serveur. |

**Applications chargées (`INSTALLED_APPS`)** : d'abord les briques Django
(admin, auth, sessions…), puis les bibliothèques tierces (REST Framework,
JWT, CORS, drf-spectacular), enfin les six applications de Teranga Work :
`User`, `Service`, `Technologie`, `freelance`, `announcer`, `mission`.

**Middleware** : la « chaîne de contrôle » par laquelle passe chaque
requête — sécurité, CORS, sessions, protection CSRF, clic jacking…

**Base de données** : SQLite (fichier `db.sqlite3`) — simple et parfait pour
le développement. Prévoir PostgreSQL pour la production.

**Validation des mots de passe** : Django applique ses règles (longueur
minimale, mots de passe trop courants, similarité avec le compte…), en plus
de la politique maison définie dans `User/serializers.py`.

**Langue et fuseaux** : interface en français (`fr-fr`), dates en UTC.

**Fichiers** : `MEDIA_ROOT` désigne le dossier `media/` (photos de profil
locales en développement) ; en production, les images passent par
Cloudinary.

**API (REST Framework)** :

| Réglage | Signification |
|---|---|
| `DEFAULT_AUTHENTICATION_CLASSES` | Toute l'API fonctionne avec des tokens JWT (Simple JWT). |
| `DEFAULT_PERMISSION_CLASSES` | Par défaut, lecture possible sans être connecté, écriture interdite — chaque application resserre ensuite ses propres règles. |
| `DEFAULT_SCHEMA_CLASS` | drf-spectacular génère la documentation OpenAPI. |

**Durées de vie des tokens (Simple JWT)** : badge d'accès 9 heures, badge
de renouvellement 14 jours, avec rotation automatique du refresh token.

**CORS** : seuls le frontend de développement (`localhost:5173`) et les
origines listées dans `.env` peuvent appeler l'API depuis un navigateur.
C'est la protection contre les sites tiers qui tenteraient d'agir au nom
de nos utilisateurs.

**Emails** : en développement, les emails sont affichés dans la **console**
(backend `console.EmailBackend`) — pratique pour tester sans envoyer de
vrais messages. La production bascule sur Resend (voir
`User/email_service.py`).

**`AUTH_USER_MODEL = "User.User"`** : indique à Django que le compte
utilisateur est défini par notre application `User`, pas par le sien. ⚠️ Ce
réglage doit être en place **avant** la toute première migration, sinon la
base devient incohérente.

**`MAX_ACTIVE_SESSIONS`** : nombre maximal de sessions simultanées (5 par
défaut) — défini mais pas encore appliqué.

### `urls.py` — Le plan général des adresses

C'est la table des matières de l'API :

| Adresse | Rôle |
|---|---|
| `/admin/` | Interface d'administration Django. |
| `/api/auth/token/` et `/api/auth/token/refresh/` | Obtention et renouvellement des tokens JWT. |
| `/api/schema/` et `/api/docs/` | Documentation OpenAPI et interface Swagger (explorable dans un navigateur). |
| `/api/` + `User.urls` | Authentification, profils, onboarding. |
| `/api/` + `Service.urls` | Catalogue des services. |
| `/api/` + `Technologie.urls` | Catalogue des technologies. |
| `/api/` + `freelance.urls` | CV des freelances. |
| `/api/` + `announcer.urls` | Profils annonceurs. |
| `/api/` + `mission.urls` | Missions publiées. |

En mode débogage, les fichiers du dossier `media/` sont également servis
(utile pour les photos de profil en développement).

### `asgi.py` / `wsgi.py` — Les points d'entrée

Deux fichiers quasi identiques générés par Django :

- `wsgi.py` : point d'entrée « classique », utilisé par la plupart des
  serveurs de production ;
- `asgi.py` : point d'entrée « asynchrone », nécessaire si l'on ajoute plus
  tard du temps réel (WebSockets, notifications instantanées).

Ils se contentent de charger les réglages et de créer l'application.

## Variables d'environnement attendues (`.env`)

| Variable | Utilité |
|---|---|
| `SECRET_KEY` | Clé secrète Django. |
| `DEBUG` | Mode débogage. |
| `ALLOWED_HOSTS` | Domaines autorisés. |
| `CORS_ALLOWED_ORIGINS` | Origines frontend autorisées. |
| `RESEND_API_KEY` | Envoi des emails (production). |
| `DEFAULT_FROM_EMAIL` | Adresse d'expéditeur des emails. |
| `FRONTEND_URL` | Base des liens envoyés par email (réinitialisation). |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Hébergement des images. |
| `MAX_ACTIVE_SESSIONS` | Nombre maximal de sessions actives. |

## Points d'attention

- La clé Sentry et une valeur de repli de `SECRET_KEY` sont visibles dans le
  code : la valeur de repli doit disparaître avant la production.
- SQLite convient au développement ; PostgreSQL sera nécessaire pour la
  production.
- Les emails en console ne fonctionnent qu'en développement : penser à
  configurer Resend avant tout test réel.
