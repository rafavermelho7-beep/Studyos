#!/usr/bin/env bash
# Sobe um Postgres 16 descartável, aplica as migrations e roda os testes de RLS.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DATA="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
chown -R postgres:postgres "$DATA" 2>/dev/null || true
run() { if [ "$(id -u)" = "0" ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
run "$PGBIN/initdb -D $DATA -U postgres -A trust >/dev/null"
run "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp' -l $DATA/log.txt start >/dev/null"
trap 'run "$PGBIN/pg_ctl -D $DATA stop -m fast >/dev/null"; rm -rf "$DATA"' EXIT
PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database life_engine_test" postgres
$PSQL -f "$ROOT/supabase/test/auth-stub.sql" life_engine_test
for f in "$ROOT"/supabase/migrations/*.sql; do $PSQL -f "$f" life_engine_test; done
$PSQL -f "$ROOT/supabase/test/grants.sql" life_engine_test
DATABASE_URL_TEST="postgres://postgres@localhost:$PORT/life_engine_test?host=/tmp" node "$ROOT/scripts/test-db.mjs"
