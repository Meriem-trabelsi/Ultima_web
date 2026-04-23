import cors from "cors";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import {
  DB_CLIENT_REQUESTED,
  DB_CLIENT_SELECTED,
  cancelReservation,
  closePool,
  createAnalysis,
  createArena,
  createCourt,
  createManagedUser,
  createReservation,
  createUser,
  requestEmailVerification,
  requestPasswordReset,
  resetPasswordWithCode,
  resetPasswordWithToken,
  verifyEmailWithCode,
  verifyEmailWithToken,
  findUserByEmail,
  getAdminOverview,
  getArenaBillingSummary,
  listBillingPlans,
  changeArenaPlan,
  getCourtAvailability,
  getCourtById,
  getLeaderboard,
  getCompetitionDetails,
  getReservationTicketDetails,
  getReservationTicketDetailsByQr,
  verifyReservationTicketSignature,
  generateReservationTicketPdfBuffer,
  getCoachStudentStats,
  listCoachRelationshipsForUser,
  listCoachesForPlayer,
  listCoachRelationshipExpiryReminders,
  getPerformanceForUser,
  initializeDatabase,
  listAnalysesForUser,
  listArenas,
  listCoachSessions,
  listCoachStudents,
  listCompetitions,
  listCourts,
  listAdminReservations,
  listMatches,
  listReservationsForUser,
  lookupParticipantsForArena,
  registerForCompetition,
  requestCoachRelationship,
  respondCoachRelationship,
  sanitizeUser,
  tickLiveMatches,
  upsertArenaSubscriptionFromProvider,
  updateAdminReservationStatus,
  updateMembershipStatus,
  deleteUser,
  getPlayerDashboardData,
  listPlayerMatches,
  finalizeMatch,
  createCoachSession,
  createOrUpdateCoachRelationshipSeed,
  updateCoachRelationshipSettings,
} from "./arena-db.mjs";
import {
  isMailerConfigured,
  sendPasswordResetCodeEmail,
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
  sendVerificationEmail,
} from "./mailer.mjs";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
  },
});

const PORT = Number(process.env.PORT ?? 3001);
const JWT_SECRET = process.env.JWT_SECRET ?? "ultima-demo-secret";
const WEBHOOK_SECRET = process.env.BILLING_WEBHOOK_SECRET ?? "";
const WEBHOOK_SIGNATURE_SECRET = process.env.BILLING_WEBHOOK_SIGNATURE_SECRET ?? process.env.BILLING_SIGNATURE_SECRET ?? JWT_SECRET;
const ENABLE_TEST_SEED = process.env.ENABLE_TEST_SEED === "1";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CIN_REGEX = /^\d{8}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PUBLIC_WEB_BASE_URL = String(process.env.PUBLIC_WEB_BASE_URL ?? "").trim();

function getPublicWebBaseUrl(req) {
  if (PUBLIC_WEB_BASE_URL) {
    return PUBLIC_WEB_BASE_URL.replace(/\/+$/, "");
  }
  const origin = String(req.headers.origin ?? "").trim();
  if (origin) return origin.replace(/\/+$/, "");
  const host = req.headers.host ?? "localhost:5173";
  return `http://${host}`;
}

function isLocalRequest(req) {
  const host = String(req.hostname ?? "");
  const origin = String(req.headers.origin ?? "");
  return host.includes("localhost") || host.includes("127.0.0.1") || origin.includes("localhost") || origin.includes("127.0.0.1");
}

await initializeDatabase();

async function ensureTestAccount({
  firstName,
  lastName,
  email,
  password,
  arenaId,
  membershipRole,
}) {
  const existing = await findUserByEmail(email);
  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return createUser({
    firstName,
    lastName,
    email,
    passwordHash,
    arenaId,
    membershipRole,
  });
}

