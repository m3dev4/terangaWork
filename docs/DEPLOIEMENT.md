# Déploiement

## Docker Compose

Le fichier d'orchestration est `backend/docker-compose.yml`. Lancez les commandes depuis le dossier `backend/`.

| Service | Build | Port exposé | Dépend de | Healthcheck |
|---|---|---|---|---|
| `web` (Django) | `backend/` | `8000:8000` | `ia` en bonne santé | `GET /api/docs/` |
| `ia` (FastAPI) | `ia/` | `127.0.0.1:8001:8000` (local uniquement) | — | `GET /health` |
| `db` (MySQL 8.4) | image | non exposé | — | — (profil `local` uniquement) |
| `frontend` (Nginx) | `frontend/` (multi-étapes : Node 22 + pnpm, puis Nginx) | `5173:80` | `web` | `GET /` |

```bash
cd backend
docker compose up --build -d                     # SQLite
docker compose --profile local up --build -d     # avec MySQL local (mettre USE_SQLITE=False)
docker compose logs -f web ia                    # journaux
docker compose exec web python manage.py createsuperuser
docker compose down
```

Au démarrage, `backend/entrypoint.sh` :
1. attend que MySQL réponde, si `USE_SQLITE=False` ;
2. applique les migrations (`migrate`) ;
3. collecte les fichiers statiques (`collectstatic`) ;
4. lance Daphne sur le port 8000 (HTTP et WebSocket).

Volumes : `db.sqlite3` et `media/` sont montés depuis l'hôte ; les données MySQL vont dans le volume `mysql_data`.

### Image du frontend

`frontend/Dockerfile` construit l'application en deux étapes :
1. **Build** (`node:22-alpine`) : `pnpm install --frozen-lockfile`, puis `vite build`.
2. **Service** (`nginx:1.27-alpine`) : sert `dist/`. Le routage SPA renvoie toujours `index.html`, les fichiers `assets/` sont mis en cache longtemps et la compression gzip est active (`frontend/nginx.conf`).

L'URL de l'API est **figée au moment du build**, car Vite l'injecte dans le JavaScript. C'est l'URL vue par le navigateur, pas celle d'un conteneur :

```bash
# local (valeur par défaut)
docker compose up --build frontend

# production
VITE_API_URL=https://api.terangawork.com/api/ docker compose build frontend
```

`VITE_WS_URL` est facultative. Par défaut, elle est déduite de `VITE_API_URL` (`https://…/api/` donne `wss://…/ws/chat/`).

La vérification TypeScript ne bloque pas l'image : lancez `pnpm typecheck` en CI.

## Tâche planifiée obligatoire

La détection des retards du coworking ne tourne pas toute seule. Lancez-la **une fois par jour** :

```bash
# cron sur l'hôte, tous les jours à 7 h
0 7 * * * cd /chemin/terangawork/backend && docker compose exec -T web python manage.py detecter_retards_suivi
```

Vous pouvez aussi utiliser un workflow n8n planifié qui exécute la même commande.

## Mise en production : checklist

**Django**
- [ ] `DEBUG=False` et un `SECRET_KEY` unique et long.
- [ ] `ALLOWED_HOSTS` et `CORS_ALLOWED_ORIGINS` limités aux domaines réels.
- [ ] MySQL (RDS ou autre) : `USE_SQLITE=False`, `DB_HOST`, identifiants.
- [ ] Couche Channels Redis à la place de `InMemoryChannelLayer` si plusieurs instances tournent.
- [ ] HTTPS devant Django : WebSocket en `wss://`, webhooks PayDunya en HTTPS.

**Paiement**
- [ ] `PAYDUNYA_MODE=live`, `PAYDUNYA_SIMULATE_DISBURSEMENT=False`.
- [ ] `PAYDUNYA_CALLBACK_BASE_URL` et `PAYDUNYA_RETURN_BASE_URL` sur les domaines publics.

**Intégrations**
- [ ] `N8N_MODERATION_SECRET` défini, et l'en-tête `X-N8N-Secret` ajouté dans le workflow n8n.
- [ ] `FASTAPI_INTERNAL_API_KEY` long et aléatoire. Le microservice IA ne doit pas être exposé publiquement.
- [ ] `DEFAULT_FROM_EMAIL` sur un domaine vérifié chez Resend.

**Frontend et IA**
- [ ] Image du frontend construite avec `VITE_API_URL` pointant vers l'API publique en HTTPS.
- [ ] Versions du microservice IA figées.

**Exploitation**
- [ ] Tâche quotidienne `detecter_retards_suivi` programmée.
- [ ] Sauvegardes de la base et du dossier `media/`.
- [ ] Sentry configuré (facultatif).

## Vérifications après déploiement

```bash
curl -f https://<api>/api/docs/                   # Django répond
curl -f http://127.0.0.1:8001/health              # IA répond (depuis le serveur)
docker compose exec web python manage.py check --deploy
```
