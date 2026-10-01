#!/bin/sh
set -e

# Attendre que la base de données soit joignable (MySQL local ou RDS)
python - <<'EOF'
import os, socket, sys, time

if os.environ.get("USE_SQLITE", "True").strip().lower() in ("true", "1", "yes", "on"):
    print("SQLite sélectionné : aucune attente MySQL nécessaire")
    sys.exit(0)

host = os.environ.get("DB_HOST", "db")
port = int(os.environ.get("MYSQL_DATABASE_PORT", os.environ.get("DB_PORT", "3306")))

for _ in range(30):
    try:
        socket.create_connection((host, port), timeout=2).close()
        print(f"Base de données joignable sur {host}:{port}")
        break
    except OSError:
        print("En attente de la base de données...")
        time.sleep(2)
else:
    sys.exit("Impossible de joindre la base de données")
EOF

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
