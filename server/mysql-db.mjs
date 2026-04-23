import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE ?? "ultima_demo",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  timezone: "Z",
});

const toIso = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
};

const normalizeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    password_hash: user.password_hash,
    role: user.role,
    status: user.status,
    created_at: toIso(user.created_at),
  };
};

const parseJsonColumn = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }

  return [];
};

export async function initializeDatabase() {
  const connection = await pool.getConnection();

  try {
    await connection.query("SELECT 1");

    const [rows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN (
           'users',
           'courts',
           'reservations',
           'competitions',
           'competition_registrations',
           'matches',
           'performance_snapshots',
           'performance_profiles',
           'ai_analyses',
           'activity_logs'
         )`
    );

    if (rows[0].count < 10) {
      throw new Error("Required MySQL tables are missing. Import database/mysql_demo_dump.sql into your MySQL database first.");
    }
  } finally {
    connection.release();
  }
}

export async function listCourts() {
  const [rows] = await pool.query("SELECT * FROM courts ORDER BY id");
  return rows;
}

export async function getCourtById(id) {
  const [rows] = await pool.query("SELECT * FROM courts WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

export async function listReservationsForUser(userId) {
  const [rows] = await pool.query(
    `SELECT
       reservations.*,
       courts.name AS court_name,
       courts.sport
     FROM reservations
     JOIN courts ON courts.id = reservations.court_id
     WHERE reservations.user_id = ?
     ORDER BY reservations.reservation_date DESC, reservations.start_time DESC`,
    [userId]
  );

  return rows.map((row) => ({
    ...row,
    created_at: toIso(row.created_at),
  }));
}

export async function hasReservationConflict(courtId, reservationDate, startTime, endTime) {
  const [rows] = await pool.query(
    `SELECT id
     FROM reservations
     WHERE court_id = ?
       AND reservation_date = ?
       AND status = 'confirmed'
       AND NOT (end_time <= ? OR start_time >= ?)
     LIMIT 1`,
    [courtId, reservationDate, startTime, endTime]
  );

  return rows.length > 0;
}

export async function createReservation({ userId, courtId, reservationDate, startTime, endTime, qrToken, notes = "" }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO reservations
        (user_id, court_id, reservation_date, start_time, end_time, status, qr_token, notes, created_at)
       VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, NOW(3))`,
      [userId, courtId, reservationDate, startTime, endTime, qrToken, notes]
    );

    await connection.query(
      `INSERT INTO activity_logs (action, actor_name, detail, created_at)
       VALUES (?, ?, ?, NOW(3))`,
      ["Reservation confirmee", `Utilisateur #${userId}`, `${reservationDate} ${startTime} - Court #${courtId}`]
    );

    await connection.commit();

    const [rows] = await connection.query(
      `SELECT
         reservations.*,
         courts.name AS court_name,
         courts.sport
       FROM reservations
       JOIN courts ON courts.id = reservations.court_id
       WHERE reservations.id = ?`,
      [result.insertId]
    );

    return {
      ...rows[0],
      created_at: toIso(rows[0].created_at),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelReservation(id, userId) {
  const [result] = await pool.query(
    `UPDATE reservations
     SET status = 'cancelled'
     WHERE id = ? AND user_id = ?`,
    [id, userId]
  );

  return { changes: result.affectedRows };
}

export async function listCompetitions() {
  const [rows] = await pool.query(
    `SELECT
       competitions.*,
       COUNT(competition_registrations.id) AS participants
     FROM competitions
     LEFT JOIN competition_registrations
       ON competition_registrations.competition_id = competitions.id
       AND competition_registrations.status = 'registered'
     GROUP BY competitions.id
     ORDER BY competitions.start_date ASC`
  );

  return rows.map((row) => ({
    ...row,
    created_at: toIso(row.created_at),
  }));
}

export async function registerForCompetition(competitionId, userId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [competitionRows] = await connection.query(
      "SELECT * FROM competitions WHERE id = ? LIMIT 1",
      [competitionId]
    );
    const competition = competitionRows[0];
    if (!competition) {
      await connection.rollback();
      return { error: "Competition not found" };
    }

    const [existingRows] = await connection.query(
      `SELECT id
       FROM competition_registrations
       WHERE competition_id = ? AND user_id = ? AND status = 'registered'
       LIMIT 1`,
      [competitionId, userId]
    );
    if (existingRows.length > 0) {
      await connection.rollback();
      return { error: "Already registered" };
    }

    const [countRows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM competition_registrations
       WHERE competition_id = ? AND status = 'registered'`,
      [competitionId]
    );
    if (competition.status !== "open" || countRows[0].count >= competition.max_participants) {
      await connection.rollback();
      return { error: "Competition is full or closed" };
    }

    await connection.query(
      `INSERT INTO competition_registrations (competition_id, user_id, status, created_at)
       VALUES (?, ?, 'registered', NOW(3))`,
      [competitionId, userId]
    );

    await connection.query(
      `INSERT INTO activity_logs (action, actor_name, detail, created_at)
       VALUES (?, ?, ?, NOW(3))`,
      ["Inscription tournoi", `Utilisateur #${userId}`, competition.name]
    );

    await connection.commit();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getLeaderboard() {
  const [rows] = await pool.query(
    `SELECT
       ROW_NUMBER() OVER (ORDER BY MAX(performance_snapshots.ranking_score) DESC) AS \`rank\`,
       CONCAT(users.first_name, ' ', LEFT(users.last_name, 1), '.') AS name,
       MAX(performance_snapshots.ranking_score) AS points,
       SUM(performance_snapshots.wins) AS wins,
       SUM(performance_snapshots.losses) AS losses
     FROM users
     JOIN performance_snapshots ON performance_snapshots.user_id = users.id
     GROUP BY users.id
     ORDER BY points DESC
     LIMIT 5`
  );

  return rows;
}

export async function listMatches() {
  const [rows] = await pool.query(
    `SELECT
       matches.*,
       courts.name AS court_name
     FROM matches
     LEFT JOIN courts ON courts.id = matches.court_id
     ORDER BY
       FIELD(matches.status, 'live', 'upcoming', 'finished'),
       matches.id`
  );

  return rows.map((row) => ({
    ...row,
    scheduled_at: toIso(row.scheduled_at),
    created_at: toIso(row.created_at),
    score1: parseJsonColumn(row.score1),
    score2: parseJsonColumn(row.score2),
  }));
}

export async function tickLiveMatches() {
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query(
      "SELECT id, score1, score2, status FROM matches WHERE status = 'live'"
    );

    for (const row of rows) {
      const score1 = parseJsonColumn(row.score1);
      const score2 = parseJsonColumn(row.score2);
      const lastIndex = Math.max(score1.length, score2.length) - 1;
      if (lastIndex < 0) {
        continue;
      }

      if (Math.random() > 0.5) {
        score1[lastIndex] = Math.min(7, Number(score1[lastIndex] ?? 0) + 1);
      } else {
        score2[lastIndex] = Math.min(7, Number(score2[lastIndex] ?? 0) + 1);
      }

      await connection.query(
        "UPDATE matches SET score1 = ?, score2 = ? WHERE id = ?",
        [JSON.stringify(score1), JSON.stringify(score2), row.id]
      );
    }
  } finally {
    connection.release();
  }
}

export async function findUserByEmail(email) {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  return normalizeUser(rows[0]);
}

export async function createUser({ firstName, lastName, email, passwordHash, role }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO users
        (first_name, last_name, email, password_hash, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW(3))`,
      [firstName, lastName, email, passwordHash, role]
    );

    await connection.query(
      `INSERT INTO activity_logs (action, actor_name, detail, created_at)
       VALUES (?, ?, ?, NOW(3))`,
      ["Nouveau compte", `${firstName} ${lastName}`, `Role: ${role}`]
    );

    await connection.commit();

    const [rows] = await connection.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
    return normalizeUser(rows[0]);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: toIso(user.created_at),
  };
}

export async function getAdminOverview() {
  const [statsRows] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM competitions WHERE status = 'open') AS activeCompetitions,
       (SELECT COUNT(*) FROM competition_registrations) AS totalRegistrations,
       (SELECT COUNT(*) FROM matches) AS matchesThisWeek`
  );
  const [userRows] = await pool.query(
    `SELECT id, first_name, last_name, email, role, status, created_at
     FROM users
     ORDER BY id ASC`
  );
  const [courtRows] = await pool.query("SELECT * FROM courts ORDER BY id");
  const [logRows] = await pool.query(
    `SELECT *
     FROM activity_logs
     ORDER BY created_at DESC
     LIMIT 10`
  );

  return {
    stats: statsRows[0],
    users: userRows.map((row) => ({ ...row, created_at: toIso(row.created_at) })),
    courts: courtRows.map((row) => ({ ...row, created_at: toIso(row.created_at) })),
    logs: logRows.map((row) => ({ ...row, created_at: toIso(row.created_at) })),
  };
}

export async function getPerformanceForUser(userId) {
  const [snapshotRows] = await pool.query(
    `SELECT week_label, ranking_score, wins, losses, created_at
     FROM performance_snapshots
     WHERE user_id = ?
     ORDER BY id ASC`,
    [userId]
  );
  const [profileRows] = await pool.query(
    `SELECT service, return_skill, volley, endurance, strategy, mental, updated_at
     FROM performance_profiles
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  const latest = snapshotRows.at(-1) ?? null;
  const profile = profileRows[0] ?? null;

  return {
    summary: latest
      ? {
          rankingScore: latest.ranking_score,
          winRate: `${Math.max(60, 70 + snapshotRows.length)}%`,
          streak: `${Math.min(5, snapshotRows.length)} victoires`,
          matchesThisMonth: snapshotRows.length,
        }
      : null,
    progress: snapshotRows.map((row) => ({
      semaine: row.week_label,
      score: row.ranking_score,
      victoires: row.wins,
      defaites: row.losses,
    })),
    radar: profile
      ? [
          { skill: "Service", value: profile.service },
          { skill: "Retour", value: profile.return_skill },
          { skill: "Volee", value: profile.volley },
          { skill: "Endurance", value: profile.endurance },
          { skill: "Strategie", value: profile.strategy },
          { skill: "Mental", value: profile.mental },
        ]
      : [],
  };
}

export async function listAnalysesForUser(userId) {
  const [rows] = await pool.query(
    `SELECT id, title, video_name AS videoName, status, summary, created_at AS createdAt
     FROM ai_analyses
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({ ...row, createdAt: toIso(row.createdAt) }));
}

export async function createAnalysis({ userId, title, videoName }) {
  const [result] = await pool.query(
    `INSERT INTO ai_analyses (user_id, title, video_name, status, summary, created_at)
     VALUES (?, ?, ?, 'queued', ?, NOW(3))`,
    [userId, title, videoName, "Analyse planifiee pour le moteur SmartPlay AI."]
  );

  const [rows] = await pool.query(
    `SELECT id, title, video_name AS videoName, status, summary, created_at AS createdAt
     FROM ai_analyses
     WHERE id = ?`,
    [result.insertId]
  );

  return {
    ...rows[0],
    createdAt: toIso(rows[0].createdAt),
  };
}

export async function closePool() {
  await pool.end();
}
