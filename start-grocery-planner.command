#!/bin/bash
cd "$(dirname "$0")"
PORT=8420

if ! lsof -i :$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  nohup python3 -m http.server $PORT > /tmp/grocery-planner-server.log 2>&1 &
  disown
  sleep 1
fi

open "http://localhost:$PORT"
sleep 1
osascript -e 'tell application "Terminal" to close (every window whose name contains "start-grocery-planner")' >/dev/null 2>&1
