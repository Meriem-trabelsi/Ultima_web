import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dbFile = path.join(dataDir, "ultima-demo.json");

fs.mkdirSync(dataDir, { recursive: true });

const now = () => new Date().toISOString();

let state = null;

function createEmptyState() {
  return {
    users: [],
    courts: [],
    reservations: [],
    competitions: [],
    competitionRegistrations: [],
    matches: [],
    performanceSnapshots: [],
    performanceProfiles: [],
    aiAnalyses: [],
    activityLogs: [],
    nextIds: {
      users: 1,
      courts: 1,
      reservations: 1,
      competitions: 1,
      competitionRegistrations: 1,
      matches: 1,
      performanceSnapshots: 1,
      aiAnalyses: 1,
      activityLogs: 1,
    },
  };
}

function loadState() {
  if (!fs.existsSync(dbFile)) {
    state = createEmptyState();
    return;
  }

  state = JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

function saveState() {
  fs.writeFileSync(dbFile, JSON.stringify(state, null, 2));
}

function nextId(key) {
  const id = state.nextIds[key];
  state.nextIds[key] += 1;
  return id;
}

function seedDatabase() {
  if (state.users.length > 0) {
    return;
  }

  const users = [
    { first_name: "Ahmed", last_name: "Bouazizi", email: "ahmed@email.com", role: "player", status: "active" },
    { first_name: "Imed", last_name: "Trabelsi", email: "sami@email.com", role: "coach", status: "active" },
    { first_name: "Meryam", last_name: "Trbsli", email: "mariem@email.com", role: "player", status: "inactive" },
    { first_name: "Youssef", last_name: "Khelifi", email: "youssef@email.com", role: "player", status: "active" },
    { first_name: "Aziz", last_name: "Ferchichi", email: "aziz@email.com", role: "admin", status: "active" },
  ];

  users.forEach((user) => {
    state.users.push({
      id: nextId("users"),
      ...user,
      password_hash: bcrypt.hashSync("demo12345", 10),
      created_at: now(),
    });
  });

  [
    { name: "Terrain Padel A", sport: "Padel", status: "available", has_summa: 0, location: "ULTIMA Arena" },
    { name: "Terrain Padel B", sport: "Padel", status: "available", has_summa: 0, location: "ULTIMA Arena" },
    { name: "Terrain Tennis 1", sport: "Tennis", status: "occupied", has_summa: 0, location: "Court Central" },
    { name: "Terrain Tennis 2", sport: "Tennis", status: "available", has_summa: 0, location: "Court Central" },
    { name: "Terrain Padel C (SUMMA)", sport: "Padel", status: "available", has_summa: 1, location: "ULTIMA Arena" },
    { name: "Terrain Tennis 3 (SUMMA)", sport: "Tennis", status: "available", has_summa: 1, location: "Court Central" },
  ].forEach((court) => {
    state.courts.push({
      id: nextId("courts"),
      ...court,
      created_at: now(),
    });
  });

  [
    {
      name: "Tournoi Padel Printemps 2026",
      sport: "Padel",
      description: "Tournoi de demonstration ULTIMA pour les joueurs confirmes.",
      start_date: "2026-03-15",
      location: "ULTIMA Arena",
      max_participants: 32,
      status: "open",
    },
    {
      name: "Open Tennis La Marsa",
      sport: "Tennis",
      description: "Competition open avec diffusion des scores en direct.",
      start_date: "2026-04-22",
      location: "Court Central",
      max_participants: 32,
      status: "open",
    },
    {
      name: "Championnat Interclubs",
      sport: "Padel & Tennis",
      description: "Tournoi complet reserve aux clubs partenaires.",
      start_date: "2026-05-10",
      location: "ULTIMA Arena",
      max_participants: 32,
      status: "full",
    },
    {
      name: "Tournoi Junior Padel",
      sport: "Padel",
      description: "Competition junior dediee a la detection de talents.",
      start_date: "2026-06-05",
      location: "Terrain B",
      max_participants: 16,
      status: "open",
    },
  ].forEach((competition) => {
    state.competitions.push({
      id: nextId("competitions"),
      ...competition,
      created_at: now(),
    });
  });

  const playerIds = state.users.filter((user) => user.role !== "admin").map((user) => user.id);
  state.competitions.forEach((competition) => {
    const seedCount = Math.min(playerIds.length, Math.max(2, Math.floor(competition.max_participants * 0.4)));
    for (let index = 0; index < seedCount; index += 1) {
      state.competitionRegistrations.push({
        id: nextId("competitionRegistrations"),
        competition_id: competition.id,
        user_id: playerIds[index % playerIds.length],
        status: "registered",
        created_at: now(),
      });
    }
  });

  const courtByName = (name) => state.courts.find((court) => court.name === name)?.id ?? null;
  [
    {
      competition_id: 1,
      court_id: courtByName("Terrain Padel C (SUMMA)"),
      player1_name: "Ahmed B.",
      player2_name: "Sami T.",
      status: "live",
      current_set: 3,
      scheduled_at: "2026-04-02T14:00:00.000Z",
      score1: [6, 4, 2],
      score2: [3, 6, 1],
    },
    {
      competition_id: 2,
      court_id: courtByName("Terrain Tennis 1"),
      player1_name: "Youssef K.",
      player2_name: "Meryam T.",
      status: "live",
      current_set: 2,
      scheduled_at: "2026-04-02T15:00:00.000Z",
      score1: [6, 3],
      score2: [2, 5],
    },
    {
      competition_id: 1,
      court_id: courtByName("Terrain Padel A"),
      player1_name: "Aziz F.",
      player2_name: "Nabil M.",
      status: "finished",
      current_set: 2,
      scheduled_at: "2026-04-02T11:00:00.000Z",
      score1: [6, 6],
      score2: [4, 3],
    },
    {
      competition_id: 2,
      court_id: courtByName("Terrain Tennis 2"),
      player1_name: "Ines R.",
      player2_name: "Leila B.",
      status: "upcoming",
      current_set: 1,
      scheduled_at: "2026-04-02T18:00:00.000Z",
      score1: [0],
      score2: [0],
    },
  ].forEach((match) => {
    state.matches.push({
      id: nextId("matches"),
      ...match,
      created_at: now(),
    });
  });

  ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].forEach((week, index) => {
    state.performanceSnapshots.push({
      id: nextId("performanceSnapshots"),
      user_id: 1,
      week_label: week,
      ranking_score: 1050 + index * 35 + (index > 3 ? 25 : 0),
      wins: 3 + Math.floor(index / 2),
      losses: index % 3,
      created_at: now(),
    });
  });

  state.performanceProfiles.push({
    user_id: 1,
    service: 85,
    return_skill: 72,
    volley: 90,
    endurance: 68,
    strategy: 78,
    mental: 82,
    updated_at: now(),
  });

  state.aiAnalyses.push({
    id: nextId("aiAnalyses"),
    user_id: 1,
    title: "Analyse Match Demo",
    video_name: "match-demo.mp4",
    status: "completed",
    summary: "Heatmaps generees, patterns de deplacement detectes et recommandations pretes.",
    created_at: now(),
  });

  [
    ["Reservation confirmee", "Ahmed B.", "Terrain Padel A - 15:30"],
    ["Inscription tournoi", "Sami T.", "Open Tennis La Marsa"],
    ["Score mis a jour", "Systeme SUMMA", "Terrain Padel C (SUMMA)"],
    ["Nouveau compte", "Ines R.", "Role: Joueur"],
    ["Match termine", "Systeme", "Aziz F. vs Nabil M."],
  ].forEach(([action, actor_name, detail]) => {
    state.activityLogs.push({
      id: nextId("activityLogs"),
      action,
      actor_name,
      detail,
      created_at: now(),
    });
  });

  saveState();
}

