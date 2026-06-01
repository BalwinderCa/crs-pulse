FROM php:8.4-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    freetype-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    libzip-dev \
    oniguruma-dev \
    openssl-dev \
    linux-headers \
    icu-dev \
    zip \
    unzip \
    supervisor

# Install PHP extensions
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-configure intl \
    && docker-php-ext-install \
        pdo \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        opcache \
        sockets \
        intl

# Install Redis extension
RUN apk add --no-cache $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# Install Composer
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

# Create app user
RUN addgroup -g 1000 appgroup \
    && adduser -u 1000 -G appgroup -s /bin/bash -D appuser

WORKDIR /var/www

COPY --chown=appuser:appgroup . .

RUN composer install --no-dev --optimize-autoloader --no-interaction

USER appuser

EXPOSE 9000

CMD ["php-fpm"]
