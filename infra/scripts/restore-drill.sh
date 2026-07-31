#!/usr/bin/env bash
# Proves a backup is actually restorable: restores the Postgres dump into a
# scratch database and compares row counts against the live DB, then restores
# the documents backup into a scratch S3/MinIO bucket via the real storage API
# and reads a file back to confirm byte-for-byte integrity.
#
# Usage: infra/scripts/restore-drill.sh <timestamp>   (timestamp from backup.sh's output dir)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$INFRA_DIR")"

TIMESTAMP="${1:?Usage: restore-drill.sh <timestamp>}"
BACKUP_DIR="$INFRA_DIR/backups/$TIMESTAMP"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-relatax-postgres-1}"
POSTGRES_USER="${POSTGRES_USER:-relatax}"
POSTGRES_DB="${POSTGRES_DB:-relatax}"
SCRATCH_DB="${SCRATCH_DB:-relatax_restore_drill}"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "No backup found at $BACKUP_DIR" >&2
  exit 1
fi

echo "==> Restoring Postgres dump into scratch database '$SCRATCH_DB'..."
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS $SCRATCH_DB;" \
  -c "CREATE DATABASE $SCRATCH_DB OWNER $POSTGRES_USER;" > /dev/null
docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$SCRATCH_DB" < "$BACKUP_DIR/postgres.sql" > /dev/null

echo "==> Comparing row counts (original vs. restored)..."
FAIL=0
for TABLE in users businesses documents financial_reports tax_records notifications audit_logs; do
  ORIGINAL=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT count(*) FROM $TABLE")
  RESTORED=$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$SCRATCH_DB" -tAc "SELECT count(*) FROM $TABLE")
  if [ "$ORIGINAL" = "$RESTORED" ]; then
    echo "    OK    $TABLE: $ORIGINAL rows (matches)"
  else
    echo "    FAIL  $TABLE: original=$ORIGINAL restored=$RESTORED"
    FAIL=1
  fi
done

echo "==> Cleaning up scratch database..."
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE $SCRATCH_DB;" > /dev/null

echo "==> Verifying documents restore via the real storage API (S3/MinIO)..."
(cd "$REPO_ROOT/apps/api" && npx ts-node --transpile-only scripts/verify-s3-restore.ts "$BACKUP_DIR/documents")

if [ "$FAIL" = "1" ]; then
  echo "==> DRILL FAILED — see FAIL rows above"
  exit 1
fi
echo "==> DRILL PASSED — Postgres and documents both restored and verified"
