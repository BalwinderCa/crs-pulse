#!/bin/bash
# CRS Pulse dev server startup
# Starts Laravel on 127.0.0.1:8000 + nginx proxy on 0.0.0.0:8080

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PHP=/usr/local/opt/php@8.4/bin/php

echo "── Stopping old processes ──"
pkill -f "artisan serve" 2>/dev/null || true
nginx -s stop 2>/dev/null || true
sleep 1

echo "── Starting Laravel (127.0.0.1:8000) ──"
cd "$SCRIPT_DIR"
$PHP artisan serve --host=127.0.0.1 --port=8000 > /tmp/laravel.log 2>&1 &
echo "Laravel PID: $!"

echo "── Starting nginx proxy (0.0.0.0:8080 → :8000) ──"
mkdir -p /tmp/nginx-run
nginx -e /tmp/nginx-run/error.log -c "$SCRIPT_DIR/nginx-dev.conf"
echo "nginx started"

echo ""
echo "✓ API available at:"
echo "  Simulator : http://localhost:8080/api/v1"
echo "  Device    : http://$(ipconfig getifaddr en0):8080/api/v1"
echo ""
echo "Logs: tail -f /tmp/laravel.log /tmp/nginx-run/access.log"
