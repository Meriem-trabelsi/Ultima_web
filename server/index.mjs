import cors from "cors";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
  getUserById,
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
  listNotificationsForUser,
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
  persistRefreshToken,
  consumeRefreshToken,
  revokeRefreshTokensForUser,
  tickLiveMatches,
  upsertArenaSubscriptionFromProvider,
  updateAdminReservationStatus,
  updateMembershipRole,
  updateMembershipStatus,
  deleteUser,
  getPlayerDashboardData,
  listPlayerMatches,
  finalizeMatch,
  createCoachSession,
  createOrUpdateCoachRelationshipSeed,
  createNotification,
  markNotificationRead,
  updateCoachRelationshipSettings,
  listPadelPlaces,
  getPadelPlace,
  listPadelTerrains,
  getPadelTerrain,
  getPadelAvailability,
  createPadelReservation,
  getCoachProfile,
  upsertCoachProfile,
  updateCoachAvatar,
  listArenasForCoachBooking,
  listCoachProfiles,
  getCoachPublicProfile,
  getCoachAvailability,
  setCoachAvailabilityRules,
  addCoachAvailabilityException,
  getCoachAvailableSlots,
  createCoachingRequest,
  respondToCoachingRequest,
  listCoachingRequestsForCoach,
  listCoachingRequestsForPlayer,
  listCoachingSessionsForUser,
  listAdminCoaches,
  assignCoachToArena,
} from "./arena-db.mjs";
import {
  isMailerConfigured,
  sendPasswordResetCodeEmail,
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
  sendVerificationEmail,
} from "./mailer.mjs";
import {
  getMatchScore,
  updateMatchScore,
  getScoreEvents,
  createScoreEvent,
  getScoreCorrectionLogs,
  listScoringMatches,
  getRecentScoreActivity,
} from "./scoring.mjs";
import {
  getPlayerStats,
  getPlayerMatchHistory,
  getPlayerReservationHistory,
  getPlayerCompetitionHistory,
  getPlayerAiAnalysis,
  getPlatformStats,
  getRevenueSummary,
} from "./analytics.mjs";
import {
  getSmartPlayStatus,
  createAnalysisJob,
  listAnalysisJobs,
  getMatchAnalysis,
  getPlayerAiMetrics,
} from "./smartplay.mjs";

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
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 14);
const MAX_VIDEO_UPLOAD_MB = Number(process.env.MAX_VIDEO_UPLOAD_MB ?? 2048);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CIN_REGEX = /^\d{8}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PUBLIC_WEB_BASE_URL = String(process.env.PUBLIC_WEB_BASE_URL ?? "").trim();
const LAN_IP = (() => {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "127.0.0.1";
})();
// Public base URL for QR codes — set PUBLIC_SERVER_URL in .env when using a tunnel (ngrok/cloudflared)
const PUBLIC_SERVER_URL = String(process.env.PUBLIC_SERVER_URL ?? "").trim() || `http://${LAN_IP}:${PORT}`;

const STRIPE_SECRET_KEY = String(process.env.STRIPE_SECRET_KEY ?? "").trim();
const STRIPE_WEBHOOK_SECRET = String(process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
// TND is not a native Stripe currency — convert to EUR (approx 1 TND = 0.30 EUR)
const TND_TO_EUR_RATE = 0.30;
const uploadsDir = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safeName = String(file.originalname ?? "upload.mp4").replace(/[^a-zA-Z0-9._-]/g, "-");
      cb(null, `${Date.now()}-${randomUUID()}-${safeName}`);
    },
  }),
  limits: {
    fileSize: MAX_VIDEO_UPLOAD_MB * 1024 * 1024,
  },
});

