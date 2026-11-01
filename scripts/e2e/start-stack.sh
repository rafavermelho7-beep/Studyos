#!/usr/bin/env bash
# Stack local de testes E2E: Postgres 16 + GoTrue + PostgREST + gateway + dublê da Anthropic.
# Uso: bash scripts/e2e/start-stack.sh   (requer Docker e Postgres 16 locais)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
STATE="${E2E_STATE:-/tmp/life-engine-e2e}"
SECRET="local-e2e-jwt-secret-with-at-least-32-chars"
PORT=54322
mkdir -p "$STATE"
run() { if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }

if [ ! -f "$STATE/pg/PG_VERSION" ]; then
  mkdir -p "$STATE/pg" && chown -R postgres:postgres "$STATE" 2>/dev/null || true
  run "$PGBIN/initdb -D $STATE/pg -U postgres -A trust >/dev/null"
fi
run "$PGBIN/pg_ctl -D $STATE/pg -o '-p $PORT -k /tmp -c listen_addresses=127.0.0.1' -l $STATE/pg.log start" >/dev/null || true
sleep 1
PSQL="psql -h 127.0.0.1 -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
if ! $PSQL -tAc "select 1 from pg_roles where rolname='authenticator'" | grep -q 1; then
  $PSQL -f "$HERE/roles.sql"
fi

docker rm -f le-gotrue le-postgrest >/dev/null 2>&1 || true
docker run -d --name le-gotrue --network host \
  -e GOTRUE_DB_DRIVER=postgres \
  -e DATABASE_URL="postgres://supabase_auth_admin:localpw@127.0.0.1:$PORT/postgres?search_path=auth" \
  -e GOTRUE_JWT_SECRET="$SECRET" -e GOTRUE_JWT_EXP=3600 -e GOTRUE_JWT_AUD=authenticated \
  -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
  -e GOTRUE_SITE_URL=http://localhost:3000 -e API_EXTERNAL_URL=http://localhost:54321/auth/v1 \
  -e GOTRUE_API_HOST=127.0.0.1 -e PORT=9999 -e GOTRUE_DISABLE_SIGNUP=true \
  -e GOTRUE_MAILER_AUTOCONFIRM=true -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true \
  supabase/gotrue:v2.177.0 >/dev/null
for i in $(seq 1 30); do curl -sf http://127.0.0.1:9999/health >/dev/null && break; sleep 1; done

if ! $PSQL -tAc "select 1 from pg_tables where schemaname='public' and tablename='memories'" | grep -q 1; then
  $PSQL -f "$HERE/post-auth.sql"
  for f in "$ROOT"/supabase/migrations/*.sql; do $PSQL -f "$f"; done
  $PSQL -f "$ROOT/supabase/test/grants.sql"
  $PSQL -c "grant usage on schema public to service_role; grant all on all tables in schema public to service_role;"
fi

docker run -d --name le-postgrest --network host \
  -e PGRST_DB_URI="postgres://authenticator:localpw@127.0.0.1:$PORT/postgres" \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="$SECRET" \
  -e PGRST_SERVER_PORT=3000 -e PGRST_SERVER_HOST=127.0.0.1 \
  postgrest/postgrest:v12.2.12 >/dev/null

pkill -f "e2e/gateway.mjs" 2>/dev/null || true
pkill -f "e2e/mock-anthropic.mjs" 2>/dev/null || true
nohup node "$HERE/gateway.mjs" > "$STATE/gateway.log" 2>&1 &
nohup node "$HERE/mock-anthropic.mjs" > "$STATE/mock.log" 2>&1 &
sleep 1

ANON=$(node "$HERE/jwt.mjs" "$SECRET" anon)
SERVICE=$(node "$HERE/jwt.mjs" "$SECRET" service_role)
cat > "$STATE/env" <<ENV
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON
SERVICE_KEY=$SERVICE
OWNER_EMAIL=owner@life.test
ANTHROPIC_API_KEY=mock-key
ANTHROPIC_BASE_URL=http://127.0.0.1:4010
ENV
# Usuários de teste: o dono e um intruso (conta válida no Supabase, mas não autorizada).
for u in owner@life.test intruso@life.test; do
  curl -s -o /dev/null -X POST http://localhost:54321/auth/v1/admin/users \
    -H "Authorization: Bearer $SERVICE" -H "apikey: $SERVICE" -H "Content-Type: application/json" \
    -d "{\"email\":\"$u\",\"password\":\"senha-forte-123\",\"email_confirm\":true}"
done
echo "stack pronta — variáveis em $STATE/env"
