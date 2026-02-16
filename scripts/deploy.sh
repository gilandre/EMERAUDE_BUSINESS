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
  for i in $(seq 1 20); do
    sleep 5
    HEALTH=$(docker compose exec -T "$svc" node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(t=>{console.log(t);process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null) && {
      echo "  -> ${svc} responded: $HEALTH"
      break
    }
    if [ "$i" -eq 20 ]; then
      echo "  !! ${svc} not responding after 100s"
      docker compose logs --tail=50 "$svc"
      exit 1
    fi
    echo "  -> ${svc} not ready yet (attempt $i/20)..."
  done
done

echo "==> Reloading nginx..."
docker compose exec -T nginx nginx -s reload

echo "==> Cleaning up old images..."
docker image prune -f

echo "==> Deployment complete!"
