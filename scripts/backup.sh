#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Recipe Roost — PostgreSQL backup script
#
# Creates a timestamped pg_dump archive in ./backups/ and prunes dumps older
# than RETENTION_DAYS (default: 30).
#
# Usage:
#   ./scripts/backup.sh
#
# Environment variables (override via .env or shell export):
#   BACKUP_DB_URL       — Direct PostgreSQL connection string (bypasses PgBouncer)
#                         Defaults to DATABASE_URL_DIRECT, then DATABASE_URL.
#   BACKUP_DIR          — Directory to write dumps to (default: ./backups)
#   RETENTION_DAYS      — Days to keep backups (default: 30)
#
# Run on a schedule:
#   crontab -e
#   0 3 * * * cd /opt/recipe-roost && ./scripts/backup.sh >> /var/log/recipe-roost-backup.log 2>&1
# ---------------------------------------------------------------------------

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present (for local runs)
if [[ -f "$PROJECT_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  set -a; source "$PROJECT_DIR/.env"; set +a
fi

DB_URL="${BACKUP_DB_URL:-${DATABASE_URL_DIRECT:-${DATABASE_URL:-}}}"
if [[ -z "$DB_URL" ]]; then
  echo "ERROR: No database URL found. Set BACKUP_DB_URL, DATABASE_URL_DIRECT, or DATABASE_URL." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
FILENAME="recipe-roost-$TIMESTAMP.dump"

# ── Run backup ────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Starting backup → $BACKUP_DIR/$FILENAME"

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  "$DB_URL" \
  --file="$BACKUP_DIR/$FILENAME"

SIZE="$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)"
echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Backup complete ($SIZE): $FILENAME"

# ── Prune old backups ─────────────────────────────────────────────────────────
echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Pruning backups older than $RETENTION_DAYS days…"
find "$BACKUP_DIR" -name 'recipe-roost-*.dump' -mtime +"$RETENTION_DAYS" -delete -print \
  | sed 's/^/  deleted: /'

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Done."
