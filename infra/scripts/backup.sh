#!/usr/bin/env bash
# Backs up Postgres (logical dump via pg_dump) and the documents bucket
# (direct copy of MinIO's bind-mounted data dir — real files, byte-exact)
# into infra/backups/<timestamp>/. Run from the repo root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$INFRA_DIR")"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$INFRA_DIR/backups/$TIMESTAMP"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-relatax-postgres-1}"
POSTGRES_USER="${POSTGRES_USER:-relatax}"
POSTGRES_DB="${POSTGRES_DB:-relatax}"
DOCUMENTS_BUCKET="${DOCUMENTS_BUCKET:-relatax-documents}"

mkdir -p "$BACKUP_DIR"

echo "==> Dumping Postgres ($POSTGRES_DB) from $POSTGRES_CONTAINER..."
docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists \
  > "$BACKUP_DIR/postgres.sql"
echo "    $(du -h "$BACKUP_DIR/postgres.sql" | cut -f1) -> $BACKUP_DIR/postgres.sql"

echo "==> Backing up documents bucket ($DOCUMENTS_BUCKET) via the S3 API..."
(cd "$REPO_ROOT/apps/api" && npx ts-node --transpile-only scripts/backup-documents.ts "$BACKUP_DIR/documents")

echo "==> Backup complete: $BACKUP_DIR"
