import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "server", "data", "ultima-demo.json");
const outputDir = path.join(projectRoot, "database");
const outputPath = path.join(outputDir, "mysql_demo_dump.sql");

const state = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

fs.mkdirSync(outputDir, { recursive: true });

const sqlString = (value) => {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
};

const sqlNumber = (value) => {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return String(value);
};

const sqlJson = (value) => sqlString(JSON.stringify(value));

const toMysqlDateTime = (value) => {
  if (!value) {
    return null;
  }

  return String(value).replace("T", " ").replace("Z", "");
};

const insertRows = (table, columns, rows, valueMapper = (row, column) => row[column]) => {
  if (!rows.length) {
    return `-- No rows for ${table}\n`;
  }

  const values = rows
    .map((row) => {
      const rowValues = columns.map((column) => valueMapper(row, column));
      return `(${rowValues.join(", ")})`;
    })
    .join(",\n");

  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${values};\n\n`;
};

const content = `-- ULTIMA MySQL demo database dump
-- Generated from server/data/ultima-demo.json

DROP DATABASE IF EXISTS ultima_demo;
CREATE DATABASE ultima_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ultima_demo;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('player', 'coach', 'admin') NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL
);

CREATE TABLE courts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL UNIQUE,
  sport VARCHAR(100) NOT NULL,
  status ENUM('available', 'occupied', 'maintenance') NOT NULL,
  has_summa BOOLEAN NOT NULL DEFAULT FALSE,
  location VARCHAR(191) NOT NULL,
  created_at DATETIME(3) NOT NULL
);

CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  court_id INT NOT NULL,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
  qr_token CHAR(36) NOT NULL UNIQUE,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_reservations_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_reservations_court FOREIGN KEY (court_id) REFERENCES courts(id),
  INDEX idx_reservations_court_date (court_id, reservation_date, start_time, end_time)
);

CREATE TABLE competitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  sport VARCHAR(100) NOT NULL,
  description TEXT NULL,
  start_date DATE NOT NULL,
  location VARCHAR(191) NOT NULL,
  max_participants INT NOT NULL,
  status ENUM('open', 'full', 'closed') NOT NULL DEFAULT 'open',
  created_at DATETIME(3) NOT NULL
);

CREATE TABLE competition_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  competition_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('registered', 'cancelled') NOT NULL DEFAULT 'registered',
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_competition_registrations_competition FOREIGN KEY (competition_id) REFERENCES competitions(id),
  CONSTRAINT fk_competition_registrations_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_competition_user (competition_id, user_id)
);

CREATE TABLE matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  competition_id INT NULL,
  court_id INT NULL,
  player1_name VARCHAR(191) NOT NULL,
  player2_name VARCHAR(191) NOT NULL,
  status ENUM('live', 'finished', 'upcoming') NOT NULL DEFAULT 'upcoming',
  current_set INT NOT NULL DEFAULT 1,
  scheduled_at DATETIME(3) NULL,
  score1 JSON NOT NULL,
  score2 JSON NOT NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_matches_competition FOREIGN KEY (competition_id) REFERENCES competitions(id),
  CONSTRAINT fk_matches_court FOREIGN KEY (court_id) REFERENCES courts(id)
);

CREATE TABLE performance_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  week_label VARCHAR(20) NOT NULL,
  ranking_score INT NOT NULL,
  wins INT NOT NULL,
  losses INT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_performance_snapshots_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE performance_profiles (
  user_id INT PRIMARY KEY,
  service INT NOT NULL,
  return_skill INT NOT NULL,
  volley INT NOT NULL,
  endurance INT NOT NULL,
  strategy INT NOT NULL,
  mental INT NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_performance_profiles_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE ai_analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(191) NOT NULL,
  video_name VARCHAR(191) NOT NULL,
  status ENUM('queued', 'processing', 'completed') NOT NULL DEFAULT 'queued',
  summary TEXT NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_ai_analyses_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(191) NOT NULL,
  actor_name VARCHAR(191) NOT NULL,
  detail TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL
);

