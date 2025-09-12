#!/bin/sh

# Wait for the database to be ready
while ! nc -z db 5432; do
  sleep 1
done

# Run migrations
python manage.py collectstatic --noinput
# makemigrations is commited so it doesn't have to run here.
python manage.py migrate --noinput || exit 1