export function initializeDatabase() {
  loadState();
  seedDatabase();
}

export function listCourts() {
  return state.courts;
}

export function getCourtById(id) {
  return state.courts.find((court) => court.id === id) ?? null;
}

export function listReservationsForUser(userId) {
  return state.reservations
    .filter((reservation) => reservation.user_id === userId)
    .map((reservation) => {
      const court = getCourtById(reservation.court_id);
      return {
        ...reservation,
        court_name: court?.name ?? "Unknown court",
        sport: court?.sport ?? "Unknown sport",
      };
    })
    .sort((a, b) => `${b.reservation_date}${b.start_time}`.localeCompare(`${a.reservation_date}${a.start_time}`));
}

export function hasReservationConflict(courtId, reservationDate, startTime, endTime) {
  return state.reservations.some((reservation) => (
    reservation.court_id === courtId &&
    reservation.reservation_date === reservationDate &&
    reservation.status === "confirmed" &&
    !(reservation.end_time <= startTime || reservation.start_time >= endTime)
  ));
}

export function createReservation({ userId, courtId, reservationDate, startTime, endTime, qrToken, notes = "" }) {
  const reservation = {
    id: nextId("reservations"),
    user_id: userId,
    court_id: courtId,
    reservation_date: reservationDate,
    start_time: startTime,
    end_time: endTime,
    status: "confirmed",
    qr_token: qrToken,
    notes,
    created_at: now(),
  };

  state.reservations.push(reservation);
  state.activityLogs.unshift({
    id: nextId("activityLogs"),
    action: "Reservation confirmee",
    actor_name: `Utilisateur #${userId}`,
    detail: `${reservationDate} ${startTime} - Court #${courtId}`,
    created_at: now(),
  });
  saveState();

  const court = getCourtById(courtId);
  return {
    ...reservation,
    court_name: court?.name ?? "Unknown court",
    sport: court?.sport ?? "Unknown sport",
  };
}

export function cancelReservation(id, userId) {
  const reservation = state.reservations.find((item) => item.id === id && item.user_id === userId);
  if (!reservation) {
    return { changes: 0 };
  }

  reservation.status = "cancelled";
  saveState();
  return { changes: 1 };
}

