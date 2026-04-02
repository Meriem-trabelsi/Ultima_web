# ULTIMA Demo Website

This project now includes:
- a Vite + React frontend
- a demo API in `server/index.mjs`
- a file-backed demo database in `server/data/ultima-demo.json`

## Run locally

In one terminal:

```bash
npm run server
```

In a second terminal:

```bash
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:3001`.

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

- The persistence layer is file-backed for demo reliability in this environment.
- Seeded data is created automatically on first server start.
- The provided PDF could not be parsed directly in this environment because PDF extraction libraries were unavailable, so implementation was aligned to the current frontend and the visible requirements already present in the app.
