# ── Étape 1 : build de l'application (Node 22 + pnpm) ───────────────────────
FROM node:22-alpine AS build

WORKDIR /app
RUN npm install -g pnpm@10

# Dépendances d'abord, pour profiter du cache Docker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# URL de l'API et du WebSocket vues par le NAVIGATEUR (injectées au build par Vite)
ARG VITE_API_URL=http://localhost:8000/api/
ARG VITE_WS_URL=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL

# vite build directement : la vérification TypeScript (pnpm typecheck)
# se fait en CI, elle ne bloque pas l'image.
RUN pnpm exec vite build

# ── Étape 2 : service des fichiers statiques (Nginx) ────────────────────────
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1/ || exit 1
