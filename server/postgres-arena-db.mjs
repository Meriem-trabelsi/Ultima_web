import { Pool } from "pg";
import { createHmac, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const pool = new Pool({
  host: process.env.PG_HOST ?? "127.0.0.1",
  port: Number(process.env.PG_PORT ?? 5432),
  user: process.env.PG_USER ?? "postgres",
  password: process.env.PG_PASSWORD ?? "",
  database: process.env.PG_DATABASE ?? "ultima_demo",
});

const REQUIRED_TABLES = ["users", "arenas", "arena_memberships", "courts", "reservations", "reservation_participants", "activity_logs"];
const RESERVATION_DURATION_MINUTES = Number(process.env.RESERVATION_DURATION_MINUTES ?? 90);
const RESERVATION_STEP_MINUTES = Number(process.env.RESERVATION_STEP_MINUTES ?? RESERVATION_DURATION_MINUTES);
const BILLING_SECRET = process.env.BILLING_SIGNATURE_SECRET ?? process.env.JWT_SECRET ?? "ultima-billing-secret";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_CANDIDATE_PATHS = [path.resolve(__dirname, "../src/assets/ultima_logo.jpg"), path.resolve(__dirname, "../public/ultima_logo.jpg")];

const toIso = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
};

const parseJsonColumn = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return value;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
};

const resolveRole = (user) => (user?.platform_role === "super_admin" ? "super_admin" : user?.membership_role ?? user?.role ?? "player");
const resolveStatus = (user) => (user?.platform_role === "super_admin" ? user?.status ?? "inactive" : user?.membership_status ?? user?.status ?? "inactive");
const isAdminLike = (actor) => actor?.effective_role === "admin" || actor?.effective_role === "super_admin";
const isCoachLike = (actor) => ["coach", "admin", "super_admin"].includes(actor?.effective_role);

const sanitizeCourt = (court) => ({ ...court, created_at: toIso(court.created_at) });
const sanitizeLog = (log) => ({ ...log, created_at: toIso(log.created_at) });
const sanitizeCompetition = (competition) => ({ ...competition, created_at: toIso(competition.created_at) });
const sanitizeReservation = (reservation) => ({
  ...reservation,
  created_at: toIso(reservation.created_at),
  reservation_date: String(reservation.reservation_date).slice(0, 10),
  start_time: String(reservation.start_time).slice(0, 8),
  end_time: String(reservation.end_time).slice(0, 8),
  participants: parseJsonColumn(reservation.participants),
});
const sanitizeMembershipUser = (row) => ({
  id: row.id,
  first_name: row.first_name,
  last_name: row.last_name,
  email: row.email,
  role: row.platform_role === "super_admin" ? "super_admin" : row.membership_role,
  status: row.membership_status ?? row.status,
  account_status: row.status,
  platform_role: row.platform_role,
  arena_id: row.arena_id,
  arena_name: row.arena_name,
  created_at: toIso(row.created_at),
  cin_number: row.cin_number ?? null,
});

const normalizeUser = (row) => ({
  id: Number(row.id),
  first_name: row.first_name,
  last_name: row.last_name,
  email: row.email,
  password_hash: row.password_hash,
  role: row.role,
  status: row.status,
  created_at: toIso(row.created_at),
  platform_role: row.platform_role ?? "member",
  membership_id: row.membership_id ?? null,
  membership_role: row.membership_role ?? null,
  membership_status: row.membership_status ?? null,
  arena_id: row.arena_id ?? null,
  arena_name: row.arena_name ?? null,
  arena_location: row.arena_location ?? null,
  cin_number: row.cin_number ?? null,
  email_verified_at: toIso(row.email_verified_at),
  effective_role: resolveRole(row),
  effective_status: resolveStatus(row),
});

const timeToMinutes = (value) => {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(":").map(Number);
  if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) return null;
  return parts[0] * 60 + parts[1];
};
const minutesToTime = (value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const generateSixDigitCode = () => {
  const buffer = randomBytes(4);
  const numeric = buffer.readUInt32BE(0) % 1000000;
  return String(numeric).padStart(6, "0");
};

async function queryUsersBy(whereClause, params = [], client = pool) {
  const { rows } = await client.query(
    `SELECT
       users.*,
       arena_memberships.id AS membership_id,
       arena_memberships.role AS membership_role,
       arena_memberships.status AS membership_status,
       arenas.id AS arena_id,
       arenas.name AS arena_name,
       arenas.location AS arena_location
     FROM users
     LEFT JOIN arena_memberships ON arena_memberships.user_id = users.id
     LEFT JOIN arenas ON arenas.id = arena_memberships.arena_id
     ${whereClause}`,
    params
  );
  return rows.map(normalizeUser);
}

async function findUserById(id, client = pool) {
  const users = await queryUsersBy("WHERE users.id = $1 ORDER BY arena_memberships.id ASC LIMIT 1", [id], client);
  return users[0] ?? null;
}

async function requireActiveActor(userId, client = pool) {
  const actor = await findUserById(Number(userId), client);
  if (!actor) throw new Error("User not found");
  if (actor.effective_status !== "active") throw new Error("This account is inactive");
  return actor;
}

const normalizeRelationshipPermissions = (permissions = {}) => ({
  canViewPerformance: permissions.canViewPerformance !== false,
  canViewReservations: permissions.canViewReservations !== false,
  canScheduleSessions: permissions.canScheduleSessions !== false,
  canViewNotes: permissions.canViewNotes === true,
});

const normalizeRelationship = (row) => {
  const startDate = row.start_date ? String(row.start_date).split("T")[0] : null;
  const endDate = row.end_date ? String(row.end_date).split("T")[0] : null;
  return {
    id: row.id,
    arenaId: row.arena_id,
    coachUserId: row.coach_user_id,
    coachName: row.coach_name ?? null,
    playerUserId: row.player_user_id,
    playerName: row.player_name ?? null,
    status: row.status,
    requestedByUserId: row.requested_by_user_id,
    respondedByUserId: row.responded_by_user_id ?? null,
    permissions: {
      canViewPerformance: Boolean(row.can_view_performance),
      canViewReservations: Boolean(row.can_view_reservations),
      canScheduleSessions: Boolean(row.can_schedule_sessions),
      canViewNotes: Boolean(row.can_view_notes),
    },
    consentVersion: Number(row.consent_version ?? 1),
    consentGrantedAt: toIso(row.consent_granted_at),
    startDate,
    endDate,
    notes: row.notes ?? "",
    respondedAt: toIso(row.responded_at),
    lastReminderAt: toIso(row.last_reminder_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
};

async function getActiveCoachRelationshipForStudent(coachUserId, studentId, client = pool) {
  const { rows } = await client.query(
    `SELECT *
     FROM coach_player_relationships
     WHERE coach_user_id = $1
       AND player_user_id = $2
       AND status = 'active'
       AND start_date <= CURRENT_DATE
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)
     ORDER BY updated_at DESC
     LIMIT 1`,
    [coachUserId, studentId]
  );
  return rows[0] ?? null;
}

async function getCoachActor(userId) {
  const actor = await requireActiveActor(userId);
  if (!isCoachLike(actor)) throw new Error("Coach access required");
  if (!actor.arena_id) throw new Error("Coach must belong to an arena");
  return actor;
}

async function getCourtByIdInternal(id, client = pool) {
  const { rows } = await client.query(
    `SELECT courts.*, arenas.name AS arena_name, arenas.location AS arena_location
     FROM courts
     JOIN arenas ON arenas.id = courts.arena_id
     WHERE courts.id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] ? sanitizeCourt(rows[0]) : null;
}

async function addActivityLog(client, { arenaId = null, actorUserId = null, actorName, action, detail }) {
  await client.query(
    `INSERT INTO activity_logs (arena_id, action, actor_user_id, actor_name, detail, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [arenaId, action, actorUserId, actorName, detail]
  );
}

async function hasReservationConflict(courtId, reservationDate, startTime, endTime, client) {
  const { rows } = await client.query(
    `SELECT id FROM reservations
     WHERE court_id = $1
       AND reservation_date = $2::date
       AND status = 'confirmed'
       AND NOT (end_time <= $3::time OR start_time >= $4::time)
     LIMIT 1`,
    [courtId, reservationDate, startTime, endTime]
  );
  return rows.length > 0;
}

export async function initializeDatabase() {
  await pool.query("SELECT 1");
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES]
  );
  if (rows[0].count < REQUIRED_TABLES.length) throw new Error("Required PostgreSQL tables are missing.");

  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS cin_number VARCHAR(32)");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ NULL");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_users_cin_number ON users (cin_number) WHERE cin_number IS NOT NULL");
  await pool.query(
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      token VARCHAR(128) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
  await pool.query("CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at)");
  await pool.query(
    `CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      token VARCHAR(128) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
  await pool.query("CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens(user_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires ON email_verification_tokens(expires_at)");
  await pool.query(
    `UPDATE users
     SET cin_number = LPAD(id::text, 8, '0')
     WHERE role IN ('player', 'coach')
       AND (cin_number IS NULL OR cin_number = '')`
  );
  await pool.query(
    `UPDATE users
     SET email_verified_at = NOW()
     WHERE email_verified_at IS NULL
       AND created_at < TIMESTAMPTZ '2026-04-12 00:00:00+00'`
  );
}

export async function closePool() {
  await pool.end();
}

export async function listArenas() {
  const { rows } = await pool.query("SELECT id, name, slug, location, created_at FROM arenas ORDER BY name ASC");
  return rows.map((row) => ({ ...row, created_at: toIso(row.created_at) }));
}

export async function createArena({ name, location }) {
  const baseSlug = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "arena";
  let slug = baseSlug;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO arenas (name, slug, location, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, name, slug, location, created_at`,
        [name, slug, location]
      );
      return { ...rows[0], created_at: toIso(rows[0].created_at) };
    } catch (error) {
      if (error?.code !== "23505") throw error;
      slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
    }
  }
  throw new Error("Unable to create arena slug");
}

export async function findUserByEmail(email) {
  const users = await queryUsersBy("WHERE users.email = $1 ORDER BY arena_memberships.id ASC LIMIT 1", [email]);
  return users[0] ?? null;
}

