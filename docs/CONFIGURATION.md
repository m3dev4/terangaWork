# Configuration

Chaque service lit son propre fichier `.env`. Les modèles à copier sont `backend/.env.example` et `ia/.env.example`.

> **Ne commitez jamais un `.env`.** Ils contiennent des secrets : clés API, mots de passe, clés de paiement.

## Backend (`backend/.env`)

### Django

| Variable | Défaut | Description |
|---|---|---|
| `SECRET_KEY` | — | Clé secrète Django. **Obligatoire et unique en production** |
| `DEBUG` | `True` | **Mettre `False` en production** |
| `ALLOWED_HOSTS` | — | Domaines autorisés, séparés par des virgules |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Origines autorisées du frontend |
| `FRONTEND_URL` | — | URL publique du frontend (liens des emails) |
| `MAX_ACTIVE_SESSIONS` | `5` | Sessions simultanées par utilisateur |

### Base de données

| Variable | Défaut | Description |
|---|---|---|
| `USE_SQLITE` | `True` | `True` : SQLite (`db.sqlite3`). `False` : MySQL |
| `MYSQL_DATABASE_NAME`, `MYSQL_DATABASE_USER`, `MYSQL_DATABASE_PASSWORD` | — | Identifiants MySQL |
| `DB_HOST` | — | Hôte MySQL (`db` avec Docker, sinon l'hôte RDS en production) |
| `MYSQL_DATABASE_PORT` | `3306` | Port MySQL |
| `DB_ROOT_PASSWORD` | `rootpassword` | Mot de passe root du MySQL local (profil Docker `local`) |

### Microservice IA

| Variable | Défaut | Description |
|---|---|---|
| `FASTAPI_MATCHING_URL` | `http://localhost:8000` | URL du microservice IA. Docker la force à `http://ia:8000` |
| `FASTAPI_INTERNAL_API_KEY` | — | Clé partagée avec l'IA. **Obligatoire** : Docker Compose refuse de démarrer sans elle |

### Paiement (PayDunya)

| Variable | Défaut | Description |
|---|---|---|
| `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_TOKEN` | — | Clés PayDunya |
| `PAYDUNYA_MODE` | `test` | `test` ou `live` |
| `PAYDUNYA_COMMISSION_RATE` | `0.10` | Commission de la plateforme (10 %) |
| `PAYDUNYA_CALLBACK_BASE_URL` | — | URL publique des webhooks (`…/api/webhooks/paydunya/`) |
| `PAYDUNYA_RETURN_BASE_URL` | `http://localhost:5173/espace/projets` | Retour de l'annonceur après paiement |
| `PAYDUNYA_SIMULATE_DISBURSEMENT` | `True` | Simule le décaissement. **Mettre `False` en production** |

### Services externes

| Variable | Description |
|---|---|
| `RESEND_API_KEY`, `DEFAULT_FROM_EMAIL` | Envoi d'emails (Resend) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Stockage des images |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Visioconférence |
| `N8N_MODERATION_SECRET` | Secret attendu dans l'en-tête `X-N8N-Secret` des appels de modération. **À définir en production** : sans lui, l'appel est accepté sans contrôle et un avertissement est journalisé |

Les URL des webhooks n8n (`N8N_DESCRIPTION_WEBHOOK_URL`, `N8N_MODERATION_WEBHOOK_URL`) sont aujourd'hui écrites dans `config/settings.py`.

### Coworking

| Variable | Défaut | Description |
|---|---|---|
| `SUIVI_DELAI_CADRAGE_JOURS` | `5` | Délai de livraison du cadrage après acceptation |
| `SUIVI_DELAI_VALIDATION_JOURS` | `3` | Jours sans réponse de l'annonceur avant l'alerte admin |

Ces deux valeurs sont lues comme réglages Django. Ajoutez-les dans `settings.py` pour les changer.

## Microservice IA (`ia/.env`)

Voir le détail dans [IA.md](IA.md#configuration). Variables :
- `INTERNAL_API_KEY`, `DJANGO_BASE_URL`, `DJANGO_INTERNAL_API_KEY` ;
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` ;
- `HF_TOKEN`, `HUGGINGFACE_MODEL`, `HF_TIMEOUT` ;
- `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_TIMEOUT` ;
- `LOG_LEVEL`.

Dans Docker, `INTERNAL_API_KEY` et `DJANGO_INTERNAL_API_KEY` sont injectées automatiquement depuis `FASTAPI_INTERNAL_API_KEY` du backend.

## Frontend (`frontend/.env`)

Le fichier est chargé par Docker Compose. Aujourd'hui, l'URL de l'API est écrite en dur dans `src/api/axios.ts` (`http://localhost:8000/api/`).

`VITE_BACKEND_URL` est fournie par Docker Compose mais n'est pas encore lue par le code. Pour la production, faites lire `import.meta.env.VITE_BACKEND_URL` par `axios.ts` et par le WebSocket.

## Clés partagées : récapitulatif

| Secret | Backend | IA | n8n |
|---|---|---|---|
| Clé interne Django ↔ IA | `FASTAPI_INTERNAL_API_KEY` | `INTERNAL_API_KEY` et `DJANGO_INTERNAL_API_KEY` | — |
| Secret de modération | `N8N_MODERATION_SECRET` | — | En-tête `X-N8N-Secret` du nœud HTTP |