const uploadImage = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safeName = String(file.originalname ?? "image.jpg").replace(/[^a-zA-Z0-9._-]/g, "-");
      cb(null, `${Date.now()}-${randomUUID()}-${safeName}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap for images
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only JPEG, PNG, WebP and GIF images are allowed"));
    }
  },
});

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

app.use("/uploads", express.static(uploadsDir));

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

async function issueSession(user) {
  const token = createToken(user);
  const refreshToken = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await persistRefreshToken(user.id, refreshToken, expiresAt);
  return { token, refreshToken, user: sanitizeUser(user) };
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
  try {
    const { nom, prenom, email, password, cinNumber } = req.body ?? {};
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
    if (!nom || !prenom) {
      return res.status(400).json({ message: "First name and last name are required" });
    }
    if (!CIN_REGEX.test(String(cinNumber ?? "").trim())) {
      return res.status(400).json({ message: "CIN is required and must contain exactly 8 digits" });
    }

    if (await findUserByEmail(normalizedEmail)) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await createUser({
      firstName: prenom,
      lastName: nom,
      email: normalizedEmail,
      passwordHash,
      membershipRole: "player",
      cinNumber: String(cinNumber).trim(),
    });

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign up";
    const lower = String(message).toLowerCase();
    const status =
      lower.includes("duplicate") || lower.includes("already") || lower.includes("unique")
        ? 409
        : lower.includes("invalid") || lower.includes("required")
          ? 400
          : 500;
    return res.status(status).json({ message });
  }
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

  return res.json(await issueSession(user));
});

app.post("/api/auth/refresh", async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken ?? "").trim();
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }
    const record = await consumeRefreshToken(refreshToken);
    if (!record) {
      return res.status(401).json({ message: "Refresh token is invalid or expired" });
    }
    const user = await getUserById(Number(record.user_id));
    if (!user || sanitizeUser(user).status !== "active") {
      return res.status(401).json({ message: "User is unavailable for refresh" });
    }
    return res.json(await issueSession(user));
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to refresh session" });
  }
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  try {
    await revokeRefreshTokensForUser(req.user.sub);
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to log out" });
  }
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
  if (!["player", "super_admin"].includes(actor?.effective_role) && actor?.arena_id && court?.arena_id !== actor.arena_id) {
    return res.status(403).json({ message: "You can only view availability for courts in your arena" });
  }

  return res.json(availability);
});

app.post("/api/participants/lookup", requireAuth, async (req, res) => {
  const actor = await attachActor(req);
  const { emails = [], arenaId } = req.body ?? {};
  const targetArenaId = Number(arenaId ?? actor?.arena_id);

  if (!targetArenaId) {
    return res.status(400).json({ message: "Only arena members can add participants" });
  }

  const normalizedEmails = Array.isArray(emails) ? emails.filter((email) => typeof email === "string") : [];
  return res.json({
    participants: await lookupParticipantsForArena(targetArenaId, normalizedEmails),
  });
});

app.get("/api/reservations/my", requireAuth, async (req, res) => {
  res.json({ reservations: await listReservationsForUser(req.user.sub) });
});

app.post("/api/reservations", requireAuth, async (req, res) => {
  try {
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

    await createNotification({
      userId: req.user.sub,
      title: "Reservation confirmed",
      body: `Your reservation for ${court.name} on ${reservationDate} from ${startTime} to ${endTime} is confirmed.`,
      type: "reservation",
      linkUrl: "/reservation",
    });

    return res.status(201).json({ reservation });
  } catch (error) {
    console.error("[POST /api/reservations]", error);
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to create reservation" });
  }
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
    const { default: pgPool } = await import("./pg-pool.mjs");
    const { rows: payRows } = await pgPool.query(
      "SELECT payment_status FROM reservations WHERE id = $1",
      [Number(req.params.id)]
    );
    if (!payRows.length) return res.status(404).json({ message: "Reservation not found" });
    if (payRows[0].payment_status !== "paid") {
      return res.status(402).json({ message: "Payment required before downloading your ticket." });
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

// GET /api/reservations/:id/ticket-link — returns the public mobile-friendly download URL
app.get("/api/reservations/:id/ticket-link", requireAuth, async (req, res) => {
  try {
    const { default: pgPool } = await import("./pg-pool.mjs");
    const reservationId = Number(req.params.id);
    const { rows } = await pgPool.query(
      "SELECT qr_token, payment_status, user_id FROM reservations WHERE id = $1",
      [reservationId]
    );
    if (!rows.length) return res.status(404).json({ message: "Reservation not found" });
    if (rows[0].payment_status !== "paid") return res.status(402).json({ message: "Payment required" });
    const url = `${PUBLIC_SERVER_URL}/public/tickets/${reservationId}/download?qr=${rows[0].qr_token}`;
    return res.json({ url });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to get ticket link" });
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

app.post("/api/reservations/:id/pay", requireAuth, async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    const { amount, currency = "TND", method = "simulated" } = req.body ?? {};
    if (!reservationId || !amount) return res.status(400).json({ message: "reservationId and amount are required" });
    const { default: pgPool } = await import("./pg-pool.mjs");
    const existing = await pgPool.query("SELECT id FROM reservation_payments WHERE reservation_id = $1", [reservationId]);
    if (existing.rows.length) {
      await pgPool.query(
        "UPDATE reservation_payments SET status='paid', method=$1, amount=$2, currency=$3, paid_at=NOW(), updated_at=NOW() WHERE reservation_id=$4",
        [method, amount, currency, reservationId]
      );
    } else {
      await pgPool.query(
        "INSERT INTO reservation_payments (reservation_id, amount, currency, status, method, paid_at) VALUES ($1,$2,$3,'paid',$4,NOW())",
        [reservationId, amount, currency, method]
      );
    }
    await pgPool.query("UPDATE reservations SET payment_status='paid' WHERE id=$1", [reservationId]);
    res.json({ success: true, reservationId, amount, currency, method, status: "paid" });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Payment failed" });
  }
});

// ── Stripe Payments ───────────────────────────────────────────────────────────

// POST /api/payments/reservation/:id/checkout
// Creates a Stripe checkout session for a confirmed court reservation.
app.post("/api/payments/reservation/:id/checkout", requireAuth, async (req, res) => {
  if (!STRIPE_SECRET_KEY) {
    return res.status(503).json({ message: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env." });
  }
  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const { default: pgPool } = await import("./pg-pool.mjs");
    const reservationId = Number(req.params.id);

    const { rows } = await pgPool.query(
      `SELECT r.*, c.name AS court_name, c.price_per_hour, a.name AS arena_name
       FROM reservations r
       JOIN courts c ON c.id = r.court_id
       JOIN arenas a ON a.id = c.arena_id
       WHERE r.id = $1 AND r.user_id = $2`,
      [reservationId, req.user.sub]
    );
    if (!rows.length) return res.status(404).json({ message: "Reservation not found" });
    const reservation = rows[0];
    if (reservation.payment_status === "paid") {
      return res.status(400).json({ message: "This reservation is already paid" });
    }

    // Calculate duration in hours
    const [sh, sm] = String(reservation.start_time).split(":").map(Number);
    const [eh, em] = String(reservation.end_time).split(":").map(Number);
    const durationHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    const tndAmount = Number(reservation.price_per_hour ?? 0) * durationHours;
    const eurCents = Math.round(tndAmount * TND_TO_EUR_RATE * 100);

    const baseUrl = getPublicWebBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: `Court: ${reservation.court_name} — ${reservation.arena_name}`,
            description: `${reservation.reservation_date} · ${String(reservation.start_time).slice(0,5)}–${String(reservation.end_time).slice(0,5)}`,
          },
          unit_amount: eurCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=reservation&id=${reservationId}`,
      cancel_url: `${baseUrl}/payment/cancel?type=reservation&id=${reservationId}`,
      metadata: { type: "reservation", reservationId: String(reservationId) },
    });

    await pgPool.query("UPDATE reservations SET stripe_session_id = $1 WHERE id = $2", [session.id, reservationId]);
    return res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create checkout session" });
  }
});

