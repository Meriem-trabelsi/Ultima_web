import cors from "cors";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import {
  cancelReservation,
  createAnalysis,
  createReservation,
  createUser,
  findUserByEmail,
  getAdminOverview,
  getCourtById,
  getLeaderboard,
  getPerformanceForUser,
  hasReservationConflict,
  initializeDatabase,
  listAnalysesForUser,
  listCompetitions,
  listCourts,
  listMatches,
  listReservationsForUser,
  registerForCompetition,
  sanitizeUser,
  tickLiveMatches,
} from "./db.mjs";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
  },
});

const PORT = Number(process.env.PORT ?? 3001);
const JWT_SECRET = process.env.JWT_SECRET ?? "ultima-demo-secret";

initializeDatabase();

app.use(cors());
app.use(express.json());

function parseReservationDateTime(reservationDate, time) {
  if (
    typeof reservationDate !== "string" ||
    typeof time !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reservationDate) ||
    !/^\d{2}:\d{2}$/.test(time)
  ) {
    return null;
  }

  const value = new Date(`${reservationDate}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  return next();
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ultima-demo-api",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/auth/signup", async (req, res) => {
  const { nom, prenom, email, password, role } = req.body ?? {};
  const normalizedRole =
    role === "admin" ? "admin" : role === "entraineur" ? "coach" : "player";

  if (!nom || !prenom || !email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (findUserByEmail(email)) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser({
    firstName: prenom,
    lastName: nom,
    email,
    passwordHash,
    role: normalizedRole,
  });

  const token = createToken(user);
  return res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = createToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = findUserByEmail(req.user.email);
  return res.json({ user: sanitizeUser(user) });
});

app.get("/api/courts", (_req, res) => {
  res.json({ courts: listCourts() });
});

app.get("/api/reservations/my", requireAuth, (req, res) => {
  res.json({ reservations: listReservationsForUser(req.user.sub) });
});

app.post("/api/reservations", requireAuth, (req, res) => {
  const { courtId, reservationDate, startTime, endTime, notes } = req.body ?? {};

  if (!courtId || !reservationDate || !startTime || !endTime) {
    return res.status(400).json({ message: "Missing reservation fields" });
  }

  const reservationStart = parseReservationDateTime(reservationDate, startTime);
  const reservationEnd = parseReservationDateTime(reservationDate, endTime);
  if (!reservationStart || !reservationEnd || reservationEnd <= reservationStart) {
    return res.status(400).json({ message: "Invalid reservation date or time" });
  }

  if (reservationStart <= new Date()) {
    return res.status(400).json({ message: "You cannot reserve a past time slot" });
  }

  const court = getCourtById(courtId);
  if (!court) {
    return res.status(404).json({ message: "Court not found" });
  }

  if (hasReservationConflict(courtId, reservationDate, startTime, endTime)) {
    return res.status(409).json({ message: "This slot is already reserved" });
  }

  const reservation = createReservation({
    userId: req.user.sub,
    courtId,
    reservationDate,
    startTime,
    endTime,
    qrToken: randomUUID(),
    notes,
  });

  return res.status(201).json({ reservation });
});

app.patch("/api/reservations/:id/cancel", requireAuth, (req, res) => {
  const result = cancelReservation(Number(req.params.id), req.user.sub);
  if (!result.changes) {
    return res.status(404).json({ message: "Reservation not found" });
  }

  return res.json({ success: true });
});

app.get("/api/competitions", (_req, res) => {
  res.json({
    competitions: listCompetitions(),
    leaderboard: getLeaderboard(),
  });
});

app.post("/api/competitions/:id/register", requireAuth, (req, res) => {
  const outcome = registerForCompetition(Number(req.params.id), req.user.sub);
  if (outcome.error) {
    return res.status(409).json({ message: outcome.error });
  }

  return res.json({ success: true });
});

app.get("/api/live-scores", (_req, res) => {
  res.json({ matches: listMatches() });
});

app.get("/api/performance/me", requireAuth, (req, res) => {
  res.json(getPerformanceForUser(req.user.sub));
});

app.get("/api/admin/overview", requireAuth, requireAdmin, (_req, res) => {
  res.json(getAdminOverview());
});

app.get("/api/ai/analyses", requireAuth, (req, res) => {
  res.json({ analyses: listAnalysesForUser(req.user.sub) });
});

app.post("/api/ai/analyses", requireAuth, (req, res) => {
  const { title, videoName } = req.body ?? {};
  if (!title || !videoName) {
    return res.status(400).json({ message: "title and videoName are required" });
  }

  const analysis = createAnalysis({
    userId: req.user.sub,
    title,
    videoName,
  });

  return res.status(201).json({ analysis });
});

io.on("connection", (socket) => {
  socket.emit("scores:update", { matches: listMatches() });
});

setInterval(() => {
  tickLiveMatches();
  io.emit("scores:update", { matches: listMatches() });
}, 5000);

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ULTIMA demo API listening on http://localhost:${PORT}`);
});
