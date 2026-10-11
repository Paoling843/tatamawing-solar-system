#!/bin/sh
# Container start: update the database, make sure the admin exists,
# cache config/routes/views, then serve.
set -e

php artisan migrate --force
php artisan app:ensure-admin
php artisan optimize

# Cached files above were written as root; Apache runs as www-data
chown -R www-data:www-data storage bootstrap/cache

exec apache2-foreground