async function ensureUltimaArenaTestSetup() {
  const arenas = await listArenas();
  let arena = arenas.find((item) => item.name === "ULTIMA Arena Test Lab");
  if (!arena) {
    arena = await createArena({
      name: "ULTIMA Arena Test Lab",
      location: "Demo City",
    });
  }

  const defaultPassword = process.env.ULTIMA_TEST_PASSWORD ?? "Ultima123!";
  const admin = await ensureTestAccount({
    firstName: "Arena",
    lastName: "Admin",
    email: "admin@ultima-arena.test",
    password: defaultPassword,
    arenaId: arena.id,
    membershipRole: "admin",
  });
  const coach = await ensureTestAccount({
    firstName: "Ryad",
    lastName: "Coach",
    email: "coach@ultima-arena.test",
    password: defaultPassword,
    arenaId: arena.id,
    membershipRole: "coach",
  });
  const playerA = await ensureTestAccount({
    firstName: "Nour",
    lastName: "Player",
    email: "player1@ultima-arena.test",
    password: defaultPassword,
    arenaId: arena.id,
    membershipRole: "player",
  });
  const playerB = await ensureTestAccount({
    firstName: "Ines",
    lastName: "Player",
    email: "player2@ultima-arena.test",
    password: defaultPassword,
    arenaId: arena.id,
    membershipRole: "player",
  });

  const today = new Date();
  const inFiveDays = new Date(today);
  inFiveDays.setDate(today.getDate() + 5);
  const isoToday = today.toISOString().split("T")[0];
  const isoInFiveDays = inFiveDays.toISOString().split("T")[0];

  await createOrUpdateCoachRelationshipSeed({
    coachUserId: coach.id,
    playerUserId: playerA.id,
    status: "active",
    requestedByUserId: playerA.id,
    startDate: isoToday,
    endDate: isoInFiveDays,
    notes: "Active test link (expires soon for reminder testing)",
  });

  await createOrUpdateCoachRelationshipSeed({
    coachUserId: coach.id,
    playerUserId: playerB.id,
    status: "pending",
    requestedByUserId: playerB.id,
    startDate: isoToday,
    notes: "Pending test request",
  });

  return { arena, admin, coach, playerA, playerB, password: defaultPassword };
}

const testSetup = ENABLE_TEST_SEED ? await ensureUltimaArenaTestSetup() : null;

