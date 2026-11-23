#!/usr/bin/env bash
# Encrypted backup of the Supabase database (see ops/backup/README.md).
#
#   BACKUP_DB_URL        Session pooler URL (port 5432), ideally of a
#                        read-only backup role. Secret: never in git.
#   BACKUP_GPG_RECIPIENT Public key (email or fingerprint) that can decrypt
#                        the backup; its private key stays offline.
#   BACKUP_DIR           Where to write (default ./backups).
#
# Writes <BACKUP_DIR>/appgastos-<UTC timestamp>.tar.gpg containing:
#   app.dump    public schema (tables, data) — pg_restore custom format
#   auth.dump   data of auth.users and auth.identities (the accounts)
# Nothing unencrypted is left on disk.
set -euo pipefail

: "${BACKUP_DB_URL:?Falta BACKUP_DB_URL}"
: "${BACKUP_GPG_RECIPIENT:?Falta BACKUP_GPG_RECIPIENT}"
out_dir="${BACKUP_DIR:-./backups}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
umask 077

# The app's schema and data (Prisma's tables, with RLS and constraints).
pg_dump "$BACKUP_DB_URL" --format=custom --schema=public \
  --no-owner --no-privileges --file="$work/app.dump"
# The accounts: restoring them keeps every user's id, email and password
# hash, so profiles and data still match after a restore.
pg_dump "$BACKUP_DB_URL" --format=custom --data-only \
  --table=auth.users --table=auth.identities --file="$work/auth.dump"

# Check the dumps can be read back before keeping them.
pg_restore --list "$work/app.dump" >/dev/null
pg_restore --list "$work/auth.dump" >/dev/null

mkdir -p "$out_dir"
tar -C "$work" -cf - app.dump auth.dump |
  gpg --batch --yes --trust-model always --encrypt \
    --recipient "$BACKUP_GPG_RECIPIENT" \
    --output "$out_dir/appgastos-$stamp.tar.gpg"

echo "Backup: $out_dir/appgastos-$stamp.tar.gpg ($(du -h "$out_dir/appgastos-$stamp.tar.gpg" | cut -f1))"
