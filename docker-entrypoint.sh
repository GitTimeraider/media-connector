#!/bin/sh
set -e

# Default PUID and PGID to 1000 if not set
PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Starting Media Connector with PUID=$PUID and PGID=$PGID"

# Create group if it doesn't exist
if ! getent group appuser >/dev/null 2>&1; then
    addgroup -g "$PGID" appuser
fi

# Create user if it doesn't exist
if ! getent passwd appuser >/dev/null 2>&1; then
    adduser -D -u "$PUID" -G appuser appuser
fi

# Update user/group IDs if they already exist
if [ "$(id -u appuser)" != "$PUID" ]; then
    usermod -u "$PUID" appuser
fi

if [ "$(id -g appuser)" != "$PGID" ]; then
    groupmod -g "$PGID" appuser
fi

# Ensure config directory has correct permissions
chown -R appuser:appuser /config /app

# Execute command as the specified user with dumb-init
exec dumb-init su-exec appuser "$@"
