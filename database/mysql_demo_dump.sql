-- ULTIMA MySQL demo database dump
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

INSERT INTO users (id, first_name, last_name, email, password_hash, role, status, created_at) VALUES
(1, 'Ahmed', 'Bouazizi', 'ahmed@email.com', '$2b$10$o3uQcXa5CZKz8fpHmsw4nO3NrSnNtoK4ijqkxWTlpaee4oH4.VKaG', 'player', 'active', '2026-04-02 18:02:54.330'),
(2, 'Imed', 'Trabelsi', 'sami@email.com', '$2b$10$wS82IslNVJ4npYfocISd9exulsDWTmuQJ10ptDBxTdNIFUP2.BRAq', 'coach', 'active', '2026-04-02 18:02:54.459'),
(3, 'Meryam', 'Trbsli', 'mariem@email.com', '$2b$10$F8SydrXWOrtb2ooWFxxfjui/QV5a72zfQOutlymkNlNohK6ZRklh6', 'player', 'inactive', '2026-04-02 18:02:54.591'),
(4, 'Youssef', 'Khelifi', 'youssef@email.com', '$2b$10$Pmk5bKMDtfE0c2.ZpbZPJeVqpwUCBTpuf3ZkgXsRRQvEsSrrRYJqy', 'player', 'active', '2026-04-02 18:02:54.722'),
(5, 'Aziz', 'Ferchichi', 'aziz@email.com', '$2b$10$k5R6s63aUjWiMRHpWV76v.1k6WgR1nKWDHPRj0Nr0NYXUoEHNGKre', 'admin', 'active', '2026-04-02 18:02:54.851'),
(6, 'NotFerchichi', 'NotAziz', 'Notaziz@email.com', '$2b$10$I4FlnmpzIQJyUO60oCse/OWVjoPRUS9ysyJAQn.sJ6ZHzZ8M1kZCG', 'coach', 'active', '2026-04-02 19:04:31.023');


INSERT INTO courts (id, name, sport, status, has_summa, location, created_at) VALUES
(1, 'Terrain Padel A', 'Padel', 'available', 0, 'ULTIMA Arena', '2026-04-02 18:02:54.851'),
(2, 'Terrain Padel B', 'Padel', 'available', 0, 'ULTIMA Arena', '2026-04-02 18:02:54.851'),
(3, 'Terrain Tennis 1', 'Tennis', 'occupied', 0, 'Court Central', '2026-04-02 18:02:54.851'),
(4, 'Terrain Tennis 2', 'Tennis', 'available', 0, 'Court Central', '2026-04-02 18:02:54.851'),
(5, 'Terrain Padel C (SUMMA)', 'Padel', 'available', 1, 'ULTIMA Arena', '2026-04-02 18:02:54.852'),
(6, 'Terrain Tennis 3 (SUMMA)', 'Tennis', 'available', 1, 'Court Central', '2026-04-02 18:02:54.852');


INSERT INTO reservations (id, user_id, court_id, reservation_date, start_time, end_time, status, qr_token, notes, created_at) VALUES
(1, 5, 1, '2026-04-10', '15:30', '17:00', 'confirmed', '214fe197-f225-4588-acb2-6722f570a8a2', '', '2026-04-02 18:12:19.858'),
(2, 1, 1, '2004-05-11', '17:00', '18:30', 'confirmed', '232a87b3-8908-4c20-94b9-2af4767195e6', '', '2026-04-02 18:49:25.552'),
(3, 5, 1, '2025-01-01', '08:00', '09:30', 'confirmed', '4bf73247-224f-4ee5-8fec-dcd0b2378e7a', '', '2026-04-02 18:56:22.101'),
(4, 6, 5, '2026-04-03', '08:00', '09:30', 'confirmed', '61fb38dc-4960-4d2c-acbd-0da3f5d4272c', '', '2026-04-02 19:05:29.386');


INSERT INTO competitions (id, name, sport, description, start_date, location, max_participants, status, created_at) VALUES
(1, 'Tournoi Padel Printemps 2026', 'Padel', 'Tournoi de demonstration ULTIMA pour les joueurs confirmes.', '2026-03-15', 'ULTIMA Arena', 32, 'open', '2026-04-02 18:02:54.852'),
(2, 'Open Tennis La Marsa', 'Tennis', 'Competition open avec diffusion des scores en direct.', '2026-04-22', 'Court Central', 32, 'open', '2026-04-02 18:02:54.852'),
(3, 'Championnat Interclubs', 'Padel & Tennis', 'Tournoi complet reserve aux clubs partenaires.', '2026-05-10', 'ULTIMA Arena', 32, 'full', '2026-04-02 18:02:54.852'),
(4, 'Tournoi Junior Padel', 'Padel', 'Competition junior dediee a la detection de talents.', '2026-06-05', 'Terrain B', 16, 'open', '2026-04-02 18:02:54.852');


