.PHONY: up down shell install migrate seed test pint fresh logs

up:
	docker compose up -d

down:
	docker compose down

shell:
	docker compose exec app bash

install:
	docker compose exec app composer install

key:
	docker compose exec app php artisan key:generate

migrate:
	docker compose exec app php artisan migrate

seed:
	docker compose exec app php artisan migrate --seed

fresh:
	docker compose exec app php artisan migrate:fresh --seed

test:
	docker compose exec app php artisan test

pint:
	docker compose exec app ./vendor/bin/pint

filament-user:
	docker compose exec app php artisan make:filament-user

cache-clear:
	docker compose exec app php artisan optimize:clear

optimize:
	docker compose exec app php artisan optimize

queue-restart:
	docker compose exec app php artisan queue:restart

logs:
	docker compose logs -f app

analytics-refresh:
	docker compose exec app php artisan tinker --execute="dispatch(new App\Jobs\UpdateAnalyticsCacheJob());"
