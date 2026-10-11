# Production image for Render (or any Docker host).
# Render sets PORT; Apache listens on it.
FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo_mysql gd zip bcmath opcache \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV PORT=10000
# Send Laravel's errors to the container output so they show in Render's Logs
ENV LOG_CHANNEL=stderr
RUN a2enmod rewrite \
    && sed -i 's/^Listen 80$/Listen ${PORT}/' /etc/apache2/ports.conf
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini

WORKDIR /var/www/html

# Dependencies first so they're cached between deploys
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .
# Laravel's writable folders aren't all in git, so create them before
# composer's package:discover step needs bootstrap/cache
RUN mkdir -p storage/app/private storage/app/public storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && composer dump-autoload --optimize --no-dev \
    && chown -R www-data:www-data storage bootstrap/cache

RUN chmod +x docker/start.sh
CMD ["docker/start.sh"]