// POST /api/payments/coaching-request/:id/checkout
// Creates a Stripe checkout session for an accepted coaching request (court + coach fee).
app.post("/api/payments/coaching-request/:id/checkout", requireAuth, async (req, res) => {
  if (!STRIPE_SECRET_KEY) {
    return res.status(503).json({ message: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env." });
  }
  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const { default: pgPool } = await import("./pg-pool.mjs");
    const requestId = Number(req.params.id);

    const { rows } = await pgPool.query(
      `SELECT cr.*,
              CONCAT(u.first_name,' ',u.last_name) AS coach_name,
              cp.hourly_rate AS coach_hourly_rate,
              cp.currency AS coach_currency,
              c.name AS court_name, c.price_per_hour AS court_price,
              a.name AS arena_name
       FROM coaching_requests cr
       JOIN users u ON u.id = cr.coach_user_id
       LEFT JOIN coach_profiles cp ON cp.user_id = cr.coach_user_id
       LEFT JOIN courts c ON c.id = cr.preferred_court_id
       LEFT JOIN arenas a ON a.id = cr.arena_id
       WHERE cr.id = $1 AND cr.player_user_id = $2`,
      [requestId, req.user.sub]
    );
    if (!rows.length) return res.status(404).json({ message: "Coaching request not found" });
    const cr = rows[0];
    if (cr.status !== "accepted") return res.status(400).json({ message: "Only accepted requests can be paid" });
    if (cr.payment_status === "paid") return res.status(400).json({ message: "Already paid" });

    const [sh, sm] = String(cr.requested_start_time).split(":").map(Number);
    const [eh, em] = String(cr.requested_end_time).split(":").map(Number);
    const durationHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;

    const coachFee = Number(cr.coach_hourly_rate ?? 0) * durationHours;
    const courtFee = Number(cr.court_price ?? 0) * durationHours;
    const totalTND = coachFee + courtFee;
    const totalEurCents = Math.round(totalTND * TND_TO_EUR_RATE * 100);

    const baseUrl = getPublicWebBaseUrl(req);
    const lineItems = [];

    if (coachFee > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: `Coach session: ${cr.coach_name}`,
            description: `${cr.requested_date} · ${String(cr.requested_start_time).slice(0,5)}–${String(cr.requested_end_time).slice(0,5)}`,
          },
          unit_amount: Math.round(coachFee * TND_TO_EUR_RATE * 100),
        },
        quantity: 1,
      });
    }
    if (courtFee > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: `Court: ${cr.court_name ?? "Selected court"} — ${cr.arena_name}`,
            description: `${cr.requested_date} · ${String(cr.requested_start_time).slice(0,5)}–${String(cr.requested_end_time).slice(0,5)}`,
          },
          unit_amount: Math.round(courtFee * TND_TO_EUR_RATE * 100),
        },
        quantity: 1,
      });
    }
    if (!lineItems.length) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: `Coach session: ${cr.coach_name}`, description: `${cr.requested_date}` },
          unit_amount: Math.max(totalEurCents, 50),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=coaching&id=${requestId}`,
      cancel_url: `${baseUrl}/payment/cancel?type=coaching&id=${requestId}`,
      metadata: { type: "coaching_request", requestId: String(requestId) },
    });

    await pgPool.query(
      "UPDATE coaching_requests SET stripe_session_id = $1, payment_amount = $2 WHERE id = $3",
      [session.id, totalTND, requestId]
    );
    return res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create checkout session" });
  }
});

// GET /api/payments/session/:sessionId — poll session status after redirect back
// Also acts as fallback fulfillment in case the webhook was delayed or missed.
app.get("/api/payments/session/:sessionId", requireAuth, async (req, res) => {
  if (!STRIPE_SECRET_KEY) {
    return res.status(503).json({ message: "Stripe is not configured." });
  }
  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

    if (session.payment_status === "paid") {
      const { default: pgPool } = await import("./pg-pool.mjs");
      const meta = session.metadata ?? {};

      if (meta.type === "reservation") {
        const reservationId = Number(meta.reservationId);
        const { rows } = await pgPool.query("SELECT payment_status, user_id FROM reservations WHERE id = $1", [reservationId]);
        if (rows.length && rows[0].payment_status !== "paid") {
          await pgPool.query("UPDATE reservations SET payment_status='paid' WHERE id=$1", [reservationId]);
          const existing = await pgPool.query("SELECT id FROM reservation_payments WHERE reservation_id=$1", [reservationId]);
          if (!existing.rows.length) {
            await pgPool.query(
              "INSERT INTO reservation_payments (reservation_id, amount, currency, status, method, paid_at) VALUES ($1,$2,'EUR','paid','stripe',NOW())",
              [reservationId, (session.amount_total / 100).toFixed(2)]
            );
          }
        }
      } else if (meta.type === "coaching_request") {
        const requestId = Number(meta.requestId);
        const { rows: crRows } = await pgPool.query("SELECT * FROM coaching_requests WHERE id=$1", [requestId]);
        if (crRows.length && crRows[0].payment_status !== "paid") {
          const cr = crRows[0];
          await pgPool.query("UPDATE coaching_requests SET payment_status='paid' WHERE id=$1", [requestId]);

          // Create reservation if not yet created
          if (cr.preferred_court_id && !cr.coaching_reservation_id) {
            const qrToken = randomUUID();
            const { rows: resRows } = await pgPool.query(
              `INSERT INTO reservations
                 (user_id, arena_id, court_id, reservation_date, start_time, end_time,
                  sport, players_count, status, payment_status, booking_type, qr_token, created_at)
               VALUES ($1,$2,$3,$4::date,$5::time,$6::time,'padel',$7,'confirmed','paid','coaching_session',$8,NOW())
               RETURNING id`,
              [cr.player_user_id, cr.arena_id, cr.preferred_court_id,
               cr.requested_date, cr.requested_start_time, cr.requested_end_time,
               cr.players_count ?? 2, qrToken]
            );
            const newResId = resRows[0]?.id ?? null;
            if (newResId) {
              await pgPool.query("UPDATE coaching_requests SET coaching_reservation_id=$1 WHERE id=$2", [newResId, requestId]);
            }
          }

          // Block coach slot
          await pgPool.query(
            `INSERT INTO coach_availability_exceptions (coach_user_id, exception_date, start_time, end_time, reason)
             VALUES ($1,$2::date,$3::time,$4::time,'booked') ON CONFLICT DO NOTHING`,
            [cr.coach_user_id, cr.requested_date, cr.requested_start_time, cr.requested_end_time]
          );

          try {
            await createNotification({ userId: cr.coach_user_id, title: "Session booked & paid", body: `Session on ${cr.requested_date} at ${String(cr.requested_start_time).slice(0,5)} is confirmed.`, type: "payment", linkUrl: "/coach" });
            await createNotification({ userId: cr.player_user_id, title: "Payment confirmed — session booked!", body: `Your coaching session on ${cr.requested_date} is confirmed.`, type: "payment", linkUrl: "/coaching-requests" });
          } catch (_) {}
        }
      }
    }

    return res.json({ status: session.payment_status, metadata: session.metadata });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to retrieve session" });
  }
});

// POST /api/stripe/webhook — Stripe sends checkout.session.completed here
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!STRIPE_SECRET_KEY) return res.status(503).json({ message: "Stripe not configured" });

  let event;
  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    if (STRIPE_WEBHOOK_SECRET) {
      const sig = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error("Stripe webhook signature error:", err.message);
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { default: pgPool } = await import("./pg-pool.mjs");

    try {
      if (session.metadata?.type === "reservation") {
        const reservationId = Number(session.metadata.reservationId);
        const { rows } = await pgPool.query("SELECT * FROM reservations WHERE id = $1", [reservationId]);
        if (rows.length && rows[0].payment_status !== "paid") {
          const r = rows[0];
          await pgPool.query("UPDATE reservations SET payment_status='paid' WHERE id=$1", [reservationId]);
          const existing = await pgPool.query("SELECT id FROM reservation_payments WHERE reservation_id = $1", [reservationId]);
          if (!existing.rows.length) {
            await pgPool.query(
              "INSERT INTO reservation_payments (reservation_id, amount, currency, status, method, paid_at) VALUES ($1,$2,'EUR','paid','stripe',NOW())",
              [reservationId, (session.amount_total / 100).toFixed(2)]
            );
          }
          await createNotification({
            userId: r.user_id,
            title: "Payment confirmed",
            body: `Your court reservation #${reservationId} is confirmed. Download your ticket below.`,
            type: "payment",
            linkUrl: `/payment/success?type=reservation&id=${reservationId}`,
          });
        }
      } else if (session.metadata?.type === "coaching_request") {
        const requestId = Number(session.metadata.requestId);
        const { rows: crRows } = await pgPool.query("SELECT * FROM coaching_requests WHERE id = $1", [requestId]);
        if (crRows.length && crRows[0].payment_status !== "paid") {
          const cr = crRows[0];
          await pgPool.query("UPDATE coaching_requests SET payment_status='paid' WHERE id=$1", [requestId]);

          // Create the court reservation if a court was selected
          let newReservationId = null;
          if (cr.preferred_court_id) {
            const { rows: courtRows } = await pgPool.query("SELECT * FROM courts WHERE id = $1", [cr.preferred_court_id]);
            const court = courtRows[0];
            if (court) {
              const qrToken = randomUUID();
              const { rows: resRows } = await pgPool.query(
                `INSERT INTO reservations
                   (user_id, arena_id, court_id, reservation_date, start_time, end_time,
                    sport, players_count, status, payment_status, booking_type, qr_token, created_at)
                 VALUES ($1,$2,$3,$4::date,$5::time,$6::time,'padel',$7,'confirmed','paid','coaching_session',$8,NOW())
                 RETURNING id`,
                [
                  cr.player_user_id, cr.arena_id, cr.preferred_court_id,
                  cr.requested_date, cr.requested_start_time, cr.requested_end_time,
                  cr.players_count ?? 2, qrToken,
                ]
              );
              newReservationId = resRows[0]?.id ?? null;
            }
          }
          if (newReservationId) {
            await pgPool.query("UPDATE coaching_requests SET coaching_reservation_id=$1 WHERE id=$2", [newReservationId, requestId]);
          }

          // Block that slot in coach availability as an exception
          await pgPool.query(
            `INSERT INTO coach_availability_exceptions
               (coach_user_id, exception_date, start_time, end_time, reason)
             VALUES ($1,$2::date,$3::time,$4::time,'booked')
             ON CONFLICT DO NOTHING`,
            [cr.coach_user_id, cr.requested_date, cr.requested_start_time, cr.requested_end_time]
          );

          // Notify coach
          await createNotification({
            userId: cr.coach_user_id,
            title: "Session booked & paid",
            body: `A player has paid for the session on ${cr.requested_date} at ${String(cr.requested_start_time).slice(0,5)}. The slot is now blocked.`,
            type: "payment",
            linkUrl: "/coach",
          });
          // Notify player
          await createNotification({
            userId: cr.player_user_id,
            title: "Payment confirmed — session booked!",
            body: `Your coaching session on ${cr.requested_date} at ${String(cr.requested_start_time).slice(0,5)} is confirmed.`,
            type: "payment",
            linkUrl: `/payment/success?type=coaching&id=${requestId}`,
          });
        }
      }
    } catch (processErr) {
      console.error("Webhook processing error:", processErr);
    }
  }

  return res.json({ received: true });
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

