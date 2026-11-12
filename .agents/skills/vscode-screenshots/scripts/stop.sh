#!/usr/bin/env bash
# Stops the web server and the fake dev servers. Never use `pkill -f <pattern>` for this:
# the pattern also matches the shell that runs the command.
set -uo pipefail
WORK="$(realpath -m "$1")"

if [ -f "$WORK/stubs.pids" ]; then
  while read -r pid; do kill "$pid" 2>/dev/null; done < "$WORK/stubs.pids"
fi
if [ -f "$WORK/server.pid" ]; then
  pid="$(cat "$WORK/server.pid")"
  kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null
fi
sleep 2
echo "stopped"
