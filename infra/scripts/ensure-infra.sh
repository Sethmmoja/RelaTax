#!/usr/bin/env bash
# Brings up the local infra (Postgres/Redis/MinIO) before the API dev server
# starts, launching Docker Desktop itself if it isn't running yet. Run
# automatically via apps/api's "predev" script — see package.json.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.yml"

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon not running — starting Docker Desktop..."
  open -a Docker 2>/dev/null || true

  for _ in $(seq 1 60); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done

  if ! docker info >/dev/null 2>&1; then
    echo "Docker did not become ready after 60s. Start Docker Desktop manually and re-run 'pnpm dev'." >&2
    exit 1
  fi
fi

docker compose -f "$COMPOSE_FILE" up -d postgres redis minio

# A brand-new MinIO volume has no buckets, and the API fails every document
# upload with NoSuchBucket until one exists. Create it once it's healthy; both
# steps are idempotent so re-running on an existing volume is a no-op.
# Dev-only: production uses Cloudflare R2, where the bucket already exists.
for _ in $(seq 1 30); do
  docker compose -f "$COMPOSE_FILE" exec -T minio mc alias set local http://localhost:9000 relatax relatax123 >/dev/null 2>&1 && break
  sleep 1
done
docker compose -f "$COMPOSE_FILE" exec -T minio mc mb --ignore-existing local/relatax-documents >/dev/null 2>&1 \
  && echo "MinIO bucket relatax-documents ready" \
  || echo "Warning: could not ensure MinIO bucket — document uploads may fail with NoSuchBucket" >&2