app.patch("/api/admin/users/:id/role", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    const nextRole = String(req.body?.role ?? "").trim().toLowerCase();
    const user = await updateMembershipRole(actor, Number(req.params.id), nextRole);
    await createNotification({
      userId: user.id,
      title: "Role updated",
      body: `Your arena role is now ${sanitizeUser(user).role}.`,
      type: "account",
      linkUrl: sanitizeUser(user).role === "coach" ? "/coach" : "/performance",
    });
    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to update user role" });
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

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await listNotificationsForUser(req.user.sub);
    return res.json({ notifications });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load notifications" });
  }
});

app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const notification = await markNotificationRead(req.user.sub, Number(req.params.id));
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.json({ notification });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to update notification" });
  }
});

app.get("/api/ai/analyses", requireAuth, async (req, res) => {
  res.json({ analyses: await listAnalysesForUser(req.user.sub) });
});

app.post("/api/ai/analyses", requireAuth, upload.single("video"), async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) {
      return res.status(401).json({ message: "User not found" });
    }
    if (!["coach", "admin", "super_admin"].includes(actor.effective_role)) {
      return res.status(403).json({ message: "Only coaches and admins can upload match videos" });
    }

    const title = String(req.body?.title ?? "").trim();
    const subjectUserId = Number(req.body?.subjectUserId ?? 0);
    const matchId = req.body?.matchId ? Number(req.body.matchId) : null;
    if (!title || !req.file || !subjectUserId) {
      return res.status(400).json({ message: "title, subjectUserId and video file are required" });
    }

    const analysis = await createAnalysis({
      userId: subjectUserId,
      title,
      videoName: req.file.originalname,
      uploaderUserId: actor.id,
      subjectUserId,
      matchId,
      storagePath: `/uploads/${req.file.filename}`,
      status: "pending_ai",
      summary: "Video uploaded successfully. Waiting for the AI module to process this match.",
    });

    try {
      await createNotification({
        userId: subjectUserId,
        title: "New match video uploaded",
        body: `${actor.first_name} ${actor.last_name} uploaded a new video for your analysis queue.`,
        type: "analysis",
        linkUrl: "/smartplay-ai",
      });
    } catch (notificationError) {
      console.warn("[ai/analyses] notification creation failed:", notificationError instanceof Error ? notificationError.message : notificationError);
    }

    return res.status(201).json({ analysis });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Unable to upload analysis video" });
  }
});