app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    db: {
      requested: DB_CLIENT_REQUESTED,
      selected: DB_CLIENT_SELECTED,
    },
  });
});

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
  const sanitized = sanitizeUser(user);
  return jwt.sign(
    {
      sub: sanitized.id,
      role: sanitized.role,
      email: sanitized.email,
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
  if (!["admin", "super_admin"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }

  return next();
}

function requireCoach(req, res, next) {
  if (!["coach", "admin", "super_admin"].includes(req.user?.role)) {
    return res.status(403).json({ message: "Coach access required" });
  }

  return next();
}

async function attachActor(req) {
  if (!req.user?.email) {
    return null;
  }

  return findUserByEmail(req.user.email);
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = payload;
  } catch {
    req.user = null;
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

app.get("/api/arenas", async (_req, res) => {
  res.json({ arenas: await listArenas() });
});

app.post("/api/auth/signup", async (req, res) => {
  const { nom, prenom, email, password, role, arenaId, arenaName, arenaLocation, cinNumber } = req.body ?? {};
  const normalizedRole = role === "admin" ? "admin" : role === "entraineur" ? "coach" : "player";
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  if (!email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }
  if (!PASSWORD_REGEX.test(String(password))) {
    return res.status(400).json({ message: "Password must be at least 8 chars, with upper/lowercase and a number" });
  }

  if (normalizedRole === "admin" && !arenaName) {
    return res.status(400).json({ message: "Arena name is required for admin signup" });
  }

  if (normalizedRole !== "admin" && !arenaId) {
    return res.status(400).json({ message: "Arena is required" });
  }

  if (normalizedRole !== "admin" && (!nom || !prenom)) {
    return res.status(400).json({ message: "First name and last name are required" });
  }
  if (normalizedRole !== "admin" && !CIN_REGEX.test(String(cinNumber ?? "").trim())) {
    return res.status(400).json({ message: "CIN is required and must contain exactly 8 digits" });
  }

  if (await findUserByEmail(normalizedEmail)) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const createdArena =
    normalizedRole === "admin"
      ? await createArena({
          name: String(arenaName).trim(),
          location: String(arenaLocation ?? arenaName).trim(),
        })
      : null;

  const user = await createUser({
    firstName: normalizedRole === "admin" ? "Admin" : prenom,
    lastName: normalizedRole === "admin" ? String(arenaName).trim() : nom,
    email: normalizedEmail,
    passwordHash,
    arenaId: createdArena ? createdArena.id : Number(arenaId),
    membershipRole: normalizedRole,
    cinNumber: normalizedRole === "admin" ? null : String(cinNumber).trim(),
    emailVerifiedAt: normalizedRole === "admin" ? new Date().toISOString() : null,
  });

  if (normalizedRole !== "admin") {
    const verification = await requestEmailVerification(normalizedEmail);
    const verifyLink = verification.token
      ? `${getPublicWebBaseUrl(req)}/verify-email?token=${encodeURIComponent(verification.token)}`
      : null;
    const verifyCode = verification.code ? String(verification.code) : null;
    let emailSent = false;
    if (verification.user?.email && (verifyCode || verifyLink)) {
      try {
        if (verifyCode) {
          await sendVerificationCodeEmail({
            to: verification.user.email,
            firstName: verification.user.firstName,
            code: verifyCode,
            verifyLink,
          });
        }
        if (verifyLink) {
          await sendVerificationEmail({
            to: verification.user.email,
            firstName: verification.user.firstName,
            verifyLink,
          });
        }
        emailSent = true;
      } catch (error) {
        console.warn("[auth/signup] verification email send failed:", error?.message ?? error);
      }
    }
    return res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      message: isMailerConfigured() && emailSent
        ? "Account created. Check your email for the verification code."
        : "Account created, but email delivery failed. Use resend verification or dev fallback.",
      email: normalizedEmail,
      verificationCode: isLocalRequest(req) ? verifyCode : undefined,
      verificationLink: isLocalRequest(req) ? verifyLink : undefined,
    });
  }

  const token = createToken(user);
  return res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (sanitizeUser(user).status !== "active") {
    return res.status(403).json({ message: "This account is inactive" });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (!user.email_verified_at) {
    return res.status(403).json({ message: "Please verify your email before logging in." });
  }

  const token = createToken(user);
  return res.json({ token, user: sanitizeUser(user) });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body ?? {};
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ message: "Valid email is required" });
  }
  const result = await requestPasswordReset(normalizedEmail);
  const resetLink = result.token
    ? `${getPublicWebBaseUrl(req)}/reset-password?token=${encodeURIComponent(result.token)}`
    : null;
  const resetCode = result.code ? String(result.code) : null;
  let emailSent = false;
  if (result.user?.email && (resetCode || resetLink)) {
    try {
      if (resetCode) {
        await sendPasswordResetCodeEmail({
          to: result.user.email,
          firstName: result.user.firstName,
          code: resetCode,
          resetLink,
        });
      }
      if (resetLink) {
        await sendPasswordResetEmail({
          to: result.user.email,
          firstName: result.user.firstName,
          resetLink,
        });
      }
      emailSent = true;
    } catch (error) {
      console.warn("[auth/forgot-password] reset email send failed:", error?.message ?? error);
    }
  }
  return res.json({
    success: true,
    message: isMailerConfigured() && emailSent
      ? "If the account exists, a reset code has been sent by email."
      : "If the account exists, a reset code is ready (email delivery failed or SMTP not configured).",
    resetCode: isLocalRequest(req) ? resetCode : undefined,
    resetLink: isLocalRequest(req) ? resetLink : undefined,
  });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body ?? {};
  if (!token || !password) {
    return res.status(400).json({ message: "Token and password are required" });
  }
  if (!PASSWORD_REGEX.test(String(password))) {
    return res.status(400).json({ message: "Password must be at least 8 chars, with upper/lowercase and a number" });
  }
  const passwordHash = await bcrypt.hash(String(password), 10);
  await resetPasswordWithToken(String(token), passwordHash);
  return res.json({ success: true });
});