${insertRows(
  "users",
  ["id", "first_name", "last_name", "email", "password_hash", "role", "status", "created_at"],
  state.users,
  (row, column) => {
    if (column === "id") {
      return sqlNumber(row[column]);
    }

    if (column === "created_at") {
      return sqlString(toMysqlDateTime(row[column]));
    }

    return sqlString(row[column]);
  }
)}
${insertRows(
  "courts",
  ["id", "name", "sport", "status", "has_summa", "location", "created_at"],
  state.courts,
  (row, column) => {
    if (column === "id" || column === "has_summa") {
      return sqlNumber(row[column]);
    }

    if (column === "created_at") {
      return sqlString(toMysqlDateTime(row[column]));
    }

    return sqlString(row[column]);
  }
)}
${insertRows(
  "reservations",
  ["id", "user_id", "court_id", "reservation_date", "start_time", "end_time", "status", "qr_token", "notes", "created_at"],
  state.reservations,
  (row, column) => {
    if (["id", "user_id", "court_id"].includes(column)) {
      return sqlNumber(row[column]);
    }

    if (column === "created_at") {
      return sqlString(toMysqlDateTime(row[column]));
    }

    return sqlString(row[column]);
  }
)}
${insertRows(
  "competitions",
  ["id", "name", "sport", "description", "start_date", "location", "max_participants", "status", "created_at"],
  state.competitions,
  (row, column) => {
    if (["id", "max_participants"].includes(column)) {
      return sqlNumber(row[column]);
    }

    if (column === "created_at") {
      return sqlString(toMysqlDateTime(row[column]));
    }

    return sqlString(row[column]);
  }
)}
${insertRows(
  "competition_registrations",
  ["id", "competition_id", "user_id", "status", "created_at"],
  state.competitionRegistrations,
  (row, column) => {
    if (["id", "competition_id", "user_id"].includes(column)) {
      return sqlNumber(row[column]);
    }

    if (column === "created_at") {
      return sqlString(toMysqlDateTime(row[column]));
    }

    return sqlString(row[column]);
  }
)}
${insertRows(
  "matches",
  ["id", "competition_id", "court_id", "player1_name", "player2_name", "status", "current_set", "scheduled_at", "score1", "score2", "created_at"],
  state.matches,
  (row, column) => {
    if (["id", "competition_id", "court_id", "current_set"].includes(column)) {
      return sqlNumber(row[column]);
    }

    if (["score1", "score2"].includes(column)) {
      return sqlJson(row[column]);
    }

    if (["scheduled_at", "created_at"].includes(column)) {
      return sqlString(toMysqlDateTime(row[column]));
    }

    return sqlString(row[column]);
  }
)}
${insertRows(
  "performance_snapshots",
  ["id", "user_id", "week_label", "ranking_score", "wins", "losses", "created_at"],
  state.performanceSnapshots,
  (row, column) => {
    if (["id", "user_id", "ranking_score", "wins", "losses"].includes(column)) {
      return sqlNumber(row[column]);
    }

    if (column === "created_at") {
      return sqlString(toMysqlDateTime(row[column]));
    }

    return sqlString(row[column]);
  }
)}
${insertRows(
  "performance_profiles",
  ["user_id", "service", "return_skill", "volley", "endurance", "strategy", "mental", "updated_at"],
  state.performanceProfiles,
  (row, column) => {
    if (["user_id", "service", "return_skill", "volley", "endurance", "strategy", "mental"].includes(column)) {
      return sqlNumber(row[column]);
    }

    if (column === "updated_at") {
      return sqlString(toMysqlDateTime(row[column]));
    }

    return sqlString(row[column]);
  }
)}
${insertRows(
  "ai_analyses",
  ["id", "user_id", "title", "video_name", "status", "summary", "created_at"],
  state.aiAnalyses,
  (row, column) => {
    if (["id", "user_id"].includes(column)) {
      return sqlNumber(row[column]);
    }

    if (column === "created_at") {
      return sqlString(toMysqlDateTime(row[column]));
    }

    return sqlString(row[column]);
  }
)}
${insertRows(
  "activity_logs",
  ["id", "action", "actor_name", "detail", "created_at"],
  state.activityLogs,
  (row, column) => {
    if (column === "id") {
      return sqlNumber(row[column]);
    }

    if (column === "created_at") {
      return sqlString(toMysqlDateTime(row[column]));
    }

    return sqlString(row[column]);
  }
)}
`;

fs.writeFileSync(outputPath, content, "utf8");
console.log(`Generated ${path.relative(projectRoot, outputPath)}`);