// ── Padel Places & Terrains ──────────────────────────────────────────────────

app.get("/api/padel/places", optionalAuth, async (req, res) => {
  try {
    const { city, region, search, indoor, outdoor } = req.query;
    const places = await listPadelPlaces({ city, region, search, indoor, outdoor });
    res.json({ places });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Unable to list padel places" });
  }
});

app.get("/api/padel/places/slug/:slug", optionalAuth, async (req, res) => {
  try {
    const place = await getPadelPlace(req.params.slug);
    if (!place) return res.status(404).json({ message: "Place not found" });
    const terrains = await listPadelTerrains(place.id);
    res.json({ place: { ...place, terrains } });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Unable to get padel place" });
  }
});

app.get("/api/padel/places/:id/availability", optionalAuth, async (req, res) => {
  try {
    const place = await getPadelPlace(req.params.id);
    if (!place) return res.status(404).json({ message: "Place not found" });
    const { date, startTime, durationMinutes = "90" } = req.query;
    if (!date) return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });
    const terrains = await getPadelAvailability(place.id, date, startTime, Number(durationMinutes));
    res.json({ placeId: place.id, date, startTime: startTime ?? null, durationMinutes: Number(durationMinutes), terrains });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Unable to check availability" });
  }
});

app.get("/api/padel/places/:id/terrains", optionalAuth, async (req, res) => {
  try {
    const place = await getPadelPlace(req.params.id);
    if (!place) return res.status(404).json({ message: "Place not found" });
    const terrains = await listPadelTerrains(place.id);
    res.json({ terrains });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Unable to list terrains" });
  }
});

