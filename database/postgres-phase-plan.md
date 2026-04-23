# PostgreSQL Migration Phases

This file tracks what each phase changes and how it affects the app runtime.

## Phase 1 (Completed)

### What was implemented
- Added a DB provider layer: `server/arena-db.mjs`.
- Moved server imports from `./mysql-arena-db.mjs` to `./arena-db.mjs`.
- Added `DB_CLIENT` env variable plumbing in `.env*` examples and active local env files.
- Health endpoint now reports DB mode:
  - `db.requested` (from `DB_CLIENT`)
  - `db.selected` (actual runtime adapter)

### Runtime effect
- Current app behavior is unchanged (still MySQL runtime).
- If `DB_CLIENT=postgres`, server fails fast with a clear message that Postgres runtime is not enabled yet.
- This avoids silent misconfiguration and prepares safe adapter swapping in next phase.

## Phase 2 (Next)

### Planned implementation
- Create `server/postgres-arena-db.mjs` (Postgres adapter) for core flows:
  - auth
  - courts/availability
  - reservations (create/list/cancel)
  - admin reservations list/update
- Keep the same exported function contract as MySQL module.

### Runtime effect
- `DB_CLIENT=postgres` starts to work for core user flows.
- Non-migrated endpoints still blocked or routed to MySQL until parity.

## Phase 2 (Current Status)

### Implemented now
- Added `server/postgres-arena-db.mjs`.
- Enabled runtime switch in `server/arena-db.mjs`:
  - `DB_CLIENT=mysql` -> MySQL adapter
  - `DB_CLIENT=postgres` -> Postgres adapter
- Implemented Postgres for:
  - auth read path (`findUserByEmail`, `sanitizeUser`)
  - signup primitives (`createUser`, `createArena`, `listArenas`)
  - courts (`listCourts`, `getCourtById`, `getCourtAvailability`)
  - reservation core (`lookupParticipantsForArena`, `listReservationsForUser`, `createReservation`, `cancelReservation`)
  - admin reservation management (`listAdminReservations`, `updateAdminReservationStatus`)
- Added Docker API env wiring for both DB families in `docker-compose.yml`.

### Not migrated yet in Phase 2
- Competitions, billing, coach relationships/sessions, AI analyses, performance, match/live-score domains, PDF ticket + verification functions, and admin overview remain explicit `not yet migrated` stubs on Postgres adapter.

## Phase 3

### Planned implementation
- Migrate remaining advanced domains:
  - competitions
  - billing/subscriptions
  - coach relationships/sessions
  - analytics/performance snapshots
  - ticket verification and PDF paths

### Runtime effect
- Full feature parity on Postgres.
- New writes/reads fully backed by Postgres.

## Phase 4 (Cutover)

### Planned implementation
- Set Postgres as default (`DB_CLIENT=postgres`).
- Keep MySQL as fallback during stabilization window.
- Remove MySQL runtime dependency after confidence window.

### Runtime effect
- App becomes fully Postgres-backed in production path.
