# ULTIMA Demo Website

This project now includes:
- a Vite + React frontend
- a demo API in `server/index.mjs`
- a MySQL-backed runtime data layer for users, courts, reservations, competitions, matches, performance, and logs

## Run locally

Create a `.env` file from `.env.example` and set your MySQL connection values.

If you want to switch quickly between local MySQL and Docker MySQL, use dedicated env files:

- `.env.localdb` (copy from `.env.localdb.example`) for local MySQL, usually `MYSQL_PORT=3306`
- `.env.dockerdb` (copy from `.env.dockerdb.example`) for Docker MySQL exposed on host, usually `MYSQL_PORT=3308`

In one terminal:

```bash
npm run server
```

In a second terminal:

```bash
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:3001`.

## Email flows (forgot password + verification)

The project now supports real email-link flows:

- `POST /api/auth/forgot-password` sends a reset link
- `GET /api/auth/verify-email?token=...` verifies a signup email link
- `POST /api/auth/resend-verification` resends verification email

### Docker (recommended for demo)

`docker-compose.yml` includes a local SMTP catcher (`mailpit`):

- SMTP server: `localhost:1025`
- Inbox UI: `http://localhost:8025`

Start stack:

```bash
docker compose up -d --build
```

Then:

1. Sign up a new player/coach account.
2. Open `http://localhost:8025`.
3. Click the verification link in the received email.
4. Use forgot-password and open the reset link from the same inbox.

To send to real email inboxes from Docker, set these env vars in `.env` and restart:

- `SMTP_HOST_DOCKER=smtp.gmail.com` (or your provider)
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=your_account@provider.com`
- `SMTP_PASS=your_app_password_or_smtp_password`
- `SMTP_FROM=your_account@provider.com`

Then:

```bash
docker compose down
docker compose up -d --build
```

### Local (without Docker)

If you run API directly (`npm run server`), use SMTP env values in `.env`:

- `SMTP_HOST=127.0.0.1`
- `SMTP_PORT=1025`
- `SMTP_SECURE=false`
- `SMTP_FROM=noreply@ultima.local`

Make sure Mailpit is running (Docker service `mailpit`) or point SMTP to any provider.

### Quick mode switch

Run backend against local MySQL:

```bash
npm run server:localdb
```

Run backend against Docker MySQL:

```bash
npm run server:dockerdb
```

Watch mode variants:

```bash
npm run server:localdb:dev
npm run server:dockerdb:dev
```

## Demo accounts

- Admin: `aziz@email.com` / `demo12345`
- Player: `ahmed@email.com` / `demo12345`
- Coach: `sami@email.com` / `demo12345`

## Demo backend features

- signup and login with JWT auth
- court listing and reservation creation
- competition listing and registration
- live score feed with simulated updates
- admin overview for users, courts, logs, and stats
- performance endpoint for the signed-in user
- SmartPlay AI analysis queue endpoint scaffold

## Notes

- The runtime backend now expects a MySQL database named by `MYSQL_DATABASE`.
- Import `database/mysql_demo_dump.sql` into MySQL before starting the backend.
- New signups are inserted directly into MySQL.
- `active/inactive` is now a real behavior: inactive users are blocked from logging in.
- The provided PDF could not be parsed directly in this environment because PDF extraction libraries were unavailable, so implementation was aligned to the current frontend and the visible requirements already present in the app.

## MySQL Workbench import

- MySQL dump: `database/mysql_demo_dump.sql`
- Regenerate it from the current demo JSON with:

```bash
node scripts/export-mysql-demo.mjs
```

- The dump creates a database named `ultima_demo` and fills it with users, terrains, reservations, competitions, match data, performance data, AI analyses, and activity logs.