export async function createUser({
  firstName,
  lastName,
  email,
  passwordHash,
  arenaId,
  membershipRole,
  cinNumber = null,
  emailVerifiedAt = new Date().toISOString(),
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insert = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, status, platform_role, cin_number, email_verified_at, created_at)
       VALUES ($1, $2, $3, $4, $5, 'active', 'member', $6, $7, NOW())
       RETURNING id`,
      [firstName, lastName, email, passwordHash, membershipRole, cinNumber, emailVerifiedAt]
    );
    await client.query(
      `INSERT INTO arena_memberships (arena_id, user_id, role, status, created_at)
       VALUES ($1, $2, $3, 'active', NOW())`,
      [arenaId, Number(insert.rows[0].id), membershipRole]
    );
    await client.query("COMMIT");
    return findUserByEmail(email);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listCourts(actor = null) {
  const params = [];
  let where = "";
  if (actor?.effective_role !== "super_admin" && actor?.arena_id) {
    params.push(actor.arena_id);
    where = `WHERE courts.arena_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT courts.*, arenas.name AS arena_name, arenas.location AS arena_location
     FROM courts
     JOIN arenas ON arenas.id = courts.arena_id
     ${where}
     ORDER BY courts.id ASC`,
    params
  );
  return rows.map(sanitizeCourt);
}

export async function getCourtById(id) {
  return getCourtByIdInternal(id);
}

export async function getCourtAvailability(courtId, reservationDate) {
  const court = await getCourtById(courtId);
  if (!court) return null;
  const openingMinutes = timeToMinutes(String(court.opening_time).slice(0, 5));
  const closingMinutes = timeToMinutes(String(court.closing_time).slice(0, 5));
  const duration = Number.isFinite(RESERVATION_DURATION_MINUTES) && RESERVATION_DURATION_MINUTES > 0 ? RESERVATION_DURATION_MINUTES : 90;
  const step = Number.isFinite(RESERVATION_STEP_MINUTES) && RESERVATION_STEP_MINUTES > 0 ? RESERVATION_STEP_MINUTES : duration;
  const { rows: reservedRows } = await pool.query(
    `SELECT start_time, end_time
     FROM reservations
     WHERE court_id = $1 AND reservation_date = $2::date AND status = 'confirmed'
     ORDER BY start_time ASC`,
    [courtId, reservationDate]
  );
  const reserved = reservedRows.map((row) => ({ startTime: String(row.start_time).slice(0, 5), endTime: String(row.end_time).slice(0, 5) }));
  const slots = [];
  for (let cursor = openingMinutes; cursor + duration <= closingMinutes; cursor += step) {
    const slotStart = minutesToTime(cursor);
    const slotEnd = minutesToTime(cursor + duration);
    const isReserved = reserved.some((range) => !(range.endTime <= slotStart || range.startTime >= slotEnd));
    slots.push({ startTime: slotStart, endTime: slotEnd, available: !isReserved });
  }
  return { courtId: court.id, reservationDate, openingTime: String(court.opening_time).slice(0, 5), closingTime: String(court.closing_time).slice(0, 5), slots, reserved };
}

export async function lookupParticipantsForArena(arenaId, emails) {
  if (!arenaId || !emails.length) return [];
  const uniqueEmails = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (!uniqueEmails.length) return [];
  const placeholders = uniqueEmails.map((_, index) => `$${index + 2}`).join(", ");
  const { rows } = await pool.query(
    `SELECT users.id, users.first_name, users.last_name, users.email, users.platform_role,
            users.status AS account_status, arena_memberships.role AS membership_role,
            arena_memberships.status AS membership_status, arenas.id AS arena_id, arenas.name AS arena_name
     FROM users
     JOIN arena_memberships ON arena_memberships.user_id = users.id
     JOIN arenas ON arenas.id = arena_memberships.arena_id
     WHERE arena_memberships.arena_id = $1
       AND users.status = 'active'
       AND arena_memberships.status = 'active'
       AND users.email IN (${placeholders})`,
    [arenaId, ...uniqueEmails]
  );
  return rows.map((row) => ({ id: row.id, firstName: row.first_name, lastName: row.last_name, email: row.email, role: row.platform_role === "super_admin" ? "super_admin" : row.membership_role, status: row.membership_status, accountStatus: row.account_status, arenaId: row.arena_id, arenaName: row.arena_name }));
}

export async function listReservationsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT
       reservations.id, reservations.user_id, reservations.court_id,
       reservations.reservation_date, reservations.start_time, reservations.end_time,
       reservations.status, reservations.qr_token, reservations.notes, reservations.created_at,
       courts.name AS court_name, courts.sport, courts.arena_id, arenas.name AS arena_name,
       COALESCE(
         json_agg(json_build_object('id', participants.id, 'firstName', participants.first_name, 'lastName', participants.last_name, 'email', participants.email))
         FILTER (WHERE participants.id IS NOT NULL),
         '[]'::json
       ) AS participants
     FROM reservation_participants rp_self
     JOIN reservations ON reservations.id = rp_self.reservation_id
     JOIN courts ON courts.id = reservations.court_id
     JOIN arenas ON arenas.id = courts.arena_id
     LEFT JOIN reservation_participants rp_all ON rp_all.reservation_id = reservations.id
     LEFT JOIN users AS participants ON participants.id = rp_all.user_id
     WHERE rp_self.user_id = $1
     GROUP BY reservations.id, courts.name, courts.sport, courts.arena_id, arenas.name
     ORDER BY reservations.reservation_date DESC, reservations.start_time DESC`,
    [userId]
  );
  return rows.map(sanitizeReservation);
}

export async function createReservation({ userId, courtId, reservationDate, startTime, endTime, qrToken, notes = "", participantEmails = [] }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const actorRows = await queryUsersBy("WHERE users.id = $1 ORDER BY arena_memberships.id ASC LIMIT 1", [userId], client);
    const creator = actorRows[0];
    if (!creator) throw new Error("User not found");
    if (creator.effective_status !== "active") throw new Error("This account is inactive");
    if (!creator.arena_id) throw new Error("Only arena members can create reservations");

    const court = await getCourtByIdInternal(courtId, client);
    if (!court) throw new Error("Court not found");
    if (court.status !== "available") throw new Error("This court is not available for booking");
    if (creator.effective_role !== "super_admin" && court.arena_id !== creator.arena_id) throw new Error("You can only reserve courts in your arena");

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const openingMinutes = timeToMinutes(String(court.opening_time).slice(0, 5));
    const closingMinutes = timeToMinutes(String(court.closing_time).slice(0, 5));
    if (startMinutes === null || endMinutes === null || openingMinutes === null || closingMinutes === null || endMinutes <= startMinutes) throw new Error("Invalid reservation time");
    if (startMinutes < openingMinutes || endMinutes > closingMinutes) throw new Error("Reservation must stay within the arena opening hours");
    if (await hasReservationConflict(courtId, reservationDate, startTime, endTime, client)) throw new Error("This slot is already reserved");

    const rawEmails = [creator.email, ...participantEmails].map((email) => email.trim().toLowerCase()).filter(Boolean);
    const uniqueEmails = [...new Set(rawEmails)];
    if (uniqueEmails.length !== rawEmails.length) throw new Error("The same email cannot be used twice in a reservation");
    if (uniqueEmails.length < Number(court.min_players) || uniqueEmails.length > Number(court.max_players)) throw new Error(`This court accepts between ${court.min_players} and ${court.max_players} players`);

    const placeholders = uniqueEmails.map((_, index) => `$${index + 2}`).join(", ");
    const { rows: participantRows } = await client.query(
      `SELECT users.id, users.platform_role, users.status AS account_status, arena_memberships.status AS membership_status
       FROM users
       JOIN arena_memberships ON arena_memberships.user_id = users.id
       WHERE arena_memberships.arena_id = $1
         AND users.email IN (${placeholders})`,
      [court.arena_id, ...uniqueEmails]
    );
    if (participantRows.length !== uniqueEmails.length) throw new Error("Every participant must already have an active account in this arena");
    const invalid = participantRows.find((participant) => participant.platform_role === "super_admin" || participant.account_status !== "active" || participant.membership_status !== "active");
    if (invalid) throw new Error("Every participant must already have an active account in this arena");

    const created = await client.query(
      `INSERT INTO reservations (user_id, court_id, reservation_date, start_time, end_time, status, qr_token, notes, created_at)
       VALUES ($1, $2, $3::date, $4::time, $5::time, 'confirmed', $6, $7, NOW())
       RETURNING id`,
      [userId, courtId, reservationDate, startTime, endTime, qrToken, notes]
    );
    const reservationId = Number(created.rows[0].id);
    for (const participant of participantRows) {
      await client.query(`INSERT INTO reservation_participants (reservation_id, user_id, created_at) VALUES ($1, $2, NOW())`, [reservationId, participant.id]);
    }
    await addActivityLog(client, { arenaId: court.arena_id, actorUserId: creator.id, actorName: `${creator.first_name} ${creator.last_name}`, action: "Reservation confirmee", detail: `${court.name} - ${reservationDate} ${startTime}-${endTime}` });
    await client.query("COMMIT");
    const reservations = await listReservationsForUser(userId);
    return reservations.find((reservation) => reservation.id === reservationId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelReservation(id, actor) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT reservations.*, courts.arena_id, courts.name AS court_name
       FROM reservations
       JOIN courts ON courts.id = reservations.court_id
       WHERE reservations.id = $1
       LIMIT 1`,
      [id]
    );
    const reservation = rows[0];
    if (!reservation) {
      await client.query("ROLLBACK");
      return { changes: 0 };
    }
    if (reservation.status === "cancelled") {
      await client.query("ROLLBACK");
      return { success: true };
    }
    const participants = await client.query("SELECT user_id FROM reservation_participants WHERE reservation_id = $1", [id]);
    const isParticipant = participants.rows.some((p) => Number(p.user_id) === actor.id);
    const canCancelRole = actor.effective_role === "super_admin" || (actor.effective_role === "admin" && actor.arena_id === reservation.arena_id);
    if (!canCancelRole && !isParticipant) throw new Error("You do not have permission to cancel this reservation");
    if (!canCancelRole) {
      const reservationStart = new Date(`${String(reservation.reservation_date).slice(0, 10)}T${String(reservation.start_time).slice(0, 8)}`);
      const diffHours = (reservationStart.getTime() - Date.now()) / (1000 * 60 * 60);
      if (diffHours < 24) throw new Error("Reservations can only be cancelled at least 24 hours in advance");
    }
    const result = await client.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1", [id]);
    await addActivityLog(client, { arenaId: reservation.arena_id, actorUserId: actor.id, actorName: `${actor.first_name} ${actor.last_name}`, action: canCancelRole ? "Reservation annulee (admin)" : "Reservation annulee", detail: `${reservation.court_name} - ${reservation.reservation_date} ${String(reservation.start_time).slice(0, 5)}` });
    await client.query("COMMIT");
    return { changes: result.rowCount, success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminReservations(actor) {
  if (!isAdminLike(actor)) throw new Error("Admin access required");
  const params = [];
  let whereClause = "";
  if (actor.effective_role !== "super_admin") {
    params.push(actor.arena_id);
    whereClause = `WHERE courts.arena_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT reservations.id, reservations.reservation_date, reservations.start_time, reservations.end_time,
            reservations.status, reservations.notes, reservations.created_at, reservations.qr_token,
            courts.name AS court_name, arenas.name AS arena_name,
            creator.email AS owner_email, CONCAT(creator.first_name, ' ', creator.last_name) AS owner_name
     FROM reservations
     JOIN courts ON courts.id = reservations.court_id
     JOIN arenas ON arenas.id = courts.arena_id
     JOIN users AS creator ON creator.id = reservations.user_id
     ${whereClause}
     ORDER BY reservations.reservation_date DESC, reservations.start_time DESC`,
    params
  );
  return rows.map((row) => ({ ...row, created_at: toIso(row.created_at), reservation_date: String(row.reservation_date).slice(0, 10), start_time: String(row.start_time).slice(0, 5), end_time: String(row.end_time).slice(0, 5), special_code: `ULT-${row.id}-${String(row.qr_token ?? "").slice(0, 8).toUpperCase()}` }));
}

export async function updateAdminReservationStatus(actor, reservationId, nextStatus) {
  if (!["confirmed", "cancelled"].includes(nextStatus)) throw new Error("Invalid reservation status");
  if (!isAdminLike(actor)) throw new Error("Admin access required");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT reservations.*, courts.arena_id, courts.name AS court_name
       FROM reservations
       JOIN courts ON courts.id = reservations.court_id
       WHERE reservations.id = $1
       LIMIT 1`,
      [reservationId]
    );
    const reservation = rows[0];
    if (!reservation) throw new Error("Reservation not found");
    if (actor.effective_role === "admin" && reservation.arena_id !== actor.arena_id) throw new Error("You can only manage reservations in your arena");
    await client.query(`UPDATE reservations SET status = $1 WHERE id = $2`, [nextStatus, reservationId]);
    await addActivityLog(client, { arenaId: reservation.arena_id, actorUserId: actor.id, actorName: `${actor.first_name} ${actor.last_name}`, action: `Reservation ${nextStatus === "cancelled" ? "annulee (admin)" : "validee (admin)"}`, detail: `${reservation.court_name} - ${reservation.reservation_date} ${String(reservation.start_time).slice(0, 5)}` });
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.effective_role,
    status: user.effective_status,
    accountStatus: user.status,
    platformRole: user.platform_role,
    membershipRole: user.membership_role,
    membershipStatus: user.membership_status,
    arenaId: user.arena_id,
    arenaName: user.arena_name,
    cinNumber: user.cin_number ?? null,
    emailVerified: Boolean(user.email_verified_at),
    emailVerifiedAt: toIso(user.email_verified_at),
    createdAt: toIso(user.created_at),
  };
}