app.get("/api/padel/places/:id", optionalAuth, async (req, res) => {
  try {
    const place = await getPadelPlace(req.params.id);
    if (!place) return res.status(404).json({ message: "Place not found" });
    const terrains = await listPadelTerrains(place.id);
    res.json({ place: { ...place, terrains } });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Unable to get padel place" });
  }
});

app.get("/api/padel/terrains/:id", optionalAuth, async (req, res) => {
  try {
    const terrain = await getPadelTerrain(req.params.id);
    if (!terrain) return res.status(404).json({ message: "Terrain not found" });
    res.json({ terrain });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : "Unable to get terrain" });
  }
});

app.post("/api/padel/reservations", requireAuth, async (req, res) => {
  try {
    const { courtId, reservationDate, startTime, durationMinutes = 90 } = req.body ?? {};
    if (!courtId || !reservationDate || !startTime) {
      return res.status(400).json({ message: "courtId, reservationDate, and startTime are required" });
    }
    const reservation = await createPadelReservation({
      userId: req.user.sub,
      courtId: Number(courtId),
      reservationDate,
      startTime,
      durationMinutes: Number(durationMinutes),
    });
    res.status(201).json({ reservation });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to create reservation" });
  }
});

io.on("connection", async (socket) => {
  try {
    socket.emit("scores:update", { matches: await listMatches() });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unable to push initial live scores:", error);
  }
});

// ── Smart Scoring ────────────────────────────────────────────────────────────

app.get("/api/matches/:id/score", optionalAuth, async (req, res) => {
  try {
    const score = await getMatchScore(Number(req.params.id));
    if (!score) return res.status(404).json({ message: "Match not found" });
    res.json({ score });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load score" });
  }
});

app.patch("/api/matches/:id/score", requireAuth, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) return res.status(401).json({ message: "User not found" });
    const role = actor.effective_role ?? actor.role;
    const isAdmin = ["admin", "super_admin"].includes(role);
    const isCoach = role === "coach";
    if (!isAdmin && !isCoach) {
      return res.status(403).json({ message: "Admins and coaches only" });
    }
    if (isCoach) {
      const { default: pgPool } = await import("./pg-pool.mjs");
      const { rows } = await pgPool.query(
        `SELECT r.arena_id FROM reservations r
         JOIN matches m ON m.reservation_id = r.id
         WHERE m.id = $1`,
        [Number(req.params.id)]
      );
      if (!rows.length || Number(rows[0].arena_id) !== Number(actor.arena_id)) {
        return res.status(403).json({ message: "Coaches can only edit scores for matches in their arena" });
      }
    }
    const { score1, score2, status, reason } = req.body ?? {};
    const updated = await updateMatchScore({
      matchId: Number(req.params.id),
      score1,
      score2,
      status,
      actorId: actor.id,
      actorRole: role,
      reason,
    });
    io.emit("scores:update", { matches: await listMatches() });
    res.json({ score: updated });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to update score" });
  }
});

app.get("/api/matches/:id/score-events", optionalAuth, async (req, res) => {
  try {
    const events = await getScoreEvents(Number(req.params.id), Number(req.query.limit ?? 50));
    res.json({ events });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load events" });
  }
});

app.post("/api/matches/:id/score-events", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { eventType, playerName, team, setNumber, source, confidence, metadata } = req.body ?? {};
    const event = await createScoreEvent({
      matchId: Number(req.params.id),
      eventType,
      playerName,
      team,
      setNumber,
      source,
      confidence,
      metadata,
    });
    res.status(201).json({ event });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to create event" });
  }
});

app.get("/api/matches/:id/score-corrections", requireAuth, requireAdmin, async (req, res) => {
  try {
    const logs = await getScoreCorrectionLogs(Number(req.params.id));
    res.json({ logs });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load correction logs" });
  }
});

app.get("/api/admin/scoring", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) return res.status(401).json({ message: "User not found" });
    const [matches, recentActivity] = await Promise.all([
      listScoringMatches(actor, 50),
      getRecentScoreActivity(10),
    ]);
    res.json({ matches, recentActivity });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load scoring data" });
  }
});

// ── Player Analytics ──────────────────────────────────────────────────────────

app.get("/api/player/stats", requireAuth, async (req, res) => {
  try {
    const stats = await getPlayerStats(req.user.sub);
    res.json({ stats });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load player stats" });
  }
});

