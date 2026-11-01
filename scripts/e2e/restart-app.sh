#!/usr/bin/env bash
# Recompila e reinicia o app em :3100 com as variáveis da stack local.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PIDFILE=/tmp/life-engine-e2e/app.pid
[ -f "$PIDFILE" ] && kill "$(cat "$PIDFILE")" 2>/dev/null || true
for p in $(ps -eo pid,args | grep "next-server" | grep -v grep | awk '{print $1}'); do kill "$p" 2>/dev/null || true; done
sleep 1
npx next build > /tmp/life-engine-e2e/build.log 2>&1 || { tail -30 /tmp/life-engine-e2e/build.log; exit 1; }
set -a; source /tmp/life-engine-e2e/env; set +a
nohup npx next start -p 3100 > /tmp/life-engine-e2e/app.log 2>&1 &
echo $! > "$PIDFILE"
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3100/login && break; sleep 1; done
echo "app em :3100"