INSERT INTO competition_registrations (id, competition_id, user_id, status, created_at) VALUES
(1, 1, 1, 'registered', '2026-04-02 18:02:54.852'),
(2, 1, 2, 'registered', '2026-04-02 18:02:54.852'),
(3, 1, 3, 'registered', '2026-04-02 18:02:54.852'),
(4, 1, 4, 'registered', '2026-04-02 18:02:54.852'),
(5, 2, 1, 'registered', '2026-04-02 18:02:54.852'),
(6, 2, 2, 'registered', '2026-04-02 18:02:54.852'),
(7, 2, 3, 'registered', '2026-04-02 18:02:54.852'),
(8, 2, 4, 'registered', '2026-04-02 18:02:54.852'),
(9, 3, 1, 'registered', '2026-04-02 18:02:54.852'),
(10, 3, 2, 'registered', '2026-04-02 18:02:54.852'),
(11, 3, 3, 'registered', '2026-04-02 18:02:54.852'),
(12, 3, 4, 'registered', '2026-04-02 18:02:54.852'),
(13, 4, 1, 'registered', '2026-04-02 18:02:54.852'),
(14, 4, 2, 'registered', '2026-04-02 18:02:54.852'),
(15, 4, 3, 'registered', '2026-04-02 18:02:54.852'),
(16, 4, 4, 'registered', '2026-04-02 18:02:54.852');


INSERT INTO matches (id, competition_id, court_id, player1_name, player2_name, status, current_set, scheduled_at, score1, score2, created_at) VALUES
(1, 1, 5, 'Ahmed B.', 'Sami T.', 'live', 3, '2026-04-02 14:00:00.000', '[6,4,7]', '[3,6,7]', '2026-04-02 18:02:54.852'),
(2, 2, 3, 'Youssef K.', 'Mariem F.', 'live', 2, '2026-04-02 15:00:00.000', '[6,7]', '[2,7]', '2026-04-02 18:02:54.852'),
(3, 1, 1, 'Aziz F.', 'Nabil M.', 'finished', 2, '2026-04-02 11:00:00.000', '[6,6]', '[4,3]', '2026-04-02 18:02:54.852'),
(4, 2, 4, 'Ines R.', 'Leila B.', 'upcoming', 1, '2026-04-02 18:00:00.000', '[0]', '[0]', '2026-04-02 18:02:54.852');


INSERT INTO performance_snapshots (id, user_id, week_label, ranking_score, wins, losses, created_at) VALUES
(1, 1, 'S1', 1050, 3, 0, '2026-04-02 18:02:54.852'),
(2, 1, 'S2', 1085, 3, 1, '2026-04-02 18:02:54.852'),
(3, 1, 'S3', 1120, 4, 2, '2026-04-02 18:02:54.852'),
(4, 1, 'S4', 1155, 4, 0, '2026-04-02 18:02:54.852'),
(5, 1, 'S5', 1215, 5, 1, '2026-04-02 18:02:54.852'),
(6, 1, 'S6', 1250, 5, 2, '2026-04-02 18:02:54.852'),
(7, 1, 'S7', 1285, 6, 0, '2026-04-02 18:02:54.852'),
(8, 1, 'S8', 1320, 6, 1, '2026-04-02 18:02:54.852');


INSERT INTO performance_profiles (user_id, service, return_skill, volley, endurance, strategy, mental, updated_at) VALUES
(1, 85, 72, 90, 68, 78, 82, '2026-04-02 18:02:54.852');


INSERT INTO ai_analyses (id, user_id, title, video_name, status, summary, created_at) VALUES
(1, 1, 'Analyse Match Demo', 'match-demo.mp4', 'completed', 'Heatmaps generees, patterns de deplacement detectes et recommandations pretes.', '2026-04-02 18:02:54.852');


INSERT INTO activity_logs (id, action, actor_name, detail, created_at) VALUES
(10, 'Reservation confirmee', 'Utilisateur #6', '2026-04-03 08:00 - Court #5', '2026-04-02 19:05:29.386'),
(9, 'Nouveau compte', 'NotFerchichi NotAziz', 'Role: coach', '2026-04-02 19:04:31.023'),
(8, 'Reservation confirmee', 'Utilisateur #5', '2025-01-01 08:00 - Court #1', '2026-04-02 18:56:22.101'),
(7, 'Reservation confirmee', 'Utilisateur #1', '2004-05-11 17:00 - Court #1', '2026-04-02 18:49:25.552'),
(6, 'Reservation confirmee', 'Utilisateur #5', '2026-04-10 15:30 - Court #1', '2026-04-02 18:12:19.858'),
(1, 'Reservation confirmee', 'Ahmed B.', 'Terrain Padel A - 15:30', '2026-04-02 18:02:54.852'),
(2, 'Inscription tournoi', 'Sami T.', 'Open Tennis La Marsa', '2026-04-02 18:02:54.853'),
(3, 'Score mis a jour', 'Systeme SUMMA', 'Terrain Padel C (SUMMA)', '2026-04-02 18:02:54.853'),
(4, 'Nouveau compte', 'Ines R.', 'Role: Joueur', '2026-04-02 18:02:54.853'),
(5, 'Match termine', 'Systeme', 'Aziz F. vs Nabil M.', '2026-04-02 18:02:54.853');


