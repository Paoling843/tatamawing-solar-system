#!/bin/sh
# Container start: update the database, make sure the admin exists,
# cache config/routes/views, then serve.
set -e

# Without DB_CONNECTION Laravel falls back to a SQLite file inside the
# container, which is wiped on every restart. Refuse to start instead.
if [ -z "$DB_CONNECTION" ] || [ "$DB_CONNECTION" = "sqlite" ]; then
    echo "ERROR: set DB_CONNECTION=mysql and the DB_* variables in Render's Environment." >&2
    exit 1
fi

if [ -n "$MYSQL_ATTR_SSL_CA" ] && [ ! -r "$MYSQL_ATTR_SSL_CA" ]; then
    echo "ERROR: the database CA file $MYSQL_ATTR_SSL_CA is missing. Secret files found:" >&2
    ls -la /etc/secrets >&2 2>/dev/null || echo "(none — /etc/secrets does not exist)" >&2
    exit 1
fi

php artisan migrate --force
php artisan app:ensure-admin
php artisan optimize

# Cached files above were written as root; Apache runs as www-data
chown -R www-data:www-data storage bootstrap/cache

exec apache2-foreground
