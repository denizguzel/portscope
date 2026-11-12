#!/usr/bin/env bash
# Starts VS Code in the browser on 127.0.0.1 with the given extensions and a demo workspace.
# usage: setup.sh <work-dir> <extension.vsix>... [-- <extra-workspace-settings.json>]
# env:   PORT (default 8765)
set -euo pipefail

WORK="$(realpath -m "$1")"; shift
VSIX=()
EXTRA=""
while [ $# -gt 0 ]; do
  if [ "$1" = "--" ]; then EXTRA="$(realpath "$2")"; break; fi
  VSIX+=("$(realpath "$1")"); shift
done
PORT="${PORT:-8765}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The web client must match the commit of the VS Code server in WSL. The remote server in
# ~/.vscode-server has no web UI; the "server-linux-x64-web" package does. Cache it (about 700 MB).
HASH="$(find "$HOME/.vscode-server/bin" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %f\n' | sort -nr | head -1 | cut -d' ' -f2)"
WEB="$HOME/.cache/vscode-web/$HASH"
if [ ! -f "$WEB/out/vs/code/browser/workbench/workbench.html" ]; then
  echo "Downloading VS Code web server $HASH ..."
  mkdir -p "$WEB"
  curl -fsSL "https://update.code.visualstudio.com/commit:$HASH/server-linux-x64-web/stable" | tar xz -C "$WEB" --strip-components=1
fi

mkdir -p "$WORK/ext" "$WORK/data" "$WORK/server-data" "$WORK/acme-shop/apps/web" "$WORK/acme-shop/apps/api" "$WORK/acme-shop/apps/docs" "$WORK/acme-shop/.vscode"
for vsix in "${VSIX[@]}"; do
  # Always an absolute path: a relative one is resolved against VS Code's own directory.
  "$WEB/bin/code-server" --install-extension "$vsix" --force --extensions-dir "$WORK/ext" --user-data-dir "$WORK/data" --accept-server-license-terms 2>&1 | tail -1
done

cat > "$WORK/acme-shop/package.json" <<'JSON'
{
  "name": "acme-shop",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "oxlint",
    "format": "oxfmt --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "knip": "knip"
  }
}
JSON
touch "$WORK/acme-shop/bun.lock"

# Workspace settings: dark theme, no welcome page, no chat panel. Extension settings are merged in.
python3 - "$WORK/acme-shop/.vscode/settings.json" "$EXTRA" <<'PY'
import json, sys
settings = {
    "workbench.colorTheme": "Default Dark Modern",
    "workbench.startupEditor": "none",
    "chat.disableAIFeatures": True,
    "window.commandCenter": False,
    "workbench.layoutControl.enabled": False,
}
if len(sys.argv) > 2 and sys.argv[2]:
    settings.update(json.load(open(sys.argv[2])))
json.dump(settings, open(sys.argv[1], "w"), indent=2)
PY

# setsid gives the server its own process group, so stop.sh can kill all of it.
setsid nohup "$WEB/bin/code-server" --host 127.0.0.1 --port "$PORT" --without-connection-token \
  --accept-server-license-terms --extensions-dir "$WORK/ext" --user-data-dir "$WORK/data" \
  --server-data-dir "$WORK/server-data" > "$WORK/server.log" 2>&1 &
echo $! > "$WORK/server.pid"

for _ in $(seq 1 30); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/")" = "200" ]; then
    echo "READY http://127.0.0.1:$PORT/?folder=$WORK/acme-shop"
    exit 0
  fi
  sleep 1
done
echo "Server did not start, see $WORK/server.log" >&2
exit 1