export function listCompetitions() {
  return state.competitions
    .map((competition) => ({
      ...competition,
      participants: state.competitionRegistrations.filter((registration) => registration.competition_id === competition.id && registration.status === "registered").length,
    }))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export function registerForCompetition(competitionId, userId) {
  const competition = state.competitions.find((item) => item.id === competitionId);
  if (!competition) {
    return { error: "Competition not found" };
  }

  if (state.competitionRegistrations.some((registration) => registration.competition_id === competitionId && registration.user_id === userId && registration.status === "registered")) {
    return { error: "Already registered" };
  }

  const currentCount = state.competitionRegistrations.filter((registration) => registration.competition_id === competitionId && registration.status === "registered").length;
  if (competition.status !== "open" || currentCount >= competition.max_participants) {
    return { error: "Competition is full or closed" };
  }

  state.competitionRegistrations.push({
    id: nextId("competitionRegistrations"),
    competition_id: competitionId,
    user_id: userId,
    status: "registered",
    created_at: now(),
  });
  state.activityLogs.unshift({
    id: nextId("activityLogs"),
    action: "Inscription tournoi",
    actor_name: `Utilisateur #${userId}`,
    detail: competition.name,
    created_at: now(),
  });
  saveState();
  return { success: true };
}

export function getLeaderboard() {
  return state.users
    .map((user) => {
      const snapshots = state.performanceSnapshots.filter((snapshot) => snapshot.user_id === user.id);
      const points = snapshots.length ? Math.max(...snapshots.map((snapshot) => snapshot.ranking_score)) : 0;
      const wins = snapshots.reduce((total, snapshot) => total + snapshot.wins, 0);
      const losses = snapshots.reduce((total, snapshot) => total + snapshot.losses, 0);
      return {
        name: `${user.first_name} ${user.last_name[0] ?? ""}.`,
        points,
        wins,
        losses,
      };
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function listMatches() {
  return state.matches
    .map((match) => ({
      ...match,
      court_name: getCourtById(match.court_id)?.name ?? null,
    }))
    .sort((a, b) => {
      const order = { live: 1, upcoming: 2, finished: 3 };
      return order[a.status] - order[b.status];
    });
}

export function tickLiveMatches() {
  let changed = false;

  state.matches.forEach((match) => {
    if (match.status !== "live") {
      return;
    }

    const lastIndex = match.score1.length - 1;
    if (Math.random() > 0.5) {
      match.score1[lastIndex] = Math.min(7, match.score1[lastIndex] + 1);
    } else {
      match.score2[lastIndex] = Math.min(7, match.score2[lastIndex] + 1);
    }
    changed = true;
  });

  if (changed) {
    saveState();
  }
}

export function findUserByEmail(email) {
  return state.users.find((user) => user.email === email) ?? null;
}

export function createUser({ firstName, lastName, email, passwordHash, role }) {
  const user = {
    id: nextId("users"),
    first_name: firstName,
    last_name: lastName,
    email,
    password_hash: passwordHash,
    role,
    status: "active",
    created_at: now(),
  };

  state.users.push(user);
  state.activityLogs.unshift({
    id: nextId("activityLogs"),
    action: "Nouveau compte",
    actor_name: `${firstName} ${lastName}`,
    detail: `Role: ${role}`,
    created_at: now(),
  });
  saveState();
  return user;
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
    createdAt: user.created_at,
  };
}

export function getAdminOverview() {
  return {
    stats: {
      users: state.users.length,
      activeCompetitions: state.competitions.filter((competition) => competition.status === "open").length,
      totalRegistrations: state.competitionRegistrations.length,
      matchesThisWeek: state.matches.length,
    },
    users: state.users.map(({ password_hash, ...user }) => user),
    courts: listCourts(),
    logs: [...state.activityLogs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10),
  };
}

export function getPerformanceForUser(userId) {
  const snapshots = state.performanceSnapshots
    .filter((snapshot) => snapshot.user_id === userId)
    .sort((a, b) => a.id - b.id);
  const profile = state.performanceProfiles.find((entry) => entry.user_id === userId) ?? null;
  const latest = snapshots.at(-1) ?? null;

  return {
    summary: latest
      ? {
        rankingScore: latest.ranking_score,
        winRate: `${Math.max(60, 70 + snapshots.length)}%`,
        streak: `${Math.min(5, snapshots.length)} victoires`,
        matchesThisMonth: snapshots.length,
      }
      : null,
    progress: snapshots.map((row) => ({
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

export function listAnalysesForUser(userId) {
  return state.aiAnalyses
    .filter((analysis) => analysis.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((analysis) => ({
      id: analysis.id,
      title: analysis.title,
      videoName: analysis.video_name,
      status: analysis.status,
      summary: analysis.summary,
      createdAt: analysis.created_at,
    }));
}

export function createAnalysis({ userId, title, videoName }) {
  const analysis = {
    id: nextId("aiAnalyses"),
    user_id: userId,
    title,
    video_name: videoName,
    status: "queued",
    summary: "Analyse planifiee pour le moteur SmartPlay AI.",
    created_at: now(),
  };

  state.aiAnalyses.push(analysis);
  saveState();
  return {
    id: analysis.id,
    title: analysis.title,
    videoName: analysis.video_name,
    status: analysis.status,
    summary: analysis.summary,
    createdAt: analysis.created_at,
  };
}