export async function requestPasswordReset(email) {
  const user = await findUserByEmail(String(email).trim().toLowerCase());
  if (!user) return { sent: true, token: null };
  const token = randomBytes(32).toString("hex");
  const code = generateSixDigitCode();
  await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL", [user.id]);
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
     VALUES ($1, $2, NOW() + INTERVAL '20 minutes', NOW())`,
    [user.id, `${token}:${code}`]
  );
  return {
    sent: true,
    token,
    code,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
  };
}

export async function requestEmailVerification(email) {
  const user = await findUserByEmail(String(email).trim().toLowerCase());
  if (!user) return { sent: true, token: null };
  if (user.email_verified_at) return { sent: true, token: null, alreadyVerified: true };
  const token = randomBytes(32).toString("hex");
  const code = generateSixDigitCode();
  await pool.query("DELETE FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL", [user.id]);
  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at, created_at)
     VALUES ($1, $2, NOW() + INTERVAL '24 hours', NOW())`,
    [user.id, `${token}:${code}`]
  );
  return {
    sent: true,
    token,
    code,
    alreadyVerified: false,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
  };
}

export async function verifyEmailWithToken(token) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT *
       FROM email_verification_tokens
       WHERE (token = $1 OR token LIKE ($1 || ':%'))
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [token]
    );
    const row = result.rows[0];
    if (!row) throw new Error("Invalid or expired verification token");
    await client.query("UPDATE users SET email_verified_at = NOW() WHERE id = $1", [row.user_id]);
    await client.query("UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1", [row.id]);
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyEmailWithCode(email, code) {
  const user = await findUserByEmail(String(email).trim().toLowerCase());
  if (!user) {
    throw new Error("Invalid verification code");
  }
  const normalizedCode = String(code ?? "").trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new Error("Invalid verification code");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT *
       FROM email_verification_tokens
       WHERE user_id = $1
         AND token LIKE $2
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [user.id, `%:${normalizedCode}`]
    );
    const row = result.rows[0];
    if (!row) throw new Error("Invalid or expired verification code");
    await client.query("UPDATE users SET email_verified_at = NOW() WHERE id = $1", [row.user_id]);
    await client.query("UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1", [row.id]);
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resetPasswordWithToken(token, passwordHash) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT *
       FROM password_reset_tokens
       WHERE (token = $1 OR token LIKE ($1 || ':%'))
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [token]
    );
    const row = result.rows[0];
    if (!row) throw new Error("Invalid or expired reset token");
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, row.user_id]);
    await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [row.id]);
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resetPasswordWithCode(email, code, passwordHash) {
  const user = await findUserByEmail(String(email).trim().toLowerCase());
  if (!user) {
    throw new Error("Invalid reset code");
  }
  const normalizedCode = String(code ?? "").trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new Error("Invalid reset code");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT *
       FROM password_reset_tokens
       WHERE user_id = $1
         AND token LIKE $2
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY id DESC
       LIMIT 1`,
      [user.id, `%:${normalizedCode}`]
    );
    const row = result.rows[0];
    if (!row) throw new Error("Invalid or expired reset code");
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, row.user_id]);
    await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [row.id]);
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const notYet = (name) => {
  throw new Error(`Postgres adapter: "${name}" is not migrated yet in Phase 2.`);
};

async function getArenaRoleUsage(arenaId) {
  const { rows } = await pool.query(
    `SELECT role, COUNT(*)::int AS count
     FROM arena_memberships
     WHERE arena_id = $1 AND status = 'active'
     GROUP BY role`,
    [arenaId]
  );
  const usage = { admins: 0, coaches: 0, players: 0 };
  for (const row of rows) {
    if (row.role === "admin") usage.admins = Number(row.count);
    if (row.role === "coach") usage.coaches = Number(row.count);
    if (row.role === "player") usage.players = Number(row.count);
  }
  return usage;
}

async function getArenaSubscriptionWithPlan(arenaId) {
  const { rows } = await pool.query(
    `SELECT
       arena_subscriptions.id,
       arena_subscriptions.arena_id,
       arena_subscriptions.status,
       arena_subscriptions.provider,
       arena_subscriptions.provider_customer_id,
       arena_subscriptions.provider_subscription_id,
       arena_subscriptions.current_period_start,
       arena_subscriptions.current_period_end,
       arena_subscriptions.trial_end,
       arena_subscriptions.cancel_at_period_end,
       billing_plans.code AS plan_code,
       billing_plans.name AS plan_name,
       billing_plans.max_admins,
       billing_plans.max_coaches,
       billing_plans.max_players,
       billing_plans.features_json,
       billing_plans.monthly_price_cents,
       billing_plans.yearly_price_cents
     FROM arena_subscriptions
     JOIN billing_plans ON billing_plans.id = arena_subscriptions.plan_id
     WHERE arena_subscriptions.arena_id = $1
     ORDER BY arena_subscriptions.id DESC
     LIMIT 1`,
    [arenaId]
  );
  if (rows[0]) return rows[0];

  const { rows: plans } = await pool.query(
    `SELECT code AS plan_code, name AS plan_name, max_admins, max_coaches, max_players, features_json, monthly_price_cents, yearly_price_cents
     FROM billing_plans
     WHERE is_active = 1
     ORDER BY CASE WHEN code = 'starter' THEN 0 ELSE 1 END, monthly_price_cents ASC
     LIMIT 1`
  );
  const plan = plans[0];
  if (!plan) throw new Error("No billing plan configured");
  return {
    id: null,
    arena_id: arenaId,
    status: "active",
    provider: "manual",
    provider_customer_id: null,
    provider_subscription_id: null,
    current_period_start: new Date(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    trial_end: null,
    cancel_at_period_end: false,
    ...plan,
  };
}

export async function createManagedUser({
  actor,
  firstName,
  lastName,
  email,
  passwordHash,
  arenaId,
  membershipRole,
  arenaName,
  cinNumber = null,
  emailVerifiedAt = new Date().toISOString(),
}) {
  if (!isAdminLike(actor)) throw new Error("Admin access required");
  let finalArenaId = arenaId;
  let managedFirstName = firstName;
  let managedLastName = lastName;

  if (actor.effective_role === "super_admin" && membershipRole === "admin" && arenaName) {
    const arena = await createArena({ name: arenaName, location: "Plateforme ULTIMA" });
    finalArenaId = arena.id;
    managedFirstName = "Admin";
    managedLastName = arenaName;
  }
  if (actor.effective_role === "admin") {
    if (Number(finalArenaId) !== Number(actor.arena_id)) throw new Error("You can only create users in your arena");
    if (!["player", "coach"].includes(membershipRole)) throw new Error("Arena admins can only create players and coaches");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insert = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, status, platform_role, cin_number, email_verified_at, created_at)
       VALUES ($1, $2, $3, $4, $5, 'active', 'member', $6, $7, NOW())
       RETURNING id`,
      [managedFirstName, managedLastName, email, passwordHash, membershipRole, cinNumber, emailVerifiedAt]
    );
    const userId = Number(insert.rows[0].id);
    await client.query(
      `INSERT INTO arena_memberships (arena_id, user_id, role, status, created_at)
       VALUES ($1, $2, $3, 'active', NOW())`,
      [finalArenaId, userId, membershipRole]
    );
    await addActivityLog(client, { arenaId: finalArenaId, actorUserId: actor.id, actorName: `${actor.first_name} ${actor.last_name}`, action: "Compte cree par le staff", detail: `${managedFirstName} ${managedLastName} (${membershipRole})` });
    await client.query("COMMIT");
    return findUserById(userId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createCourt({ actor, arenaId, name, sport, location, hasSumma = 0, minPlayers = 2, maxPlayers = 4, openingTime = "08:00", closingTime = "22:00" }) {
  if (!isAdminLike(actor)) throw new Error("Admin access required");
  const resolvedArenaId = Number(arenaId);
  if (!resolvedArenaId) throw new Error("Arena is required");
  if (actor.effective_role === "admin" && resolvedArenaId !== actor.arena_id) throw new Error("You can only create courts in your arena");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insert = await client.query(
      `INSERT INTO courts (arena_id, name, sport, status, has_summa, location, min_players, max_players, opening_time, closing_time, created_at)
       VALUES ($1, $2, $3, 'available', $4, $5, $6, $7, $8::time, $9::time, NOW())
       RETURNING id`,
      [resolvedArenaId, name, sport, Number(hasSumma) ? 1 : 0, location, Number(minPlayers), Number(maxPlayers), openingTime, closingTime]
    );
    await addActivityLog(client, { arenaId: resolvedArenaId, actorUserId: actor.id, actorName: `${actor.first_name} ${actor.last_name}`, action: "Terrain cree", detail: `${name} (${sport})` });
    await client.query("COMMIT");
    return getCourtByIdInternal(Number(insert.rows[0].id));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createAnalysis({ userId, title, videoName }) {
  const created = await pool.query(
    `INSERT INTO ai_analyses (user_id, title, video_name, status, summary, created_at)
     VALUES ($1, $2, $3, 'queued', $4, NOW())
     RETURNING id`,
    [userId, title, videoName, "Analyse planifiee pour le moteur SmartPlay AI."]
  );
  const id = Number(created.rows[0].id);
  const { rows } = await pool.query(
    `SELECT id, title, video_name AS "videoName", status, summary, created_at AS "createdAt"
     FROM ai_analyses
     WHERE id = $1`,
    [id]
  );
  return { ...rows[0], createdAt: toIso(rows[0].createdAt) };
}

export async function getAdminOverview(actor) {
  if (!isAdminLike(actor)) throw new Error("Admin access required");
  const params = [];
  const whereArena = actor.effective_role === "super_admin" ? "" : "WHERE arena_memberships.arena_id = $1";
  if (whereArena) params.push(actor.arena_id);

  const statsResult = await pool.query(
    `SELECT
       COUNT(DISTINCT users.id)::int AS users,
       COUNT(DISTINCT CASE WHEN competitions.status = 'open' THEN competitions.id END)::int AS "activeCompetitions",
       COUNT(DISTINCT competition_registrations.id)::int AS "totalRegistrations",
       COUNT(DISTINCT matches.id)::int AS "matchesThisWeek"
     FROM users
     LEFT JOIN arena_memberships ON arena_memberships.user_id = users.id
     LEFT JOIN competitions ON competitions.arena_id = arena_memberships.arena_id
     LEFT JOIN competition_registrations ON competition_registrations.competition_id = competitions.id
     LEFT JOIN matches ON matches.arena_id = arena_memberships.arena_id
     ${whereArena}`,
    params
  );
  const userRows = await pool.query(
    `SELECT users.id, users.first_name, users.last_name, users.email, users.platform_role, users.status,
            arena_memberships.role AS membership_role, arena_memberships.status AS membership_status,
            arenas.id AS arena_id, arenas.name AS arena_name, users.created_at
     FROM users
     LEFT JOIN arena_memberships ON arena_memberships.user_id = users.id
     LEFT JOIN arenas ON arenas.id = arena_memberships.arena_id
     ${whereArena}
     ORDER BY users.id ASC`,
    params
  );
  const courtRows = await pool.query(
    `SELECT courts.*, arenas.name AS arena_name
     FROM courts
     JOIN arenas ON arenas.id = courts.arena_id
     ${actor.effective_role === "super_admin" ? "" : "WHERE courts.arena_id = $1"}
     ORDER BY courts.id ASC`,
    actor.effective_role === "super_admin" ? [] : [actor.arena_id]
  );
  const logRows = await pool.query(
    `SELECT activity_logs.*, arenas.name AS arena_name
     FROM activity_logs
     LEFT JOIN arenas ON arenas.id = activity_logs.arena_id
     ${actor.effective_role === "super_admin" ? "" : "WHERE activity_logs.arena_id = $1"}
     ORDER BY activity_logs.created_at DESC
     LIMIT 12`,
    actor.effective_role === "super_admin" ? [] : [actor.arena_id]
  );
  return {
    stats: statsResult.rows[0],
    users: userRows.rows.map(sanitizeMembershipUser),
    courts: courtRows.rows.map(sanitizeCourt),
    logs: logRows.rows.map(sanitizeLog),
    arenas: actor.effective_role === "super_admin" ? await listArenas() : [],
  };
}

export async function getArenaBillingSummary(actor) {
  if (!isAdminLike(actor)) throw new Error("Admin access required");
  const arenaId = actor.arena_id;
  if (!arenaId) throw new Error("Arena billing is not available for this account");
  const subscription = await getArenaSubscriptionWithPlan(arenaId);
  const usage = await getArenaRoleUsage(arenaId);
  let features = subscription.features_json ?? {};
  if (typeof features === "string") {
    try {
      features = JSON.parse(features);
    } catch {
      features = {};
    }
  }
  return {
    arenaId,
    subscription: {
      id: subscription.id,
      status: subscription.status,
      provider: subscription.provider,
      providerCustomerId: subscription.provider_customer_id,
      providerSubscriptionId: subscription.provider_subscription_id,
      plan: {
        code: subscription.plan_code,
        name: subscription.plan_name,
        monthlyPriceCents: Number(subscription.monthly_price_cents ?? 0),
        yearlyPriceCents: Number(subscription.yearly_price_cents ?? 0),
      },
      period: {
        currentStart: toIso(subscription.current_period_start),
        currentEnd: toIso(subscription.current_period_end),
        trialEnd: toIso(subscription.trial_end),
      },
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    },
    limits: {
      admins: Number(subscription.max_admins ?? 0),
      coaches: Number(subscription.max_coaches ?? 0),
      players: Number(subscription.max_players ?? 0),
    },
    usage,
    features,
  };
}

export async function listBillingPlans() {
  const { rows } = await pool.query(
    `SELECT code, name, max_admins, max_coaches, max_players, features_json, monthly_price_cents, yearly_price_cents
     FROM billing_plans
     WHERE is_active = 1
     ORDER BY monthly_price_cents ASC`
  );
  return rows.map((row) => {
    let features = row.features_json ?? {};
    if (typeof features === "string") {
      try {
        features = JSON.parse(features);
      } catch {
        features = {};
      }
    }
    return {
      code: row.code,
      name: row.name,
      limits: { admins: Number(row.max_admins ?? 0), coaches: Number(row.max_coaches ?? 0), players: Number(row.max_players ?? 0) },
      prices: { monthlyCents: Number(row.monthly_price_cents ?? 0), yearlyCents: Number(row.yearly_price_cents ?? 0) },
      features,
    };
  });
}

export async function changeArenaPlan(actor, planCode, cycle = "monthly") {
  if (!isAdminLike(actor)) throw new Error("Admin access required");
  if (!actor.arena_id) throw new Error("Arena not found for this account");
  const planQuery = await pool.query(
    `SELECT id, code, max_admins, max_coaches, max_players
     FROM billing_plans
     WHERE code = $1 AND is_active = 1
     LIMIT 1`,
    [planCode]
  );
  const selectedPlan = planQuery.rows[0];
  if (!selectedPlan) throw new Error("Plan not found");
  const usage = await getArenaRoleUsage(actor.arena_id);
  if (usage.admins > Number(selectedPlan.max_admins) || usage.coaches > Number(selectedPlan.max_coaches) || usage.players > Number(selectedPlan.max_players)) {
    throw new Error("Current user count exceeds limits for the selected plan.");
  }
  await upsertArenaSubscriptionFromProvider({
    arenaId: actor.arena_id,
    planCode: selectedPlan.code,
    status: "active",
    provider: "manual",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + (String(cycle) === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
    trialEnd: null,
    cancelAtPeriodEnd: false,
  });
  return getArenaBillingSummary(actor);
}

export async function getLeaderboard(actor = null) {
  const params = [];
  let whereClause = "";
  if (actor?.effective_role !== "super_admin" && actor?.arena_id) {
    params.push(actor.arena_id);
    whereClause = `WHERE arena_memberships.arena_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT
       ROW_NUMBER() OVER (ORDER BY MAX(performance_snapshots.ranking_score) DESC) AS rank,
       CONCAT(users.first_name, ' ', LEFT(users.last_name, 1), '.') AS name,
       MAX(performance_snapshots.ranking_score) AS points,
       SUM(performance_snapshots.wins)::int AS wins,
       SUM(performance_snapshots.losses)::int AS losses
     FROM users
     JOIN performance_snapshots ON performance_snapshots.user_id = users.id
     LEFT JOIN arena_memberships ON arena_memberships.user_id = users.id
     ${whereClause}
     GROUP BY users.id
     ORDER BY points DESC
     LIMIT 5`,
    params
  );
  return rows;
}

export async function getCompetitionDetails(competitionId) {
  const comp = await pool.query(
    `SELECT competitions.*, arenas.name AS arena_name
     FROM competitions
     JOIN arenas ON arenas.id = competitions.arena_id
     WHERE competitions.id = $1
     LIMIT 1`,
    [competitionId]
  );
  const competition = comp.rows[0];
  if (!competition) return null;
  const participants = await pool.query(
    `SELECT users.id, users.first_name, users.last_name, latest.ranking_score AS ranking
     FROM competition_registrations
     JOIN users ON users.id = competition_registrations.user_id
     LEFT JOIN (
       SELECT user_id, ranking_score, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY id DESC) AS rn
       FROM performance_snapshots
     ) latest ON latest.user_id = users.id AND latest.rn = 1
     WHERE competition_registrations.competition_id = $1
       AND competition_registrations.status = 'registered'`,
    [competitionId]
  );
  return {
    ...sanitizeCompetition(competition),
    participants: participants.rows.map((p) => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, ranking: Number(p.ranking ?? 1000) })),
    rules: "Matchs en 2 sets gagnants. Point decisif a 40-40. Super tie-break en cas de 3eme set.",
    prizes: "1er: 500€ + Trophee | 2eme: 200€ | 3eme: 100€",
  };
}
export async function getReservationTicketDetails(reservationId, actor) {
  const details = await pool.query(
    `SELECT reservations.id, reservations.reservation_date, reservations.start_time, reservations.end_time,
            reservations.status, reservations.qr_token, reservations.notes, reservations.created_at,
            courts.name AS court_name, courts.sport, arenas.id AS arena_id, arenas.name AS arena_name, arenas.location AS arena_location,
            owner.first_name AS owner_first_name, owner.last_name AS owner_last_name
     FROM reservations
     JOIN courts ON courts.id = reservations.court_id
     JOIN arenas ON arenas.id = courts.arena_id
     JOIN users AS owner ON owner.id = reservations.user_id
     WHERE reservations.id = $1
     LIMIT 1`,
    [reservationId]
  );
  const reservation = details.rows[0];
  if (!reservation) throw new Error("Reservation not found");

  const participantsQuery = await pool.query(
    `SELECT users.id, users.first_name, users.last_name, users.email
     FROM reservation_participants
     JOIN users ON users.id = reservation_participants.user_id
     WHERE reservation_participants.reservation_id = $1
     ORDER BY users.first_name ASC, users.last_name ASC`,
    [reservationId]
  );
  const participants = participantsQuery.rows;
  const canAccess =
    actor?.effective_role === "super_admin" ||
    (actor?.effective_role === "admin" && actor?.arena_id && Number(actor.arena_id) === Number(reservation.arena_id)) ||
    participants.some((participant) => Number(participant.id) === Number(actor?.id));
  if (!canAccess) throw new Error("You do not have access to this reservation ticket");

  const payload = `${reservation.id}|${reservation.qr_token}|${String(reservation.reservation_date).slice(0, 10)}|${String(reservation.start_time).slice(0, 8)}|${String(reservation.end_time).slice(0, 8)}`;
  const signature = createHmac("sha256", BILLING_SECRET).update(payload).digest("hex").slice(0, 32).toUpperCase();
  const specialCode = `ULT-${reservation.id}-${signature.slice(0, 8)}`;
  return {
    id: reservation.id,
    reservationDate: String(reservation.reservation_date).slice(0, 10),
    startTime: String(reservation.start_time).slice(0, 5),
    endTime: String(reservation.end_time).slice(0, 5),
    status: reservation.status,
    qrToken: reservation.qr_token,
    notes: reservation.notes ?? "",
    createdAt: toIso(reservation.created_at),
    courtName: reservation.court_name,
    sport: reservation.sport,
    arenaName: reservation.arena_name,
    arenaLocation: reservation.arena_location,
    ownerName: `${reservation.owner_first_name} ${reservation.owner_last_name}`,
    participants: participants.map((participant) => ({ id: participant.id, name: `${participant.first_name} ${participant.last_name}`, email: participant.email })),
    signature,
    specialCode,
  };
}

export async function getReservationTicketDetailsByQr(reservationId, qrToken) {
  const details = await pool.query(
    `SELECT reservations.id, reservations.reservation_date, reservations.start_time, reservations.end_time,
            reservations.status, reservations.qr_token, reservations.notes, reservations.created_at,
            courts.name AS court_name, courts.sport, arenas.name AS arena_name, arenas.location AS arena_location,
            owner.first_name AS owner_first_name, owner.last_name AS owner_last_name
     FROM reservations
     JOIN courts ON courts.id = reservations.court_id
     JOIN arenas ON arenas.id = courts.arena_id
     JOIN users AS owner ON owner.id = reservations.user_id
     WHERE reservations.id = $1
       AND reservations.qr_token = $2
     LIMIT 1`,
    [reservationId, qrToken]
  );
  const reservation = details.rows[0];
  if (!reservation) throw new Error("Invalid ticket link or reservation");
  const participantsQuery = await pool.query(
    `SELECT users.id, users.first_name, users.last_name, users.email
     FROM reservation_participants
     JOIN users ON users.id = reservation_participants.user_id
     WHERE reservation_participants.reservation_id = $1
     ORDER BY users.first_name ASC, users.last_name ASC`,
    [reservationId]
  );
  const payload = `${reservation.id}|${reservation.qr_token}|${String(reservation.reservation_date).slice(0, 10)}|${String(reservation.start_time).slice(0, 8)}|${String(reservation.end_time).slice(0, 8)}`;
  const signature = createHmac("sha256", BILLING_SECRET).update(payload).digest("hex").slice(0, 32).toUpperCase();
  const specialCode = `ULT-${reservation.id}-${signature.slice(0, 8)}`;
  return {
    id: reservation.id,
    reservationDate: String(reservation.reservation_date).slice(0, 10),
    startTime: String(reservation.start_time).slice(0, 5),
    endTime: String(reservation.end_time).slice(0, 5),
    status: reservation.status,
    qrToken: reservation.qr_token,
    notes: reservation.notes ?? "",
    createdAt: toIso(reservation.created_at),
    courtName: reservation.court_name,
    sport: reservation.sport,
    arenaName: reservation.arena_name,
    arenaLocation: reservation.arena_location,
    ownerName: `${reservation.owner_first_name} ${reservation.owner_last_name}`,
    participants: participantsQuery.rows.map((participant) => ({ id: participant.id, name: `${participant.first_name} ${participant.last_name}`, email: participant.email })),
    signature,
    specialCode,
  };
}

function buildQrPdfCommands(value, x, y, size) {
  const qr = QRCode.create(String(value), { errorCorrectionLevel: "M", margin: 0 });
  const moduleCount = qr.modules.size;
  const moduleSize = size / moduleCount;
  const commands = ["1 1 1 rg", `${x} ${y} ${size} ${size} re`, "f", "0 0 0 rg"];
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qr.modules.get(row, col)) continue;
      const px = x + col * moduleSize;
      const py = y + (moduleCount - 1 - row) * moduleSize;
      commands.push(`${px.toFixed(2)} ${py.toFixed(2)} ${moduleSize.toFixed(2)} ${moduleSize.toFixed(2)} re`);
      commands.push("f");
    }
  }
  return commands;
}

