#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# EMERAUDE BUSINESS - Script de déploiement
# Usage: ./scripts/deploy.sh /chemin/vers/projet [tag]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_DIR="${1:?Usage: $0 <deploy-dir> [image-tag]}"
TAG="${2:-latest}"
IMAGE="ghcr.io/gilandre/emeraude-business:${TAG}"
MIGRATOR="ghcr.io/gilandre/emeraude-business-migrator:${TAG}"

cd "$DEPLOY_DIR"

echo "==> Pulling images..."
docker pull "$IMAGE"
docker pull "$MIGRATOR"

echo "==> Running Prisma migrations..."
docker run --rm --network emeraude_business_backend --env-file .env \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-emeraude}:${POSTGRES_PASSWORD:-emeraude}@emeraude-postgres:5432/${POSTGRES_DB:-emeraude}" \
  "$MIGRATOR"

echo "==> Rolling restart of app instances..."
for svc in app1 app2 app3; do
  echo "  -> Restarting ${svc}..."
  docker compose up -d --no-deps "$svc"
  sleep 15

  echo "  -> Health check ${svc}..."
  if docker compose exec -T "$svc" wget -qO- http://localhost:3000/api/health | grep -q '"status":"healthy"'; then
    echo "  -> ${svc} is healthy"
  else
    echo "  !! ${svc} health check FAILED"
    exit 1
  fi
done

echo "==> Reloading nginx..."
docker compose exec -T nginx nginx -s reload

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Deployment complete!"
