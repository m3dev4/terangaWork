# Teranga Work — backend et microservice IA

Depuis `backend`, avec Docker Desktop démarré :

```sh
docker compose up -d --build web ia
docker compose ps
docker compose logs --tail=100 web ia
```

Django est exposé sur le port 8000. Le contrôle de santé IA est accessible
sur `http://127.0.0.1:8001/health`. Matching et chatbot exigent la clé interne.

Compose charge `backend/.env` et `ia/.env`. `FASTAPI_INTERNAL_API_KEY` du
backend est transmis aux deux côtés de la communication interne. Les clés
des fournisseurs IA restent dans `ia/.env`, exclu de l'image.

Django appelle `http://ia:8000` et l'IA appelle `http://web:8000/api`.
Ajouter `web` à `ALLOWED_HOSTS` si cette liste est restrictive.

Daphne sert HTTP et WebSocket via `config.asgi`. Channels utilise une couche
en mémoire : garder une seule instance backend ; utiliser une couche
partagée avant d'augmenter le nombre d'instances.

SQLite est le mode par défaut. `backend/db.sqlite3` doit exister avant le
démarrage ; il est monté dans le conteneur avec `backend/media` pour conserver
les données lors des reconstructions. Le démarrage applique les migrations.

Pour MySQL local, définir `USE_SQLITE=False`, `DB_HOST=db` et les variables
`MYSQL_DATABASE_NAME`, `MYSQL_DATABASE_USER`, `MYSQL_DATABASE_PASSWORD`, puis :

```sh
docker compose --profile local up -d --build
```

Pour MySQL externe, configurer `DB_HOST` et laisser le profil `local` désactivé.
Ne pas utiliser `docker compose down -v` pour une mise à jour : cette commande
supprimerait les volumes nommés, dont les données MySQL locales.