app.post("/api/auth/reset-password-code", async (req, res) => {
  const normalizedEmail = String(req.body?.email ?? "").trim().toLowerCase();
  const code = String(req.body?.code ?? "").trim();
  const password = String(req.body?.password ?? "");
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ message: "Valid email is required" });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: "Reset code must contain 6 digits" });
  }
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({ message: "Password must be at least 8 chars, with upper/lowercase and a number" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await resetPasswordWithCode(normalizedEmail, code, passwordHash);
  return res.json({ success: true });
});

app.get("/api/auth/verify-email", async (req, res) => {
  const token = String(req.query.token ?? "").trim();
  if (!token) {
    return res.status(400).json({ message: "Verification token is required" });
  }
  await verifyEmailWithToken(token);
  return res.json({ success: true, message: "Email verified successfully." });
});

app.post("/api/auth/verify-email-code", async (req, res) => {
  const normalizedEmail = String(req.body?.email ?? "").trim().toLowerCase();
  const code = String(req.body?.code ?? "").trim();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ message: "Valid email is required" });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: "Verification code must contain 6 digits" });
  }
  await verifyEmailWithCode(normalizedEmail, code);
  return res.json({ success: true, message: "Email verified successfully." });
});

app.post("/api/auth/resend-verification", async (req, res) => {
  const normalizedEmail = String(req.body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ message: "Valid email is required" });
  }
  const verification = await requestEmailVerification(normalizedEmail);
  if (verification.alreadyVerified) {
    return res.json({
      success: true,
      message: "This email is already verified.",
    });
  }
  const verifyLink = verification.token
    ? `${getPublicWebBaseUrl(req)}/verify-email?token=${encodeURIComponent(verification.token)}`
    : null;
  const verifyCode = verification.code ? String(verification.code) : null;
  let emailSent = false;
  if (verification.user?.email && (verifyCode || verifyLink)) {
    try {
      if (verifyCode) {
        await sendVerificationCodeEmail({
          to: verification.user.email,
          firstName: verification.user.firstName,
          code: verifyCode,
          verifyLink,
        });
      }
      if (verifyLink) {
        await sendVerificationEmail({
          to: verification.user.email,
          firstName: verification.user.firstName,
          verifyLink,
        });
      }
      emailSent = true;
    } catch (error) {
      console.warn("[auth/resend-verification] verification email send failed:", error?.message ?? error);
    }
  }
  return res.json({
    success: true,
    message: isMailerConfigured() && emailSent
      ? "If eligible, a new verification code has been sent."
      : "Verification code prepared (email delivery failed or SMTP not configured).",
    verificationCode: isLocalRequest(req) ? verifyCode : undefined,
    verificationLink: isLocalRequest(req) ? verifyLink : undefined,
  });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const user = await findUserByEmail(req.user.email);
  return res.json({ user: sanitizeUser(user) });
});

app.get("/api/courts", optionalAuth, async (req, res) => {
  const actor = await attachActor(req);
  res.json({ courts: await listCourts(actor) });
});

app.get("/api/courts/:id/availability", requireAuth, async (req, res) => {
  const { date } = req.query;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ message: "A valid date is required" });
  }

  const actor = await attachActor(req);
  const availability = await getCourtAvailability(Number(req.params.id), date);
  if (!availability) {
    return res.status(404).json({ message: "Court not found" });
  }

  const court = await getCourtById(Number(req.params.id));
  if (actor?.effective_role !== "super_admin" && actor?.arena_id && court?.arena_id !== actor.arena_id) {
    return res.status(403).json({ message: "You can only view availability for courts in your arena" });
  }

  return res.json(availability);
});