function getJpegSize(buffer) {
  if (!buffer || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xc0 || marker === 0xc2) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    if (marker === 0xda || marker === 0xd9) break;
    const length = buffer.readUInt16BE(offset + 2);
    offset += 2 + length;
  }
  return null;
}

function loadUltimaLogoJpeg() {
  for (const candidate of LOGO_CANDIDATE_PATHS) {
    if (fs.existsSync(candidate)) {
      const bytes = fs.readFileSync(candidate);
      const size = getJpegSize(bytes);
      if (size) return { bytes, ...size };
    }
  }
  return null;
}

export function generateReservationTicketPdfBuffer(ticket) {
  const line = (text = "") => String(text).replace(/[()]/g, "").slice(0, 110);
  const participants = (ticket.participants || []).slice(0, 8).map((participant, index) => `${index + 1}. ${participant.name} <${participant.email}>`);
  const specialCode = ticket.specialCode || `ULT-${ticket.id}-${ticket.signature.slice(0, 8)}`;
  const qrPayload = `ULTIMA|TICKET|${ticket.id}|${ticket.qrToken}|${specialCode}`;
  const contentLines = [
    `Ticket ID: #${ticket.id}`,
    `Arena: ${ticket.arenaName} (${ticket.arenaLocation || "N/A"})`,
    `Court: ${ticket.courtName} - ${ticket.sport}`,
    `Date: ${ticket.reservationDate}`,
    `Time: ${ticket.startTime} - ${ticket.endTime}`,
    `Status: ${ticket.status}`,
    `Owner: ${ticket.ownerName}`,
    `QR Token: ${ticket.qrToken}`,
    "",
    "Participants:",
    ...participants,
    "",
    `Notes: ${ticket.notes || "N/A"}`,
    "",
    `Special Verification Code: ${specialCode}`,
    `Digital Signature: ${ticket.signature}`,
    `Generated At: ${new Date().toISOString()}`,
  ];
  const stream = ["0.88 0.84 0.98 rg", "0 0 595 842 re", "f", "0.08 0.06 0.16 rg", "0 760 595 82 re", "f", "0.16 0.12 0.3 rg", "BT", "/F1 26 Tf", "120 798 Td", "(ULTIMA RESERVATION PASS) Tj", "ET", "q", "74 0 0 54 42 772 cm", "/Im1 Do", "Q", "0.16 0.12 0.3 rg", "BT", "/F1 11 Tf", "50 730 Td", "14 TL"];
  for (let index = 0; index < contentLines.length; index += 1) {
    const text = line(contentLines[index]);
    if (index === 0) stream.push(`(${text}) Tj`);
    else {
      stream.push("T*");
      stream.push(`(${text}) Tj`);
    }
  }
  stream.push("ET", "0.24 0.22 0.35 RG", "2 w", "40 50 515 740 re", "S", ...buildQrPdfCommands(qrPayload, 430, 74, 112), "0.16 0.12 0.3 rg", "BT", "/F1 8 Tf", "430 62 Td", "(Reservation QR - scan to verify) Tj", "ET");
  const contentStream = `${stream.join("\n")}\n`;
  const contentLength = Buffer.byteLength(contentStream, "utf8");
  const logo = loadUltimaLogoJpeg();
  const objects = [];
  objects.push(Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n", "utf8"));
  objects.push(Buffer.from("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n", "utf8"));
  objects.push(Buffer.from("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 5 0 R >>\nendobj\n", "utf8"));
  objects.push(Buffer.from("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n", "utf8"));
  objects.push(Buffer.from(`5 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}endstream\nendobj\n`, "utf8"));
  if (logo) {
    const imageHeader = Buffer.from(`6 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`, "utf8");
    const imageFooter = Buffer.from("\nendstream\nendobj\n", "utf8");
    objects.push(Buffer.concat([imageHeader, logo.bytes, imageFooter]));
  } else {
    objects.push(Buffer.from("6 0 obj\n<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 3 >>\nstream\n\xFF\xFF\xFF\nendstream\nendobj\n", "binary"));
  }
  let offset = Buffer.byteLength("%PDF-1.4\n", "utf8");
  const xrefOffsets = [0];
  for (const object of objects) {
    xrefOffsets.push(offset);
    offset += object.length;
  }
  const xrefStart = offset;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) xref += `${String(xrefOffsets[index]).padStart(10, "0")} 00000 n \n`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.concat([Buffer.from("%PDF-1.4\n", "utf8"), ...objects, Buffer.from(xref, "utf8"), Buffer.from(trailer, "utf8")]);
}

