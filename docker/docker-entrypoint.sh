#!/bin/sh
set -e

# Fix permissions on /app/data if it exists and is owned by root
# This handles the case where Docker Compose creates the directory as root
if [ -d "/app/data" ] && [ "$(stat -c '%u' /app/data)" -eq 0 ]; then
    echo "[Entrypoint] Fixing permissions on /app/data directory..."
    # Run as root temporarily to fix permissions
    if [ "$(id -u)" -ne 0 ]; then
        echo "[Entrypoint] Warning: Cannot fix permissions - not running as root"
    else
        chown -R node:node /app/data
        echo "[Entrypoint] Permissions fixed"
    fi
fi

# Switch to node user and execute the command
if [ "$(id -u)" -eq 0 ]; then
    exec su node -c "exec $*"
else
    exec "$@"
fi
