# MySQL -> PostgreSQL Migration (Current Project)

This keeps your existing Docker MySQL setup intact and adds PostgreSQL in parallel.

## 1) Start current stack + PostgreSQL

```powershell
docker compose up -d
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d postgres
```

You should then have:
- MySQL source: `ultima-db` on port `3308` (host) / `3306` (container)
- PostgreSQL target: `ultima-pg` on port `5432`

## 2) Run pgloader migration (containerized, no local install)

```powershell
docker run --rm --network ultima-demo_default dimitri/pgloader:latest `
  pgloader `
  "mysql://root:admin@db/ultima_demo" `
  "postgresql://postgres:admin@postgres/ultima_demo_pg"
```

Notes:
- `db` and `postgres` are service names on the Docker network.
- This migrates schema + data from the running MySQL DB (not from the SQL dump file).

## 3) Quick verification checks

### MySQL counts (source)
```powershell
docker exec -it ultima-db mysql -uroot -padmin -D ultima_demo -e "SELECT 'users' t, COUNT(*) c FROM users UNION ALL SELECT 'arenas', COUNT(*) FROM arenas UNION ALL SELECT 'courts', COUNT(*) FROM courts UNION ALL SELECT 'reservations', COUNT(*) FROM reservations UNION ALL SELECT 'reservation_participants', COUNT(*) FROM reservation_participants UNION ALL SELECT 'arena_memberships', COUNT(*) FROM arena_memberships;"
```

### PostgreSQL counts (target)
```powershell
docker exec -it ultima-pg psql -U postgres -d ultima_demo_pg -c "SELECT 'users' t, COUNT(*) c FROM users UNION ALL SELECT 'arenas', COUNT(*) FROM arenas UNION ALL SELECT 'courts', COUNT(*) FROM courts UNION ALL SELECT 'reservations', COUNT(*) FROM reservations UNION ALL SELECT 'reservation_participants', COUNT(*) FROM reservation_participants UNION ALL SELECT 'arena_memberships', COUNT(*) FROM arena_memberships;"
```

## 4) Spot-check high-value records

```powershell
docker exec -it ultima-pg psql -U postgres -d ultima_demo_pg -c "SELECT id, email, role, platform_role, status FROM users ORDER BY id LIMIT 20;"
docker exec -it ultima-pg psql -U postgres -d ultima_demo_pg -c "SELECT id, user_id, court_id, reservation_date, start_time, end_time, status FROM reservations ORDER BY id;"
```

## 5) Keep MySQL as primary until code switch is ready

At this point, PostgreSQL contains migrated data, but your app still uses MySQL code (`mysql2` and MySQL SQL dialect).
Do not switch production runtime yet until backend Postgres adapter is implemented and endpoint parity is tested.

