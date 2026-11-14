#!/usr/bin/env bash
# Fill the LOCAL Supabase (Docker) with a copy of the live data, create a local super admin, and write
# .env.localdb.local so `npm run dev:local` signs in automatically. Nothing is ever written to the live database:
# the live side is only read (pg_dump through `supabase db dump`).
#
# Needs: Docker running, `npx supabase start` done, and this project linked (`supabase link`).
# Run again any time to refresh the copy with the latest live data (local changes are thrown away).
set -euo pipefail
cd "$(dirname "$0")/.."

DB_CONTAINER="supabase_db_blossoms_nov"
API="http://127.0.0.1:54321"
DEV_EMAIL="dev-admin@local.test"
ENV_FILE=".env.localdb.local"
TMPDIR="$(mktemp -d)"
DUMP="$TMPDIR/live_public_data.sql"
trap 'rm -rf "$TMPDIR"' EXIT   # the dump holds student data; never keep it

docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || { echo "Local Supabase is not running. Run: npx supabase start"; exit 1; }

echo "1/4 Reading live data (read-only)…"
npx supabase@2 db dump --linked --data-only --schema public -f "$DUMP" >/dev/null

echo "2/4 Loading it into the local database…"
{
  echo "set client_min_messages = warning; set session_replication_role = replica;"   # load in any order; local copy only
  echo "do \$\$ declare t text; begin
          for t in select tablename from pg_tables where schemaname = 'public' loop
            execute format('truncate table public.%I cascade', t);
          end loop; end \$\$;"
  cat "$DUMP"
} | docker exec -i "$DB_CONTAINER" psql -q -U postgres -d postgres -v ON_ERROR_STOP=1 >/dev/null

echo "3/4 Creating the local super admin…"
KEYS="$(npx supabase@2 status -o env 2>/dev/null)"
ANON_KEY="$(printf '%s\n' "$KEYS" | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')"
SERVICE_KEY="$(printf '%s\n' "$KEYS" | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p')"
[ -n "$ANON_KEY" ] && [ -n "$SERVICE_KEY" ] || { echo "Could not read the local keys from 'supabase status'."; exit 1; }

# Keep the same local password between runs.
DEV_PASSWORD="$(sed -n 's/^VITE_DEV_ADMIN_PASSWORD=//p' "$ENV_FILE" 2>/dev/null || true)"
[ -n "$DEV_PASSWORD" ] || DEV_PASSWORD="local-$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')"

docker exec -i "$DB_CONTAINER" psql -q -U postgres -d postgres -c "delete from auth.users where email = '$DEV_EMAIL';" >/dev/null
curl -sf -X POST "$API/auth/v1/admin/users" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEV_EMAIL\",\"password\":\"$DEV_PASSWORD\",\"email_confirm\":true}" >/dev/null
docker exec -i "$DB_CONTAINER" psql -q -U postgres -d postgres -v ON_ERROR_STOP=1 >/dev/null <<SQL
delete from public.admin_profiles where email = '$DEV_EMAIL';
insert into public.admin_profiles (auth_user_id, full_name, email, role, is_active)
select id, 'Local Dev Admin', email, 'super_admin', true from auth.users where email = '$DEV_EMAIL';
SQL

echo "4/4 Writing $ENV_FILE…"
cat > "$ENV_FILE" <<ENV
# Local copy only (npm run dev:local). Written by scripts/local-db-sync.sh. Do not commit.
VITE_SUPABASE_URL=$API
VITE_SUPABASE_ANON_KEY=$ANON_KEY
VITE_DEV_ADMIN_EMAIL=$DEV_EMAIL
VITE_DEV_ADMIN_PASSWORD=$DEV_PASSWORD
ENV

echo "Done. Run: npm run dev:local  → http://127.0.0.1:3001 (signed in as the local super admin)"
