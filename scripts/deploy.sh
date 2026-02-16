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

# Source .env to get POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
set -a && source .env && set +a

echo "==> Pulling images..."
docker pull "$IMAGE"
docker pull "$MIGRATOR"

echo "==> Running Prisma migrations..."
docker run --rm --network emeraude_business_backend \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-emeraude}:${POSTGRES_PASSWORD:-emeraude}@emeraude-postgres:5432/${POSTGRES_DB:-emeraude}" \
  "$MIGRATOR"

echo "==> Rolling restart of app instances..."
for svc in app1 app2 app3; do
  echo "  -> Restarting ${svc}..."
  docker compose up -d --no-deps --force-recreate "$svc"

  echo "  -> Waiting for ${svc} to be ready..."
  for i in $(seq 1 12); do
    sleep 10
    if docker compose exec -T "$svc" wget -qO- http://localhost:3000/api/health 2>/dev/null | grep -q '"status":"healthy"'; then
      echo "  -> ${svc} is healthy (attempt $i)"
      break
    fi
    if [ "$i" -eq 12 ]; then
      echo "  !! ${svc} health check FAILED after 120s"
      docker compose logs --tail=30 "$svc"
      exit 1
    fi
    echo "  -> ${svc} not ready yet (attempt $i/12)..."
  done
done

echo "==> Reloading nginx..."
docker compose exec -T nginx nginx -s reload

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Deployment complete!"