app.post("/api/participants/lookup", requireAuth, async (req, res) => {
  const actor = await attachActor(req);
  const { emails = [] } = req.body ?? {};

  if (!actor?.arena_id) {
    return res.status(400).json({ message: "Only arena members can add participants" });
  }

  const normalizedEmails = Array.isArray(emails) ? emails.filter((email) => typeof email === "string") : [];
  return res.json({
    participants: await lookupParticipantsForArena(actor.arena_id, normalizedEmails),
  });
});

app.get("/api/reservations/my", requireAuth, async (req, res) => {
  res.json({ reservations: await listReservationsForUser(req.user.sub) });
});

app.post("/api/reservations", requireAuth, async (req, res) => {
  const { courtId, reservationDate, startTime, endTime, notes, participantEmails } = req.body ?? {};

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

  const court = await getCourtById(courtId);
  if (!court) {
    return res.status(404).json({ message: "Court not found" });
  }

  const reservation = await createReservation({
    userId: req.user.sub,
    courtId,
    reservationDate,
    startTime,
    endTime,
    qrToken: randomUUID(),
    notes,
    participantEmails: Array.isArray(participantEmails) ? participantEmails : [],
  });

  return res.status(201).json({ reservation });
});

app.patch("/api/reservations/:id/cancel", requireAuth, async (req, res) => {
  const actor = await attachActor(req);
  const result = await cancelReservation(Number(req.params.id), actor);
  if (!result.changes) {
    return res.status(404).json({ message: "Reservation not found" });
  }

  return res.json({ success: true });
});

app.get("/api/competitions", optionalAuth, async (req, res) => {
  const actor = await attachActor(req);
  res.json({
    competitions: await listCompetitions(actor),
    leaderboard: await getLeaderboard(actor),
  });
});

app.get("/api/competitions/:id", optionalAuth, async (req, res) => {
  try {
    const details = await getCompetitionDetails(Number(req.params.id));
    if (!details) return res.status(404).json({ message: "Competition non trouvee" });
    res.json(details);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Une erreur est survenue" });
  }
});

app.post("/api/competitions/:id/register", requireAuth, async (req, res) => {
  const actor = await attachActor(req);
  const outcome = await registerForCompetition(Number(req.params.id), actor);
  if (outcome.error) {
    return res.status(409).json({ message: outcome.error });
  }

  return res.json({ success: true });
});

app.get("/api/live-scores", optionalAuth, async (req, res) => {
  const actor = await attachActor(req);
  res.json({ matches: await listMatches(actor) });
});

app.get("/api/reservations", requireAuth, async (req, res) => {
  try {
    const reservations = await listReservationsForUser(req.user.sub);
    res.json({ reservations });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Une erreur est survenue" });
  }
});

app.get("/api/reservations/:id/ticket.pdf", requireAuth, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    const ticket = await getReservationTicketDetails(Number(req.params.id), actor);
    const pdfBuffer = generateReservationTicketPdfBuffer(ticket);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"ultima-reservation-${ticket.id}.pdf\"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to generate ticket" });
  }
});

app.get("/public/tickets/:id/download", async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    const qr = String(req.query.qr ?? "");
    if (!reservationId || !qr) {
      return res.status(400).json({ message: "reservationId and qr are required" });
    }

    const ticket = await getReservationTicketDetailsByQr(reservationId, qr);
    const pdfBuffer = generateReservationTicketPdfBuffer(ticket);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"ultima-reservation-${ticket.id}.pdf\"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Invalid ticket link" });
  }
});

