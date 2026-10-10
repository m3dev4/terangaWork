# Packages et dépendances

Versions relevées le 10 octobre 2026 pour la release v1.0.0. Les fichiers qui font foi sont :
- `frontend/package.json` et `frontend/pnpm-lock.yaml` ;
- `backend/requirements.txt` ;
- `ia/requirements.txt`.

## Frontend (pnpm, Node 22)

### Dépendances

| Package | Version | Rôle |
|---|---|---|
| `react`, `react-dom` | 19.2.8 | Bibliothèque d'interface |
| `react-router-dom` | 7.18.3 | Routage |
| `@tanstack/react-query` | ^5.102 | Cache et synchronisation des données serveur |
| `@tanstack/react-query-devtools` | ^5.102 | Outils de debug de React Query |
| `axios` | 1.20.0 | Client HTTP |
| `react-hook-form` | 7.88.0 | Formulaires |
| `zod` | 4.6.4 | Validation de schémas |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | CSS utilitaire |
| `tw-animate-css` | ^1.4 | Animations Tailwind |
| `@base-ui/react` | ^1.8 | Primitives accessibles (dialog, toast…) |
| `shadcn` | ^4.21 | Génération des composants `ui/` |
| `class-variance-authority`, `cn` | — | Variantes et fusion de classes |
| `lucide-react` | 1.43.0 | Icônes |
| `@fontsource-variable/geist` | ^5.3 | Police Geist |

### Outils de développement

| Package | Version | Rôle |
|---|---|---|
| `vite` | 8.2.2 | Serveur de développement et build |
| `@vitejs/plugin-react` | ^6.1 | Support React pour Vite |
| `typescript` | 6.0.3 | Typage |
| `eslint`, `@eslint/js`, `typescript-eslint` | ^10, ^8.67 | Lint |
| `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | — | Règles React |
| `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier` | ^3.9 | Formatage |
| `@types/react`, `@types/react-dom`, `@types/node` | — | Types |

## Backend (pip, Python 3.12)

| Package | Version | Rôle |
|---|---|---|
| `Django` | 5.2.17 | Framework web |
| `djangorestframework` | 3.18.1 | API REST |
| `djangorestframework_simplejwt` | 5.5.1 | Authentification JWT |
| `drf-spectacular` | 0.30.0 | Schéma OpenAPI, Swagger |
| `django-cors-headers` | 4.9.0 | CORS |
| `channels` | 4.2.0 | WebSocket |
| `channels-redis` | 4.2.1 | Couche Channels Redis (production multi-instance) |
| `daphne` | 4.2.0 | Serveur ASGI |
| `gunicorn` | ≥ 23.0 | Serveur WSGI (option) |
| `whitenoise` | ≥ 6.9 | Fichiers statiques |
| `mysqlclient` | 2.3.0 | Pilote MySQL |
| `mysql-connector-python` | 26.7.0 | Connecteur MySQL |
| `python-decouple` | 3.8 | Lecture du `.env` |
| `requests` | 2.34.2 | HTTP synchrone (PayDunya, n8n, IA) |
| `httpx` | ≥ 0.24, < 1.0 | HTTP |
| `PyJWT` | 2.14.0 | Jetons LiveKit |
| `cloudinary` | 1.46.2 | Stockage des images |
| `resend` | 2.44.0 | Emails |
| `pillow` | 12.3.0 | Images (`ImageField`) |
| `sentry-sdk` | 2.69.1 | Suivi des erreurs |
| `PyYAML`, `uritemplate`, `inflection`, `jsonschema` | — | Dépendances de drf-spectacular |

## Microservice IA (pip, Python 3.11)

| Package | Version | Rôle |
|---|---|---|
| `fastapi` | ≥ 0.100 | Framework API |
| `uvicorn[standard]` | ≥ 0.22 | Serveur ASGI |
| `pydantic`, `pydantic-settings` | ≥ 2.0 | Schémas et configuration |
| `httpx` | ≥ 0.24 | Appels OpenRouter, Groq, Django |
| `huggingface_hub` | dernière | Client d'inférence Hugging Face |
| `python-dotenv` | ≥ 1.0 | Lecture du `.env` |
| `pytest`, `pytest-asyncio` | ≥ 7.3, ≥ 0.21 | Tests |

> Les versions du microservice IA ne sont fixées que par un minimum (`>=`). Avant une mise en production, figez-les (`pip freeze > requirements.lock`) pour garantir des builds reproductibles.

## Services externes

| Service | Usage | Compte requis |
|---|---|---|
| PayDunya | Paiement Wave et Orange Money | Oui (clés test et live) |
| OpenRouter | LLM du matching | Oui |
| Hugging Face | LLM de l'assistant | Oui (`HF_TOKEN`) |
| Groq | LLM de relais de l'assistant | Oui |
| n8n | Workflows de rédaction et de modération | Oui (instance cloud ou auto-hébergée) |
| Cloudinary | Images | Oui |
| Resend | Emails | Oui |
| LiveKit | Visioconférence | Oui |
| Sentry | Erreurs (facultatif) | Facultatif |

## Images Docker

| Service | Image de base |
|---|---|
| backend | `python:3.12-slim` (avec `build-essential` et `default-libmysqlclient-dev`) |
| ia | `python:3.11-slim` |
| db (profil `local`) | `mysql:8.4` |
| frontend | construit depuis `../frontend` |