app.get("/api/player/history/matches", requireAuth, async (req, res) => {
  try {
    const matches = await getPlayerMatchHistory(req.user.sub, Number(req.query.limit ?? 20));
    res.json({ matches });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load match history" });
  }
});

app.get("/api/player/history/reservations", requireAuth, async (req, res) => {
  try {
    const reservations = await getPlayerReservationHistory(req.user.sub, Number(req.query.limit ?? 20));
    res.json({ reservations });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load reservation history" });
  }
});

app.get("/api/player/history/competitions", requireAuth, async (req, res) => {
  try {
    const competitions = await getPlayerCompetitionHistory(req.user.sub);
    res.json({ competitions });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load competition history" });
  }
});

app.get("/api/player/ai-analysis", requireAuth, async (req, res) => {
  try {
    const data = await getPlayerAiAnalysis(req.user.sub);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load AI analysis" });
  }
});

app.get("/api/admin/platform-stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await getPlatformStats();
    res.json({ stats });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load platform stats" });
  }
});

app.get("/api/admin/revenue", requireAuth, requireAdmin, async (req, res) => {
  try {
    const actor = await attachActor(req);
    const arenaId = actor?.platform_role === "super_admin" ? null : (actor?.arena_id ?? null);
    const revenue = await getRevenueSummary(arenaId);
    res.json(revenue);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load revenue" });
  }
});

// ── SmartPlay AI Placeholder ──────────────────────────────────────────────────

app.get("/api/smartplay/status", async (_req, res) => {
  try {
    const status = await getSmartPlayStatus();
    res.json(status);
  } catch {
    res.json({ connected: false, message: "Unable to check AI service status." });
  }
});

app.get("/api/smartplay/player/:playerId/analysis", requireAuth, async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    const matchId = req.query.matchId ? Number(req.query.matchId) : null;
    const data = await getPlayerAiMetrics(playerId, matchId);
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load player AI metrics" });
  }
});

app.get("/api/smartplay/match/:matchId/analysis", optionalAuth, async (req, res) => {
  try {
    const data = await getMatchAnalysis(Number(req.params.matchId));
    res.json(data);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load match analysis" });
  }
});

app.post("/api/smartplay/analysis-jobs", requireAuth, async (req, res) => {
  try {
    const actor = await attachActor(req);
    if (!actor) return res.status(401).json({ message: "User not found" });
    const { userId, matchId, jobType } = req.body ?? {};
    const targetUserId = userId ? Number(userId) : actor.id;
    const job = await createAnalysisJob({
      userId: targetUserId,
      matchId: matchId ? Number(matchId) : null,
      jobType: jobType ?? "full_match",
      requestedByUserId: actor.id,
    });
    res.status(201).json({ job });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to create analysis job" });
  }
});

app.get("/api/smartplay/analysis-jobs", requireAuth, async (req, res) => {
  try {
    const jobs = await listAnalysisJobs(req.user.sub);
    res.json({ jobs });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load analysis jobs" });
  }
});

// ── Coaching: Coach self-management ──────────────────────────────────────────

app.get("/api/coach/profile", requireAuth, async (req, res) => {
  try {
    const profile = await getCoachProfile(req.user.sub);
    res.json({ profile });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load coach profile" });
  }
});

app.patch("/api/coach/profile", requireAuth, async (req, res) => {
  try {
    const profile = await upsertCoachProfile(req.user.sub, req.user.sub, req.body);
    res.json({ profile });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to update coach profile" });
  }
});

app.post("/api/coach/profile/avatar", requireAuth, uploadImage.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const imageUrl = `/uploads/${req.file.filename}`;
    await updateCoachAvatar(req.user.sub, imageUrl);
    res.json({ imageUrl });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to upload avatar" });
  }
});

app.get("/api/coach/availability", requireAuth, async (req, res) => {
  try {
    const availability = await getCoachAvailability(req.user.sub);
    res.json(availability);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load availability" });
  }
});

app.put("/api/coach/availability", requireAuth, async (req, res) => {
  try {
    const { rules } = req.body;
    if (!Array.isArray(rules)) return res.status(400).json({ message: "rules must be an array" });
    await setCoachAvailabilityRules(req.user.sub, rules);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to save availability" });
  }
});

app.post("/api/coach/availability/exceptions", requireAuth, async (req, res) => {
  try {
    const exception = await addCoachAvailabilityException(req.user.sub, req.body);
    res.status(201).json({ exception });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to add exception" });
  }
});

app.get("/api/coach/requests", requireAuth, async (req, res) => {
  try {
    const requests = await listCoachingRequestsForCoach(req.user.sub);
    res.json({ requests });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load requests" });
  }
});