app.get("/api/reservations/tickets/verify", requireAuth, async (req, res) => {
  try {
    const reservationId = Number(req.query.reservationId);
    const signature = String(req.query.signature ?? "");
    if (!reservationId || !signature) {
      return res.status(400).json({ message: "reservationId and signature are required" });
    }

    const verification = await verifyReservationTicketSignature(reservationId, signature);
    return res.json(verification);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to verify ticket" });
  }
});

app.get("/api/performance/me", requireAuth, async (req, res) => {
  res.json(await getPerformanceForUser(req.user.sub));
});

app.get("/api/player/dashboard", requireAuth, async (req, res) => {
  try {
    const data = await getPlayerDashboardData(req.user.sub);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Une erreur est survenue" });
  }
});

app.get("/api/player/matches", requireAuth, async (req, res) => {
  try {
    const matches = await listPlayerMatches(req.user.sub);
    res.json({ matches });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Une erreur est survenue" });
  }
});

app.get("/api/coach/students", requireAuth, requireCoach, async (req, res) => {
  try {
    const students = await listCoachStudents(req.user.sub);
    return res.json({ students });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load students" });
  }
});

app.get("/api/coach-links/coaches", requireAuth, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    if (actor.effective_role !== "player") {
      return res.status(403).json({ message: "Only players can browse coaches" });
    }
    const coaches = await listCoachesForPlayer(actor.id);
    return res.json({ coaches });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to list coaches" });
  }
});

app.get("/api/coach-links/my", requireAuth, async (req, res) => {
  try {
    const links = await listCoachRelationshipsForUser(req.user.sub);
    return res.json({ relationships: links });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load relationships" });
  }
});

app.post("/api/coach-links/request", requireAuth, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    if (actor.effective_role !== "player") {
      return res.status(403).json({ message: "Only players can request a coach" });
    }
    const { coachUserId, startDate, endDate, notes, permissions, consentVersion } = req.body ?? {};
    const relationship = await requestCoachRelationship(actor.id, {
      coachUserId: Number(coachUserId),
      startDate,
      endDate,
      notes,
      permissions,
      consentVersion,
    });
    return res.status(201).json({ relationship });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to request coach" });
  }
});

app.patch("/api/coach-links/:id/respond", requireAuth, async (req, res) => {
  try {
    const { decision } = req.body ?? {};
    const relationship = await respondCoachRelationship(req.user.sub, Number(req.params.id), decision);
    return res.json({ relationship });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to respond to request" });
  }
});

app.patch("/api/coach-links/:id", requireAuth, async (req, res) => {
  try {
    const { status, endDate, permissions, notes } = req.body ?? {};
    const relationship = await updateCoachRelationshipSettings(req.user.sub, Number(req.params.id), {
      status,
      endDate,
      permissions,
      notes,
    });
    return res.json({ relationship });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to update relationship" });
  }
});

app.get("/api/coach-links/reminders", requireAuth, async (req, res) => {
  try {
    const days = Number(req.query.days ?? 7);
    const reminders = await listCoachRelationshipExpiryReminders(req.user.sub, days);
    return res.json({ reminders });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load reminders" });
  }
});

app.get("/api/coach/students/:id/stats", requireAuth, requireCoach, async (req, res) => {
  try {
    const details = await getCoachStudentStats(req.user.sub, Number(req.params.id));
    return res.json(details);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load student stats" });
  }
});

app.get("/api/coach/sessions", requireAuth, requireCoach, async (req, res) => {
  try {
    const sessions = await listCoachSessions(req.user.sub);
    return res.json({ sessions });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load sessions" });
  }
});

app.post("/api/coach/sessions", requireAuth, requireCoach, async (req, res) => {
  try {
    const { courtId, reservationDate, startTime, endTime, studentIds, title, sessionType, focusAreas, notes } = req.body ?? {};
    const session = await createCoachSession(req.user.sub, {
      courtId: Number(courtId),
      reservationDate,
      startTime,
      endTime,
      studentIds,
      title,
      sessionType,
      focusAreas,
      notes,
    });
    return res.status(201).json({ session });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to schedule session" });
  }
});

