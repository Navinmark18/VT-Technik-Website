# Event VT Backend

Simple Express backend for the Anfrage form.

## Setup

1. Create a Postgres database.
2. Apply migrations in ./migrations.
3. Copy .env.example to .env and update values.
4. Install dependencies and run the server.

## Run

- npm install
- npm run dev

## API

- POST /api/anfragen
  - Body: JSON from the Anfrage form
  - Response: { ok: true, id: number }

- GET /api/health
  - Response: { ok: true }
