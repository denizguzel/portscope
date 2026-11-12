#!/usr/bin/env bash
# Starts fake dev servers inside the demo workspace, so PortScope finds them.
# usage: servers.sh <work-dir> healthy|mixed|none
#   healthy: :5173 vite (200) and :3100 next (200)
#   mixed:   :5173 vite (200), :3000 nest (500) and :4321 astro (silent)
set -euo pipefail

WORK="$(realpath -m "$1")"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$WORK/stubs"

# Stop the previous set first.
if [ -f "$WORK/stubs.pids" ]; then
  while read -r pid; do kill "$pid" 2>/dev/null || true; done < "$WORK/stubs.pids"
fi
: > "$WORK/stubs.pids"

# The file name decides the framework label PortScope shows (vite.js -> Vite).
start() { # <folder> <tool> <port> <mode>
  cp "$HERE/stub.js" "$WORK/stubs/$2.js"
  # cd first and background only node itself, so $! is the pid of node.
  cd "$WORK/acme-shop/$1"
  STUB_PORT="$3" STUB_MODE="$4" nohup node "$WORK/stubs/$2.js" --port "$3" > /dev/null 2>&1 &
  echo $! >> "$WORK/stubs.pids"
}

case "$2" in
  healthy) start apps/web vite 5173 ok; start apps/api next 3100 ok ;;
  mixed) start apps/web vite 5173 ok; start apps/api nest 3000 error; start apps/docs astro 4321 silent ;;
  none) ;;
  *) echo "unknown set: $2" >&2; exit 1 ;;
esac
echo "started: $(wc -l < "$WORK/stubs.pids") fake servers ($2)"