app.get("/api/admin/billing/summary", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    const summary = await getArenaBillingSummary(actor);
    return res.json(summary);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load billing summary" });
  }
});

app.get("/api/admin/billing/plans", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const plans = await listBillingPlans();
    return res.json({ plans });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load plans" });
  }
});

app.post("/api/admin/billing/change-plan", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    const { planCode, cycle = "monthly" } = req.body ?? {};
    if (!planCode || !["starter", "pro", "elite"].includes(String(planCode))) {
      return res.status(400).json({ message: "Invalid plan code" });
    }
    if (!["monthly", "yearly"].includes(String(cycle))) {
      return res.status(400).json({ message: "Invalid billing cycle" });
    }

    const summary = await changeArenaPlan(actor, String(planCode), String(cycle));
    return res.json({ summary });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to change plan" });
  }
});

app.post("/api/admin/billing/checkout-session", requireAuth, requireAdmin, async (req, res) => {
  const { planCode = "pro", cycle = "monthly" } = req.body ?? {};
  return res.status(501).json({
    message: "Stripe checkout session creation is not connected yet.",
    hint: "Provide STRIPE_SECRET_KEY and implement Stripe Checkout session creation.",
    requested: { planCode, cycle },
  });
});

app.post("/api/billing/webhook", async (req, res) => {
  if (!WEBHOOK_SECRET) {
    return res.status(503).json({ message: "Billing webhook is disabled (missing secret)." });
  }

  const receivedSecret = String(req.headers["x-billing-webhook-secret"] ?? "");
  if (receivedSecret !== WEBHOOK_SECRET) {
    return res.status(401).json({ message: "Invalid webhook secret" });
  }

  const signature = String(req.headers["x-billing-signature"] ?? "");
  const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}), "utf8");
  const expected = createHmac("sha256", WEBHOOK_SIGNATURE_SECRET).update(raw).digest("hex");
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (
    !signature ||
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({ message: "Invalid webhook signature" });
  }

  const event = req.body ?? {};
  try {
    if (event?.type === "subscription.updated" || event?.type === "subscription.created") {
      const payload = event.data ?? {};
      await upsertArenaSubscriptionFromProvider({
        arenaId: Number(payload.arenaId),
        planCode: String(payload.planCode ?? "starter"),
        status: String(payload.status ?? "active"),
        provider: String(payload.provider ?? "stripe"),
        providerCustomerId: payload.providerCustomerId ? String(payload.providerCustomerId) : null,
        providerSubscriptionId: payload.providerSubscriptionId ? String(payload.providerSubscriptionId) : null,
        currentPeriodStart: payload.currentPeriodStart ?? null,
        currentPeriodEnd: payload.currentPeriodEnd ?? null,
        trialEnd: payload.trialEnd ?? null,
        cancelAtPeriodEnd: Boolean(payload.cancelAtPeriodEnd),
      });
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Webhook processing failed" });
  }
});

app.get("/api/admin/overview", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json(await getAdminOverview(actor));
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load admin overview" });
  }
});