export async function verifyReservationTicketSignature(reservationId, signature) {
  const result = await pool.query(
    `SELECT reservations.id, reservations.reservation_date, reservations.start_time, reservations.end_time, reservations.qr_token, reservations.status,
            courts.name AS court_name, arenas.name AS arena_name, CONCAT(owner.first_name, ' ', owner.last_name) AS owner_name
     FROM reservations
     JOIN courts ON courts.id = reservations.court_id
     JOIN arenas ON arenas.id = courts.arena_id
     JOIN users AS owner ON owner.id = reservations.user_id
     WHERE reservations.id = $1
     LIMIT 1`,
    [reservationId]
  );
  const reservation = result.rows[0];
  if (!reservation) return { valid: false, reason: "Reservation not found" };
  const payload = `${reservation.id}|${reservation.qr_token}|${String(reservation.reservation_date).slice(0, 10)}|${String(reservation.start_time).slice(0, 8)}|${String(reservation.end_time).slice(0, 8)}`;
  const expectedSignature = createHmac("sha256", BILLING_SECRET).update(payload).digest("hex").slice(0, 32).toUpperCase();
  const provided = String(signature || "").trim().toUpperCase();
  const specialCode = `ULT-${reservation.id}-${expectedSignature.slice(0, 8)}`;
  return {
    valid: provided === expectedSignature || provided === specialCode,
    expectedSignature,
    reservationId: reservation.id,
    details: {
      reservationDate: String(reservation.reservation_date).slice(0, 10),
      startTime: String(reservation.start_time).slice(0, 5),
      endTime: String(reservation.end_time).slice(0, 5),
      status: reservation.status,
      courtName: reservation.court_name,
      arenaName: reservation.arena_name,
      ownerName: reservation.owner_name,
      specialCode,
    },
  };
}

export async function listCoachesForPlayer(playerUserId) {
  const actor = await requireActiveActor(playerUserId);
  if (!actor.arena_id) throw new Error("Player must belong to an arena");
  const { rows } = await pool.query(
    `SELECT users.id, users.first_name, users.last_name, users.email, arena_memberships.role AS membership_role
     FROM users
     JOIN arena_memberships ON arena_memberships.user_id = users.id
     WHERE arena_memberships.arena_id = $1
       AND arena_memberships.status = 'active'
       AND users.status = 'active'
       AND arena_memberships.role IN ('coach', 'admin')
     ORDER BY users.first_name ASC, users.last_name ASC`,
    [actor.arena_id]
  );
  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.membership_role,
  }));
}

export async function listCoachRelationshipsForUser(userId) {
  const actor = await requireActiveActor(userId);
  const { rows } = await pool.query(
    `SELECT links.*, CONCAT(coach.first_name, ' ', coach.last_name) AS coach_name, CONCAT(player.first_name, ' ', player.last_name) AS player_name
     FROM coach_player_relationships links
     JOIN users coach ON coach.id = links.coach_user_id
     JOIN users player ON player.id = links.player_user_id
     WHERE links.coach_user_id = $1 OR links.player_user_id = $1
     ORDER BY links.updated_at DESC`,
    [actor.id]
  );
  return rows.map(normalizeRelationship);
}