app.patch("/api/coach/requests/:id/respond", requireAuth, async (req, res) => {
  try {
    const result = await respondToCoachingRequest(req.user.sub, Number(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to respond to request" });
  }
});

app.get("/api/coach/coaching-sessions", requireAuth, async (req, res) => {
  try {
    const sessions = await listCoachingSessionsForUser(req.user.sub);
    res.json({ sessions });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load sessions" });
  }
});

// ── Coaching: Player discovery & requests ─────────────────────────────────────

app.get("/api/player/coaches", requireAuth, async (req, res) => {
  try {
    const { arenaId, search, expertise, language } = req.query;
    const coaches = await listCoachProfiles({
      arenaId: arenaId ? Number(arenaId) : undefined,
      search: search || undefined,
      expertise: expertise || undefined,
      language: language || undefined,
    });
    res.json({ coaches });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load coaches" });
  }
});

app.get("/api/player/coaches/:id", requireAuth, async (req, res) => {
  try {
    const profile = await getCoachPublicProfile(Number(req.params.id));
    res.json({ profile });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Coach not found" });
  }
});

app.get("/api/player/coaches/:id/slots", requireAuth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "date query param required" });
    const slots = await getCoachAvailableSlots(Number(req.params.id), date);
    res.json({ slots });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load slots" });
  }
});

app.post("/api/player/coaching-requests", requireAuth, async (req, res) => {
  try {
    const request = await createCoachingRequest(req.user.sub, req.body);
    res.status(201).json({ request });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to create coaching request" });
  }
});

app.get("/api/player/coaching-requests", requireAuth, async (req, res) => {
  try {
    const requests = await listCoachingRequestsForPlayer(req.user.sub);
    res.json({ requests });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load coaching requests" });
  }
});

app.get("/api/player/coaching-sessions", requireAuth, async (req, res) => {
  try {
    const sessions = await listCoachingSessionsForUser(req.user.sub);
    res.json({ sessions });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load coaching sessions" });
  }
});

// ── Coaching: Admin management ────────────────────────────────────────────────

app.get("/api/admin/coaches", requireAuth, async (req, res) => {
  try {
    const coaches = await listAdminCoaches(req.user.sub);
    res.json({ coaches });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load coaches" });
  }
});

app.post("/api/admin/coaches", requireAuth, async (req, res) => {
  try {
    const { coachUserId, ...profileData } = req.body;
    if (!coachUserId) return res.status(400).json({ message: "coachUserId required" });
    const profile = await upsertCoachProfile(req.user.sub, coachUserId, profileData);
    res.status(201).json({ profile });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to create coach profile" });
  }
});

app.patch("/api/admin/coaches/:id/profile", requireAuth, async (req, res) => {
  try {
    const profile = await upsertCoachProfile(req.user.sub, Number(req.params.id), req.body);
    res.json({ profile });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to update coach profile" });
  }
});

app.post("/api/admin/assign-coach-club", requireAuth, async (req, res) => {
  try {
    const { coachUserId, arenaId } = req.body;
    if (!coachUserId || !arenaId) return res.status(400).json({ message: "coachUserId and arenaId required" });
    await assignCoachToArena(req.user.sub, coachUserId, arenaId);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to assign coach" });
  }
});

// ── Coach booking wizard helpers ─────────────────────────────────────────────

app.get("/api/player/coach-booking/arenas", requireAuth, async (req, res) => {
  try {
    const places = await listArenasForCoachBooking();
    res.json({ places });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load arenas" });
  }
});

app.get("/api/player/coach-booking/arenas/:id/courts", requireAuth, async (req, res) => {
  try {
    const arenaId = Number(req.params.id);
    const { date, startTime, endTime } = req.query;
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: "date, startTime and endTime are required" });
    }
    const { default: pgPool } = await import("./pg-pool.mjs");
    const { rows: courts } = await pgPool.query(
      `SELECT id, name, sport, status, price_per_hour, currency, court_type, has_lighting, surface_type
       FROM courts
       WHERE arena_id = $1 AND status = 'available'
       ORDER BY id ASC`,
      [arenaId]
    );
    const results = await Promise.all(courts.map(async (court) => {
      const { rows: conflicts } = await pgPool.query(
        `SELECT id FROM reservations
         WHERE court_id = $1 AND reservation_date = $2::date AND status = 'confirmed'
           AND start_time < $3::time AND end_time > $4::time`,
        [court.id, date, endTime, startTime]
      );
      return { ...court, available: conflicts.length === 0 };
    }));
    res.json({ courts: results.filter((c) => c.available) });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to load available courts" });
  }
});

// ── Notifications read-all ────────────────────────────────────────────────────

app.patch("/api/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const { default: pgPool } = await import("./pg-pool.mjs");
    await pgPool.query("UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL", [req.user.sub]);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Unable to mark all read" });
  }
});

// ── Live Score Loop ───────────────────────────────────────────────────────────

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
process.on("unhandledRejection", (reason) => {
  console.error("[CRASH PREVENTED] Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[CRASH PREVENTED] Uncaught exception:", err);
});

httpServer.listen(PORT, () => {
  console.log(`ULTIMA demo API listening on http://localhost:${PORT}`);
  if (ENABLE_TEST_SEED && testSetup) {
    console.log(
      `[ULTIMA TEST ACCOUNTS] arena="${testSetup.arena.name}" users=admin@ultima-arena.test, coach@ultima-arena.test, player1@ultima-arena.test, player2@ultima-arena.test`
    );
    console.log("[ULTIMA TEST ACCOUNTS] password source: env ULTIMA_TEST_PASSWORD");
  }
});

app.use((error, _req, res, next) => {
  if (!error) {
    return next();
  }
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ message: error.message });
  }
  return res.status(500).json({ message: error instanceof Error ? error.message : "Unexpected server error" });
});