app.post("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }

    const { nom, prenom, email, password, role, arenaId, arenaName, cinNumber } = req.body ?? {};
    const normalizedRole = role === "admin" ? "admin" : role === "coach" ? "coach" : "player";

    if (normalizedRole === "admin") {
      if (!arenaName || !email || !password) {
        return res.status(400).json({ message: "Nom de l'Arena, Email et Mot de passe sont requis" });
      }
    } else if (!nom || !prenom || !email || !password || !arenaId) {
      return res.status(400).json({ message: "Tous les champs sont requis pour un utilisateur standard" });
    }
    if (!EMAIL_REGEX.test(String(email).trim().toLowerCase())) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (!PASSWORD_REGEX.test(String(password))) {
      return res.status(400).json({ message: "Password must be at least 8 chars, with upper/lowercase and a number" });
    }
    if (normalizedRole !== "admin" && !CIN_REGEX.test(String(cinNumber ?? "").trim())) {
      return res.status(400).json({ message: "CIN is required and must contain exactly 8 digits" });
    }

    if (await findUserByEmail(email)) {
      return res.status(409).json({ message: "Cet email est deja utilise" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createManagedUser({
      actor,
      firstName: normalizedRole === "admin" ? "Admin" : prenom,
      lastName: normalizedRole === "admin" ? arenaName : nom,
      email,
      passwordHash,
      arenaId: arenaId ? Number(arenaId) : null,
      membershipRole: normalizedRole,
      arenaName,
      cinNumber: normalizedRole === "admin" ? null : String(cinNumber).trim(),
    });

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to create user" });
  }
});

app.patch("/api/admin/users/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    const { status } = req.body ?? {};
    const user = await updateMembershipStatus(actor, Number(req.params.id), status);
    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to update user status" });
  }
});

app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    await deleteUser(actor, Number(req.params.id));
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to delete user" });
  }
});

app.post("/api/admin/matches/finalize", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reservationId, score1, score2 } = req.body ?? {};
    if (!reservationId) {
      return res.status(400).json({ message: "reservationId is required" });
    }
    const result = await finalizeMatch(Number(reservationId), score1, score2);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to finalize match" });
  }
});

app.post("/api/admin/courts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }

    const { arenaId, name, sport, location, hasSumma, minPlayers, maxPlayers, openingTime, closingTime } = req.body ?? {};

    if (!arenaId || !name || !sport || !location) {
      return res.status(400).json({ message: "Missing required court fields" });
    }

    const court = await createCourt({
      actor,
      arenaId: Number(arenaId),
      name: String(name).trim(),
      sport: String(sport).trim(),
      location: String(location).trim(),
      hasSumma,
      minPlayers,
      maxPlayers,
      openingTime,
      closingTime,
    });

    return res.status(201).json({ court });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to create court" });
  }
});

app.get("/api/admin/reservations", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ reservations: await listAdminReservations(actor) });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load reservations" });
  }
});

app.patch("/api/admin/reservations/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    const { status } = req.body ?? {};
    await updateAdminReservationStatus(actor, Number(req.params.id), String(status));
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to update reservation status" });
  }
});

app.get("/api/ai/analyses", requireAuth, async (req, res) => {
  res.json({ analyses: await listAnalysesForUser(req.user.sub) });
});

app.post("/api/ai/analyses", requireAuth, async (req, res) => {
  const { title, videoName } = req.body ?? {};
  if (!title || !videoName) {
    return res.status(400).json({ message: "title and videoName are required" });
  }

  const analysis = await createAnalysis({
    userId: req.user.sub,
    title,
    videoName,
  });

  return res.status(201).json({ analysis });
});

io.on("connection", async (socket) => {
  try {
    socket.emit("scores:update", { matches: await listMatches() });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unable to push initial live scores:", error);
  }
});

setInterval(async () => {
  try {
    await tickLiveMatches();
    io.emit("scores:update", { matches: await listMatches() });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Live score loop error:", error);
  }
}, 5000);

const shutdown = async () => {
  await closePool();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

httpServer.listen(PORT, () => {
  console.log(`ULTIMA demo API listening on http://localhost:${PORT}`);
  if (ENABLE_TEST_SEED && testSetup) {
    console.log(
      `[ULTIMA TEST ACCOUNTS] arena="${testSetup.arena.name}" users=admin@ultima-arena.test, coach@ultima-arena.test, player1@ultima-arena.test, player2@ultima-arena.test`
    );
    console.log("[ULTIMA TEST ACCOUNTS] password source: env ULTIMA_TEST_PASSWORD");
  }
});
