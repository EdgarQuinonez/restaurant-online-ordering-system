# Requirements

# Dependencies

- primeng
- tailwind

# Usage

## Snippets

### Start development environment

docker compose --env-file ./backend/.env up --build --watch

This automatically syncs changes made in frontend project.

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

# Frontend Project

Is an Angular project which I aim to keep updated as long as I keep working with this same framework.

Now, Angular project includes the following folders

components: Shared Components, i.e. It is for any component that is used in more that one place at a time
pages: Those Screens that are accessed via routing, meaning any page must have a route.

For any component that will be unique to certain component or page it must be allocated within the same folder