export async function listCoachRelationshipExpiryReminders(userId, days = 7) {
  const actor = await requireActiveActor(userId);
  const safeDays = Math.min(60, Math.max(1, Number(days) || 7));
  const { rows } = await pool.query(
    `SELECT
       links.*,
       CONCAT(coach.first_name, ' ', coach.last_name) AS coach_name,
       CONCAT(player.first_name, ' ', player.last_name) AS player_name
     FROM coach_player_relationships links
     JOIN users coach ON coach.id = links.coach_user_id
     JOIN users player ON player.id = links.player_user_id
     WHERE links.status = 'active'
       AND links.end_date IS NOT NULL
       AND links.end_date >= CURRENT_DATE
       AND links.end_date <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
       AND (
         ($2::int IN (links.coach_user_id, links.player_user_id))
         OR ($3::text = 'super_admin')
         OR ($3::text = 'admin' AND $4::int = links.arena_id)
       )
     ORDER BY links.end_date ASC`,
    [safeDays, actor.id, actor.effective_role, actor.arena_id]
  );
  return rows.map((row) => ({
    ...normalizeRelationship(row),
    reminder: `Relationship expires on ${String(row.end_date).split("T")[0]}`,
  }));
}
export async function getPerformanceForUser(userId) {
  const snapshots = await pool.query(
    `SELECT week_label, ranking_score, wins, losses, created_at
     FROM performance_snapshots
     WHERE user_id = $1
     ORDER BY id ASC`,
    [userId]
  );
  const profile = await pool.query(
    `SELECT service, return_skill, volley, endurance, strategy, mental, updated_at
     FROM performance_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  const rows = snapshots.rows;
  const latest = rows.at(-1) ?? null;
  const p = profile.rows[0] ?? null;
  return {
    summary: latest
      ? {
          rankingScore: Number(latest.ranking_score),
          winRate: `${Math.max(60, 70 + rows.length)}%`,
          streak: `${Math.min(5, rows.length)} victoires`,
          matchesThisMonth: rows.length,
        }
      : null,
    progress: rows.map((row) => ({ semaine: row.week_label, score: row.ranking_score, victoires: row.wins, defaites: row.losses })),
    radar: p
      ? [
          { skill: "Service", value: p.service },
          { skill: "Retour", value: p.return_skill },
          { skill: "Volee", value: p.volley },
          { skill: "Endurance", value: p.endurance },
          { skill: "Strategie", value: p.strategy },
          { skill: "Mental", value: p.mental },
        ]
      : [],
  };
}
export async function listAnalysesForUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, title, video_name AS "videoName", status, summary, created_at AS "createdAt"
     FROM ai_analyses
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map((row) => ({ ...row, createdAt: toIso(row.createdAt) }));
}
export async function listCoachStudents(coachUserId) {
  const actor = await getCoachActor(coachUserId);
  const { rows } = await pool.query(
    `SELECT
       users.id,
       users.first_name,
       users.last_name,
       users.email,
       users.created_at,
       COALESCE(latest_snapshot.ranking_score, 1000) AS ranking_score,
       COALESCE(match_stats.matches_played, 0) AS matches_played,
       COALESCE(match_stats.wins, 0) AS wins,
       COALESCE(match_stats.losses, 0) AS losses,
       links.id AS relationship_id,
       links.start_date,
       links.end_date,
       links.can_view_performance,
       links.can_view_reservations,
       links.can_schedule_sessions,
       links.can_view_notes
     FROM coach_player_relationships links
     JOIN users ON users.id = links.player_user_id
     JOIN arena_memberships ON arena_memberships.user_id = users.id
     LEFT JOIN (
       SELECT ps.user_id, ps.ranking_score
       FROM performance_snapshots ps
       JOIN (
         SELECT user_id, MAX(id) AS max_id
         FROM performance_snapshots
         GROUP BY user_id
       ) latest_ids ON latest_ids.user_id = ps.user_id AND latest_ids.max_id = ps.id
     ) latest_snapshot ON latest_snapshot.user_id = users.id
     LEFT JOIN (
       SELECT
         u.user_id,
         COUNT(*)::int AS matches_played,
         SUM(CASE WHEN m.winner_team = u.player_team THEN 1 ELSE 0 END)::int AS wins,
         SUM(CASE WHEN m.status = 'finished' AND m.winner_team <> u.player_team AND m.winner_team IN (1, 2) THEN 1 ELSE 0 END)::int AS losses
       FROM (
         SELECT id, winner_team, team1_player1_id AS user_id, 1 AS player_team, status FROM matches WHERE team1_player1_id IS NOT NULL
         UNION ALL SELECT id, winner_team, team1_player2_id, 1, status FROM matches WHERE team1_player2_id IS NOT NULL
         UNION ALL SELECT id, winner_team, team2_player1_id, 2, status FROM matches WHERE team2_player1_id IS NOT NULL
         UNION ALL SELECT id, winner_team, team2_player2_id, 2, status FROM matches WHERE team2_player2_id IS NOT NULL
       ) u
       JOIN matches m ON m.id = u.id
       WHERE m.status = 'finished'
       GROUP BY u.user_id
     ) match_stats ON match_stats.user_id = users.id
     WHERE links.coach_user_id = $1
       AND links.arena_id = $2
       AND links.status = 'active'
       AND links.start_date <= CURRENT_DATE
       AND (links.end_date IS NULL OR links.end_date >= CURRENT_DATE)
       AND links.can_view_performance = 1
       AND arena_memberships.role = 'player'
       AND arena_memberships.status = 'active'
       AND users.status = 'active'
     ORDER BY match_stats.matches_played DESC, users.first_name ASC, users.last_name ASC`,
    [actor.id, actor.arena_id]
  );
  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    rankingScore: Number(row.ranking_score ?? 1000),
    matchesPlayed: Number(row.matches_played ?? 0),
    wins: Number(row.wins ?? 0),
    losses: Number(row.losses ?? 0),
    createdAt: toIso(row.created_at),
    relationship: {
      id: row.relationship_id,
      startDate: row.start_date ? String(row.start_date).split("T")[0] : null,
      endDate: row.end_date ? String(row.end_date).split("T")[0] : null,
      permissions: {
        canViewPerformance: Boolean(row.can_view_performance),
        canViewReservations: Boolean(row.can_view_reservations),
        canScheduleSessions: Boolean(row.can_schedule_sessions),
        canViewNotes: Boolean(row.can_view_notes),
      },
    },
  }));
}

export async function getCoachStudentStats(coachUserId, studentId) {
  const actor = await getCoachActor(coachUserId);
  const relationship = await getActiveCoachRelationshipForStudent(actor.id, Number(studentId));
  if (!relationship) throw new Error("This player is not assigned to you");
  if (!relationship.can_view_performance) throw new Error("Player did not grant performance access");
  const { rows } = await pool.query(
    `SELECT users.id, users.first_name, users.last_name, users.email, users.created_at
     FROM users
     JOIN arena_memberships ON arena_memberships.user_id = users.id
     WHERE users.id = $1
       AND arena_memberships.arena_id = $2
       AND arena_memberships.role = 'player'
     LIMIT 1`,
    [studentId, actor.arena_id]
  );
  if (!rows[0]) throw new Error("Student not found in your arena");
  const dashboard = await getPlayerDashboardData(studentId);
  const performance = await getPerformanceForUser(studentId);
  const matches = await listPlayerMatches(studentId);
  return {
    student: {
      id: rows[0].id,
      firstName: rows[0].first_name,
      lastName: rows[0].last_name,
      email: rows[0].email,
      createdAt: toIso(rows[0].created_at),
    },
    dashboard,
    performance,
    recentMatches: matches.slice(0, 12),
  };
}
export async function listCompetitions(actor = null) {
  const params = [];
  let whereClause = "";
  if (actor?.effective_role !== "super_admin" && actor?.arena_id) {
    params.push(actor.arena_id);
    whereClause = `WHERE competitions.arena_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT competitions.*, arenas.name AS arena_name, COUNT(competition_registrations.id)::int AS participants
     FROM competitions
     JOIN arenas ON arenas.id = competitions.arena_id
     LEFT JOIN competition_registrations
       ON competition_registrations.competition_id = competitions.id
      AND competition_registrations.status = 'registered'
     ${whereClause}
     GROUP BY competitions.id, arenas.name
     ORDER BY competitions.start_date ASC`,
    params
  );
  return rows.map(sanitizeCompetition);
}
export async function listMatches(actor = null) {
  const params = [];
  let whereClause = "";

  if (actor?.effective_role !== "super_admin" && actor?.arena_id) {
    params.push(actor.arena_id);
    whereClause = `WHERE matches.arena_id = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT
       matches.*,
       courts.name AS court_name,
       arenas.name AS arena_name
     FROM matches
     LEFT JOIN courts ON courts.id = matches.court_id
     LEFT JOIN arenas ON arenas.id = matches.arena_id
     ${whereClause}
     ORDER BY
       CASE matches.status
         WHEN 'live' THEN 0
         WHEN 'upcoming' THEN 1
         WHEN 'finished' THEN 2
         ELSE 3
       END,
       matches.id`,
    params
  );

  return rows.map((row) => ({
    ...row,
    scheduled_at: toIso(row.scheduled_at),
    created_at: toIso(row.created_at),
    score1: parseJsonColumn(row.score1),
    score2: parseJsonColumn(row.score2),
  }));
}
export async function registerForCompetition(competitionId, actor) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (!actor?.arena_id || actor.effective_status !== "active") {
      await client.query("ROLLBACK");
      return { error: "Only active arena members can register" };
    }
    const competitionRows = await client.query("SELECT * FROM competitions WHERE id = $1 LIMIT 1", [competitionId]);
    const competition = competitionRows.rows[0];
    if (!competition) {
      await client.query("ROLLBACK");
      return { error: "Competition not found" };
    }
    if (Number(competition.arena_id) !== Number(actor.arena_id)) {
      await client.query("ROLLBACK");
      return { error: "You can only register for competitions in your arena" };
    }
    const existing = await client.query(
      `SELECT id
       FROM competition_registrations
       WHERE competition_id = $1 AND user_id = $2 AND status = 'registered'
       LIMIT 1`,
      [competitionId, actor.id]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return { error: "Already registered" };
    }
    const countRows = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM competition_registrations
       WHERE competition_id = $1 AND status = 'registered'`,
      [competitionId]
    );
    if (competition.status !== "open" || Number(countRows.rows[0]?.count ?? 0) >= Number(competition.max_participants ?? 0)) {
      await client.query("ROLLBACK");
      return { error: "Competition is full or closed" };
    }
    await client.query(
      `INSERT INTO competition_registrations (competition_id, user_id, status, created_at)
       VALUES ($1, $2, 'registered', NOW())`,
      [competitionId, actor.id]
    );
    await addActivityLog(client, { arenaId: actor.arena_id, actorUserId: actor.id, actorName: `${actor.first_name} ${actor.last_name}`, action: "Inscription tournoi", detail: competition.name });
    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function requestCoachRelationship(
  playerUserId,
  { coachUserId, startDate = null, endDate = null, notes = "", permissions = {}, consentVersion = 1 }
) {
  const player = await requireActiveActor(playerUserId);
  if (!player.arena_id) throw new Error("Player must belong to an arena");
  const coach = await findUserById(Number(coachUserId));
  if (!coach) throw new Error("Coach not found");
  if (Number(coach.arena_id) !== Number(player.arena_id)) throw new Error("Coach must be in the same arena");
  if (!["coach", "admin", "super_admin"].includes(coach.effective_role)) throw new Error("Selected user is not a coach");
  if (coach.effective_status !== "active") throw new Error("Selected coach is inactive");
  if (coach.id === player.id) throw new Error("You cannot request yourself as coach");

  const normalizedPermissions = normalizeRelationshipPermissions(permissions);
  const resolvedStartDate = startDate || new Date().toISOString().split("T")[0];
  if (endDate && endDate < resolvedStartDate) throw new Error("End date must be greater than or equal to start date");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      `SELECT id
       FROM coach_player_relationships
       WHERE coach_user_id = $1
         AND player_user_id = $2
         AND status IN ('pending', 'active', 'paused')
       ORDER BY updated_at DESC
       LIMIT 1`,
      [coach.id, player.id]
    );
    if (existing.rows[0]) throw new Error("A relationship request already exists with this coach");

    const inserted = await client.query(
      `INSERT INTO coach_player_relationships
        (arena_id, coach_user_id, player_user_id, status, requested_by_user_id, can_view_performance, can_view_reservations, can_schedule_sessions, can_view_notes, consent_version, start_date, end_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10::date, $11::date, $12, NOW(), NOW())
       RETURNING id`,
      [
        player.arena_id,
        coach.id,
        player.id,
        player.id,
        normalizedPermissions.canViewPerformance ? 1 : 0,
        normalizedPermissions.canViewReservations ? 1 : 0,
        normalizedPermissions.canScheduleSessions ? 1 : 0,
        normalizedPermissions.canViewNotes ? 1 : 0,
        Number(consentVersion) || 1,
        resolvedStartDate,
        endDate || null,
        String(notes || "").trim(),
      ]
    );
    await addActivityLog(client, { arenaId: player.arena_id, actorUserId: player.id, actorName: `${player.first_name} ${player.last_name}`, action: "Coach request", detail: `Player requested coach ${coach.first_name} ${coach.last_name}` });
    await client.query("COMMIT");
    const id = Number(inserted.rows[0].id);
    const { rows } = await pool.query(
      `SELECT links.*, CONCAT(coach.first_name, ' ', coach.last_name) AS coach_name, CONCAT(player.first_name, ' ', player.last_name) AS player_name
       FROM coach_player_relationships links
       JOIN users coach ON coach.id = links.coach_user_id
       JOIN users player ON player.id = links.player_user_id
       WHERE links.id = $1`,
      [id]
    );
    return normalizeRelationship(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function respondCoachRelationship(responderUserId, relationshipId, decision) {
  const responder = await requireActiveActor(responderUserId);
  const normalizedDecision = String(decision || "").toLowerCase();
  if (!["accept", "reject"].includes(normalizedDecision)) throw new Error("Decision must be accept or reject");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const relRes = await client.query("SELECT * FROM coach_player_relationships WHERE id = $1 LIMIT 1", [Number(relationshipId)]);
    const relationship = relRes.rows[0];
    if (!relationship) throw new Error("Relationship not found");
    const canRespond = responder.id === relationship.coach_user_id || (isAdminLike(responder) && Number(responder.arena_id) === Number(relationship.arena_id));
    if (!canRespond) throw new Error("You cannot respond to this relationship request");
    if (relationship.status !== "pending") throw new Error("Only pending requests can be responded to");
    const nextStatus = normalizedDecision === "accept" ? "active" : "rejected";
    await client.query(
      `UPDATE coach_player_relationships
       SET status = $1,
           responded_by_user_id = $2,
           responded_at = NOW(),
           consent_granted_at = CASE WHEN $1 = 'active' THEN NOW() ELSE consent_granted_at END,
           updated_at = NOW()
       WHERE id = $3`,
      [nextStatus, responder.id, relationship.id]
    );
    await addActivityLog(client, { arenaId: relationship.arena_id, actorUserId: responder.id, actorName: `${responder.first_name} ${responder.last_name}`, action: nextStatus === "active" ? "Coach request accepted" : "Coach request rejected", detail: `Relationship #${relationship.id}` });
    await client.query("COMMIT");
    const { rows } = await pool.query(
      `SELECT links.*, CONCAT(coach.first_name, ' ', coach.last_name) AS coach_name, CONCAT(player.first_name, ' ', player.last_name) AS player_name
       FROM coach_player_relationships links
       JOIN users coach ON coach.id = links.coach_user_id
       JOIN users player ON player.id = links.player_user_id
       WHERE links.id = $1`,
      [relationship.id]
    );
    return normalizeRelationship(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function tickLiveMatches() {
  const { rows } = await pool.query("SELECT id, score1, score2 FROM matches WHERE status = 'live'");

  for (const row of rows) {
    const score1 = parseJsonColumn(row.score1);
    const score2 = parseJsonColumn(row.score2);
    const lastIndex = Math.max(score1.length, score2.length) - 1;

    if (lastIndex < 0) continue;

    if (Math.random() > 0.5) {
      score1[lastIndex] = Math.min(7, Number(score1[lastIndex] ?? 0) + 1);
    } else {
      score2[lastIndex] = Math.min(7, Number(score2[lastIndex] ?? 0) + 1);
    }

    await pool.query("UPDATE matches SET score1 = $1, score2 = $2 WHERE id = $3", [JSON.stringify(score1), JSON.stringify(score2), row.id]);
  }
}
export async function upsertArenaSubscriptionFromProvider({ arenaId, planCode, status, provider = "stripe", providerCustomerId = null, providerSubscriptionId = null, currentPeriodStart = null, currentPeriodEnd = null, trialEnd = null, cancelAtPeriodEnd = false }) {
  const planResult = await pool.query("SELECT id FROM billing_plans WHERE code = $1 LIMIT 1", [planCode]);
  const planId = planResult.rows[0]?.id;
  if (!planId) throw new Error("Invalid billing plan");
  await pool.query(
    `INSERT INTO arena_subscriptions
      (arena_id, plan_id, status, provider, provider_customer_id, provider_subscription_id, current_period_start, current_period_end, trial_end, cancel_at_period_end, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::timestamp, $8::timestamp, $9::timestamp, $10, NOW(), NOW())`,
    [arenaId, planId, status, provider, providerCustomerId, providerSubscriptionId, currentPeriodStart, currentPeriodEnd, trialEnd, cancelAtPeriodEnd ? 1 : 0]
  );
  const { rows } = await pool.query(
    `SELECT id, arena_id, plan_id, status
     FROM arena_subscriptions
     WHERE arena_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [arenaId]
  );
  return rows[0] ?? null;
}

export async function updateMembershipStatus(actor, targetUserId, nextStatus) {
  if (!["active", "inactive"].includes(nextStatus)) throw new Error("Invalid status");
  if (!isAdminLike(actor)) throw new Error("Admin access required");
  if (actor.id === targetUserId) throw new Error("You cannot change your own status");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const target = await findUserById(targetUserId, client);
    if (!target) throw new Error("User not found");
    if (actor.effective_role === "admin") {
      if (target.platform_role === "super_admin" || target.membership_role === "admin") throw new Error("Only a super admin can activate or deactivate admins");
      if (Number(target.arena_id) !== Number(actor.arena_id)) throw new Error("You can only manage users in your arena");
    }
    if (target.platform_role === "super_admin") throw new Error("Super admin status cannot be changed here");
    await client.query("UPDATE users SET status = $1 WHERE id = $2", [nextStatus, targetUserId]);
    await client.query("UPDATE arena_memberships SET status = $1 WHERE user_id = $2", [nextStatus, targetUserId]);
    await addActivityLog(client, { arenaId: target.arena_id, actorUserId: actor.id, actorName: `${actor.first_name} ${actor.last_name}`, action: nextStatus === "active" ? "Compte reactive" : "Compte desactive", detail: `${target.first_name} ${target.last_name}` });
    await client.query("COMMIT");
    return findUserById(targetUserId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteUser(actor, targetUserId) {
  if (!isAdminLike(actor)) throw new Error("Admin access required");
  if (actor.id === targetUserId) throw new Error("You cannot delete your own account");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const target = await findUserById(targetUserId, client);
    if (!target) throw new Error("User not found");
    if (target.effective_status !== "inactive") throw new Error("Only inactive users can be deleted");
    if (actor.effective_role === "admin") {
      if (target.platform_role === "super_admin" || target.membership_role === "admin") throw new Error("Only a super admin can delete admins");
      if (Number(target.arena_id) !== Number(actor.arena_id)) throw new Error("You can only delete users in your arena");
    }
    if (target.platform_role === "super_admin") throw new Error("Super admin accounts cannot be deleted");
    await client.query("DELETE FROM reservation_participants WHERE user_id = $1", [targetUserId]);
    await client.query("DELETE FROM reservations WHERE user_id = $1", [targetUserId]);
    await client.query("DELETE FROM competition_registrations WHERE user_id = $1", [targetUserId]);
    await client.query("DELETE FROM performance_snapshots WHERE user_id = $1", [targetUserId]);
    await client.query("DELETE FROM performance_profiles WHERE user_id = $1", [targetUserId]);
    await client.query("DELETE FROM ai_analyses WHERE user_id = $1", [targetUserId]);
    await client.query("DELETE FROM activity_logs WHERE actor_user_id = $1", [targetUserId]);
    await client.query("DELETE FROM arena_memberships WHERE user_id = $1", [targetUserId]);
    await client.query("DELETE FROM users WHERE id = $1", [targetUserId]);
    await addActivityLog(client, { arenaId: target.arena_id, actorUserId: actor.id, actorName: `${actor.first_name} ${actor.last_name}`, action: "Compte supprime", detail: `${target.first_name} ${target.last_name}` });
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPlayerDashboardData(userId) {
  const matchStats = await pool.query(
    `SELECT
       COUNT(*)::int AS "totalMatches",
       SUM(CASE WHEN winner_team = (CASE WHEN team1_player1_id = $1 OR team1_player2_id = $1 THEN 1 ELSE 2 END) THEN 1 ELSE 0 END)::int AS wins,
       SUM(CASE WHEN winner_team != (CASE WHEN team1_player1_id = $1 OR team1_player2_id = $1 THEN 1 ELSE 2 END) THEN 1 ELSE 0 END)::int AS losses
     FROM matches
     WHERE (team1_player1_id = $1 OR team1_player2_id = $1 OR team2_player1_id = $1 OR team2_player2_id = $1)
       AND status = 'finished'`,
    [userId]
  );
  const upcoming = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM reservations
     WHERE id IN (SELECT reservation_id FROM reservation_participants WHERE user_id = $1)
       AND reservation_date >= CURRENT_DATE
       AND status = 'confirmed'`,
    [userId]
  );
  const ranking = await pool.query(
    `SELECT ranking_score
     FROM performance_snapshots
     WHERE user_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [userId]
  );
  const stats = matchStats.rows[0] || { totalMatches: 0, wins: 0, losses: 0 };
  const totalMatches = Number(stats.totalMatches ?? 0);
  const wins = Number(stats.wins ?? 0);
  const losses = Number(stats.losses ?? 0);
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  return { totalMatches, winRate: `${winRate}%`, ranking: Number(ranking.rows[0]?.ranking_score ?? 1000), upcomingBookings: Number(upcoming.rows[0]?.count ?? 0), wins, losses };
}
export async function listPlayerMatches(userId) {
  const { rows } = await pool.query(
    `SELECT
       matches.*,
       courts.name AS court_name,
       arenas.name AS arena_name
     FROM matches
     JOIN courts ON courts.id = matches.court_id
     JOIN arenas ON arenas.id = matches.arena_id
     WHERE (
       matches.team1_player1_id = $1 OR
       matches.team1_player2_id = $1 OR
       matches.team2_player1_id = $1 OR
       matches.team2_player2_id = $1
     )
     ORDER BY matches.scheduled_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    ...row,
    scheduled_at: toIso(row.scheduled_at),
    created_at: toIso(row.created_at),
    score1: parseJsonColumn(row.score1),
    score2: parseJsonColumn(row.score2),
  }));
}
export async function finalizeMatch(reservationId, score1, score2) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const reservationQuery = await client.query(
      `SELECT reservations.*, courts.arena_id
       FROM reservations
       JOIN courts ON courts.id = reservations.court_id
       WHERE reservations.id = $1 AND reservations.status = 'confirmed'
       LIMIT 1`,
      [reservationId]
    );
    const reservation = reservationQuery.rows[0];
    if (!reservation) throw new Error("Reservation non trouvee ou deja terminee");

    const s1 = Array.isArray(score1) ? score1 : [0];
    const s2 = Array.isArray(score2) ? score2 : [0];
    const sum1 = s1.reduce((a, b) => a + Number(b ?? 0), 0);
    const sum2 = s2.reduce((a, b) => a + Number(b ?? 0), 0);
    const winnerTeam = sum1 > sum2 ? 1 : sum2 > sum1 ? 2 : 0;

    const participantsQuery = await client.query(
      `SELECT user_id FROM reservation_participants WHERE reservation_id = $1 ORDER BY id ASC`,
      [reservationId]
    );
    const playerIds = participantsQuery.rows.map((row) => Number(row.user_id));
    const splitIndex = Math.ceil(playerIds.length / 2);
    const team1Ids = playerIds.slice(0, splitIndex);
    const team2Ids = playerIds.slice(splitIndex);

    await client.query(
      `INSERT INTO matches
        (reservation_id, court_id, arena_id, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, score1, score2, winner_team, status, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'finished', $11)`,
      [
        reservationId,
        reservation.court_id,
        reservation.arena_id,
        team1Ids[0] ?? null,
        team1Ids[1] ?? null,
        team2Ids[0] ?? null,
        team2Ids[1] ?? null,
        JSON.stringify(s1),
        JSON.stringify(s2),
        winnerTeam,
        `${String(reservation.reservation_date).slice(0, 10)} ${String(reservation.start_time).slice(0, 8)}`,
      ]
    );

    await client.query("UPDATE reservations SET status = 'completed' WHERE id = $1", [reservationId]);

    for (const playerId of playerIds) {
      const isWinner = (winnerTeam === 1 && team1Ids.includes(playerId)) || (winnerTeam === 2 && team2Ids.includes(playerId));
      const latestQuery = await client.query(
        `SELECT ranking_score, wins, losses
         FROM performance_snapshots
         WHERE user_id = $1
         ORDER BY id DESC
         LIMIT 1`,
        [playerId]
      );
      const latest = latestQuery.rows[0];
      const oldScore = Number(latest?.ranking_score ?? 1000);
      const oldWins = Number(latest?.wins ?? 0);
      const oldLosses = Number(latest?.losses ?? 0);

      await client.query(
        `INSERT INTO performance_snapshots (user_id, ranking_score, wins, losses, streak, snapshot_date)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
        [
          playerId,
          isWinner ? oldScore + 50 : Math.max(0, oldScore - 20),
          isWinner ? oldWins + 1 : oldWins,
          isWinner ? oldLosses : oldLosses + 1,
          isWinner ? "WIN" : "LOSS",
        ]
      );
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function createOrUpdateCoachRelationshipSeed({ coachUserId, playerUserId, status = "active", requestedByUserId = null, startDate = null, endDate = null, notes = "Seeded relationship" }) {
  const coach = await findUserById(Number(coachUserId));
  const player = await findUserById(Number(playerUserId));
  if (!coach || !player) throw new Error("Seed relationship users not found");
  const resolvedStartDate = startDate || new Date().toISOString().split("T")[0];
  const existing = await pool.query(
    `SELECT id
     FROM coach_player_relationships
     WHERE coach_user_id = $1
       AND player_user_id = $2
     ORDER BY id DESC
     LIMIT 1`,
    [coach.id, player.id]
  );
  if (existing.rows[0]) {
    await pool.query(
      `UPDATE coach_player_relationships
       SET status = $1,
           requested_by_user_id = $2,
           start_date = $3::date,
           end_date = $4::date,
           notes = $5,
           consent_granted_at = CASE WHEN $1 = 'active' THEN NOW() ELSE consent_granted_at END,
           updated_at = NOW()
       WHERE id = $6`,
      [status, requestedByUserId || player.id, resolvedStartDate, endDate || null, String(notes || "").trim(), existing.rows[0].id]
    );
    return existing.rows[0].id;
  }
  const inserted = await pool.query(
    `INSERT INTO coach_player_relationships
      (arena_id, coach_user_id, player_user_id, status, requested_by_user_id, can_view_performance, can_view_reservations, can_schedule_sessions, can_view_notes, consent_version, consent_granted_at, start_date, end_date, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 1, 1, 1, 0, 1, CASE WHEN $4 = 'active' THEN NOW() ELSE NULL END, $6::date, $7::date, $8, NOW(), NOW())
     RETURNING id`,
    [player.arena_id, coach.id, player.id, status, requestedByUserId || player.id, resolvedStartDate, endDate || null, String(notes || "").trim()]
  );
  return inserted.rows[0].id;
}

export async function updateCoachRelationshipSettings(actorUserId, relationshipId, { status, endDate, permissions, notes }) {
  const actor = await requireActiveActor(actorUserId);
  const relRows = await pool.query("SELECT * FROM coach_player_relationships WHERE id = $1 LIMIT 1", [Number(relationshipId)]);
  const relationship = relRows.rows[0];
  if (!relationship) throw new Error("Relationship not found");
  const isOwner = actor.id === relationship.player_user_id || actor.id === relationship.coach_user_id;
  const isArenaAdmin = isAdminLike(actor) && Number(actor.arena_id) === Number(relationship.arena_id);
  if (!isOwner && !isArenaAdmin) throw new Error("Not allowed to update this relationship");

  const updates = [];
  const params = [];
  if (status) {
    const allowedStatuses = ["active", "paused", "ended"];
    if (!allowedStatuses.includes(status)) throw new Error("Invalid relationship status");
    updates.push(`status = $${params.length + 1}`);
    params.push(status);
  }
  if (typeof endDate !== "undefined") {
    updates.push(`end_date = $${params.length + 1}::date`);
    params.push(endDate || null);
  }
  if (typeof notes !== "undefined") {
    updates.push(`notes = $${params.length + 1}`);
    params.push(String(notes || "").trim());
  }
  if (permissions && typeof permissions === "object") {
    const normalizedPermissions = normalizeRelationshipPermissions(permissions);
    updates.push(`can_view_performance = $${params.length + 1}`);
    params.push(normalizedPermissions.canViewPerformance ? 1 : 0);
    updates.push(`can_view_reservations = $${params.length + 1}`);
    params.push(normalizedPermissions.canViewReservations ? 1 : 0);
    updates.push(`can_schedule_sessions = $${params.length + 1}`);
    params.push(normalizedPermissions.canScheduleSessions ? 1 : 0);
    updates.push(`can_view_notes = $${params.length + 1}`);
    params.push(normalizedPermissions.canViewNotes ? 1 : 0);
  }
  if (!updates.length) throw new Error("No changes submitted");
  updates.push("updated_at = NOW()");
  params.push(Number(relationshipId));
  await pool.query(`UPDATE coach_player_relationships SET ${updates.join(", ")} WHERE id = $${params.length}`, params);
  const { rows } = await pool.query(
    `SELECT links.*, CONCAT(coach.first_name, ' ', coach.last_name) AS coach_name, CONCAT(player.first_name, ' ', player.last_name) AS player_name
     FROM coach_player_relationships links
     JOIN users coach ON coach.id = links.coach_user_id
     JOIN users player ON player.id = links.player_user_id
     WHERE links.id = $1`,
    [Number(relationshipId)]
  );
  return normalizeRelationship(rows[0]);
}

export async function createCoachSession(
  coachUserId,
  { courtId, reservationDate, startTime, endTime, studentIds, title = "Training Session", sessionType = "individual", focusAreas = "", notes = "" }
) {
  const actor = await getCoachActor(coachUserId);
  const normalizedStudentIds = [...new Set((Array.isArray(studentIds) ? studentIds : []).map(Number).filter((id) => Number.isFinite(id) && id > 0))];
  if (!courtId || !reservationDate || !startTime || !endTime || !normalizedStudentIds.length) throw new Error("Court, date, times, and at least one student are required");
  const court = await getCourtById(Number(courtId));
  if (!court) throw new Error("Court not found");
  if (Number(court.arena_id) !== Number(actor.arena_id)) throw new Error("You can only schedule sessions in your arena");

  const placeholders = normalizedStudentIds.map((_, index) => `$${index + 2}`).join(", ");
  const { rows: studentRows } = await pool.query(
    `SELECT users.id, users.email, users.first_name, users.last_name, links.can_schedule_sessions
     FROM users
     JOIN arena_memberships ON arena_memberships.user_id = users.id
     JOIN coach_player_relationships links
       ON links.player_user_id = users.id
      AND links.coach_user_id = $1
      AND links.status = 'active'
      AND links.start_date <= CURRENT_DATE
      AND (links.end_date IS NULL OR links.end_date >= CURRENT_DATE)
     WHERE users.id IN (${placeholders})
       AND arena_memberships.arena_id = $${normalizedStudentIds.length + 2}
       AND arena_memberships.role = 'player'
       AND arena_memberships.status = 'active'
       AND users.status = 'active'`,
    [actor.id, ...normalizedStudentIds, actor.arena_id]
  );
  if (studentRows.length !== normalizedStudentIds.length) throw new Error("Every selected student must be actively assigned to this coach");
  const denied = studentRows.find((row) => !row.can_schedule_sessions);
  if (denied) throw new Error("One or more players have not granted session scheduling permission");
  const participantCount = studentRows.length + 1;
  if (participantCount < Number(court.min_players) || participantCount > Number(court.max_players)) throw new Error(`This court accepts between ${court.min_players} and ${court.max_players} players`);

  const reservation = await createReservation({
    userId: actor.id,
    courtId: Number(courtId),
    reservationDate,
    startTime,
    endTime,
    qrToken: `coach-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    notes: `[Coach Session] ${title}${notes ? ` - ${notes}` : ""}`,
    participantEmails: studentRows.map((student) => student.email),
  });

  const inserted = await pool.query(
    `INSERT INTO training_sessions (arena_id, coach_user_id, reservation_id, session_type, title, focus_areas, notes, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', NOW())
     RETURNING id`,
    [actor.arena_id, actor.id, reservation.id, sessionType, String(title).trim(), String(focusAreas || "").trim(), String(notes || "").trim()]
  );
  const sessionId = Number(inserted.rows[0].id);
  const { rows } = await pool.query(
    `SELECT
       training_sessions.id,
       training_sessions.session_type,
       training_sessions.title,
       training_sessions.focus_areas,
       training_sessions.notes,
       training_sessions.status,
       training_sessions.created_at,
       reservations.id AS reservation_id,
       reservations.reservation_date,
       reservations.start_time,
       reservations.end_time,
       courts.id AS court_id,
       courts.name AS court_name,
       arenas.name AS arena_name,
       COALESCE(
         json_agg(json_build_object('id', participants.id, 'firstName', participants.first_name, 'lastName', participants.last_name, 'email', participants.email))
         FILTER (WHERE participants.id IS NOT NULL AND participants.id <> training_sessions.coach_user_id),
         '[]'::json
       ) AS students
     FROM training_sessions
     JOIN reservations ON reservations.id = training_sessions.reservation_id
     JOIN courts ON courts.id = reservations.court_id
     JOIN arenas ON arenas.id = courts.arena_id
     LEFT JOIN reservation_participants ON reservation_participants.reservation_id = reservations.id
     LEFT JOIN users AS participants ON participants.id = reservation_participants.user_id
     WHERE training_sessions.id = $1
     GROUP BY training_sessions.id, reservations.id, courts.id, arenas.name`,
    [sessionId]
  );
  const row = rows[0];
  return {
    id: row.id,
    sessionType: row.session_type,
    title: row.title,
    focusAreas: row.focus_areas,
    notes: row.notes,
    status: row.status,
    createdAt: toIso(row.created_at),
    reservationId: row.reservation_id,
    reservationDate: String(row.reservation_date).split("T")[0],
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    court: { id: row.court_id, name: row.court_name, arenaName: row.arena_name },
    students: parseJsonColumn(row.students),
  };
}

export async function listCoachSessions(coachUserId) {
  const actor = await getCoachActor(coachUserId);
  const params = [];
  let whereClause = "";
  if (actor.effective_role === "coach") {
    params.push(actor.id);
    whereClause = `WHERE training_sessions.coach_user_id = $${params.length}`;
  } else {
    params.push(actor.arena_id);
    whereClause = `WHERE training_sessions.arena_id = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT
       training_sessions.id,
       training_sessions.coach_user_id,
       training_sessions.session_type,
       training_sessions.title,
       training_sessions.focus_areas,
       training_sessions.notes,
       training_sessions.status,
       training_sessions.created_at,
       reservations.id AS reservation_id,
       reservations.reservation_date,
       reservations.start_time,
       reservations.end_time,
       courts.id AS court_id,
       courts.name AS court_name,
       arenas.name AS arena_name,
       coach.first_name AS coach_first_name,
       coach.last_name AS coach_last_name,
       COALESCE(
         json_agg(json_build_object('id', participants.id, 'firstName', participants.first_name, 'lastName', participants.last_name, 'email', participants.email))
         FILTER (WHERE participants.id IS NOT NULL AND participants.id <> training_sessions.coach_user_id),
         '[]'::json
       ) AS students
     FROM training_sessions
     JOIN reservations ON reservations.id = training_sessions.reservation_id
     JOIN courts ON courts.id = reservations.court_id
     JOIN arenas ON arenas.id = courts.arena_id
     JOIN users AS coach ON coach.id = training_sessions.coach_user_id
     LEFT JOIN reservation_participants ON reservation_participants.reservation_id = reservations.id
     LEFT JOIN users AS participants ON participants.id = reservation_participants.user_id
     ${whereClause}
     GROUP BY
       training_sessions.id,
       training_sessions.coach_user_id,
       training_sessions.session_type,
       training_sessions.title,
       training_sessions.focus_areas,
       training_sessions.notes,
       training_sessions.status,
       training_sessions.created_at,
       reservations.id,
       reservations.reservation_date,
       reservations.start_time,
       reservations.end_time,
       courts.id,
       courts.name,
       arenas.name,
       coach.first_name,
       coach.last_name
     ORDER BY reservations.reservation_date DESC, reservations.start_time DESC`,
    params
  );
  return rows.map((row) => ({
    id: row.id,
    coachUserId: row.coach_user_id,
    coachName: `${row.coach_first_name} ${row.coach_last_name}`,
    sessionType: row.session_type,
    title: row.title,
    focusAreas: row.focus_areas,
    notes: row.notes,
    status: row.status,
    createdAt: toIso(row.created_at),
    reservationId: row.reservation_id,
    reservationDate: String(row.reservation_date).split("T")[0],
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    court: {
      id: row.court_id,
      name: row.court_name,
      arenaName: row.arena_name,
    },
    students: parseJsonColumn(row.students),
  }));
}
