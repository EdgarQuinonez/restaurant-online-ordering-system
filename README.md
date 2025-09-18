# Requirements

# Dependencies

- primeng
- tailwind

# Usage

## Snippets

### Start development environment

docker compose --env-file ./backend/.env up --build --watch

This automatically syncs changes made in frontend project.

### Start shell in backend-dev container

docker compose --env-file ./backend/.env exec -it backend-dev sh

## Environment

Create .env file in ./backend/ directory with the following variables

DJANGO_SECRET_KEY=your_secret_key
DEBUG=True
DJANGO_LOGLEVEL=info
DJANGO_ALLOWED_HOSTS=localhost
DATABASE_ENGINE=postgresql_psycopg2
DATABASE_NAME=dockerdjango
DATABASE_USERNAME=dbuser
DATABASE_PASSWORD=dbpassword
DATABASE_HOST=db
DATABASE_PORT=5432

# Backend Project

Hooked up with DRF, CORS and POSTGRES

## Running migrations

1. cd into backend
   python manage.py makemigrations
2. Rebuild the containers
   docker compose --env-file ./backend/.env exec -it backend-dev sh
3. Enter sh in backend-dev container
   NOTE: Currently, I still have that error with entrypoint.sh file which would automate this on rebuild
   python manage.py migrate

# Frontend Project

Is an Angular project which I aim to keep updated as long as I keep working with this same framework.

Now, Angular project includes the following folders

## Project Directory Structure

core: Main components which the app is build around
shared: parent folder aims to store anything that is used in multiple places
shared/components: Shared Components, i.e. It is for any component that is used in more that one place at a time
shared/services:
shared/types.ts
shared/services/example.service.interface.ts
pages: Those Screens that are accessed via routing, meaning any page must have a route.

For any component that will be unique to certain component or page it must be allocated within the same folder

## Project Naming Conventions

Pages take the name without any appendix
