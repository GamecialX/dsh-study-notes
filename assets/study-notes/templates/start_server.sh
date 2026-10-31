#!/bin/sh
# ============================================================
#  学习笔记 · 本地学习门户 一键启动（macOS / Linux）
#  用法：./start_server.sh [端口]      默认端口 8765
#  依赖：python3 / python / node 之一，零安装、零联网。
# ============================================================

set -u

cd "$(dirname "$0")" || exit 1

PORT="${1:-8765}"
case "$PORT" in
  ''|*[!0-9]*) echo "端口无效：$PORT" >&2; exit 1 ;;
esac

echo
echo "  ============================================================"
echo "    学习笔记 · 本地学习门户"
echo "    笔记根目录：$(pwd)"
echo "  ============================================================"
echo

# ---------- 打开浏览器（后台，尽力而为） ----------
open_url() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$1" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then
    open "$1" >/dev/null 2>&1 &
  elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "$1" >/dev/null 2>&1 &
  fi
}

# ---------- 1. 探测可用运行时 ----------
KIND=""
PY=""
if command -v python3 >/dev/null 2>&1 && python3 -c 'import sys' >/dev/null 2>&1; then
  KIND=python; PY=python3
elif command -v python >/dev/null 2>&1 && python -c 'import sys' >/dev/null 2>&1; then
  KIND=python; PY=python
elif command -v node >/dev/null 2>&1 && node -e 'process.exit(0)' >/dev/null 2>&1; then
  KIND=node
fi

if [ -z "$KIND" ]; then
  echo "  [错误] 没有找到可用的运行时（需要 python3 / python / node 中的任意一个）。" >&2
  echo
  echo "  请安装其中一个后重试：" >&2
  echo "    * Python 3   https://www.python.org/downloads/" >&2
  echo "    * Node.js    https://nodejs.org/" >&2
  echo
  exit 1
fi

# ---------- 2. 找一个没被占用的端口（默认 8765，至多 +5） ----------
port_free() {
  if [ "$KIND" = python ]; then
    "$PY" - "$1" <<'PYEOF' >/dev/null 2>&1
import socket, sys
s = socket.socket()
s.bind(("127.0.0.1", int(sys.argv[1])))
s.close()
PYEOF
  else
    node -e 'const net=require("net");const s=net.createServer();s.on("error",()=>process.exit(1));s.listen(Number(process.argv[1]),"127.0.0.1",()=>s.close(()=>process.exit(0)))' "$1" >/dev/null 2>&1
  fi
}

TRIES=0
while [ "$TRIES" -lt 5 ] && ! port_free "$PORT"; do
  PORT=$((PORT + 1))
  TRIES=$((TRIES + 1))
done

URL="http://localhost:$PORT/web/index.html"

echo "  运行时：$KIND"
echo "  端口　：$PORT"
echo "  地址　：$URL"
echo
echo "  按 Ctrl+C 停止服务器。"
echo

# ---------- 3. 就绪后打开浏览器，然后前台运行服务器 ----------
(
  sleep 1
  open_url "$URL"
) &

if [ "$KIND" = python ]; then
  exec "$PY" -m http.server "$PORT" --bind 127.0.0.1
else
  exec node web/serve.mjs "$PORT"
fi
