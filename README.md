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
