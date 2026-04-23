USE ultima_demo;

CREATE TABLE IF NOT EXISTS arenas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  location VARCHAR(191) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);

INSERT INTO arenas (name, slug, location)
SELECT 'ULTIMA Arena', 'ultima-arena', 'La Marsa'
WHERE NOT EXISTS (
  SELECT 1 FROM arenas WHERE slug = 'ultima-arena'
);

CREATE TABLE IF NOT EXISTS arena_memberships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  arena_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('admin', 'coach', 'player') NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_arena_membership (arena_id, user_id)
);

CREATE TABLE IF NOT EXISTS reservation_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reservation_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_reservation_participant (reservation_id, user_id)
);

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'platform_role'
  ),
  'SELECT 1',
  "ALTER TABLE users ADD COLUMN platform_role ENUM('member','super_admin') NOT NULL DEFAULT 'member' AFTER role"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courts' AND COLUMN_NAME = 'arena_id'
  ),
  'SELECT 1',
  "ALTER TABLE courts ADD COLUMN arena_id INT NULL AFTER id"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courts' AND COLUMN_NAME = 'min_players'
  ),
  'SELECT 1',
  "ALTER TABLE courts ADD COLUMN min_players INT NOT NULL DEFAULT 2 AFTER location"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courts' AND COLUMN_NAME = 'max_players'
  ),
  'SELECT 1',
  "ALTER TABLE courts ADD COLUMN max_players INT NOT NULL DEFAULT 4 AFTER min_players"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courts' AND COLUMN_NAME = 'opening_time'
  ),
  'SELECT 1',
  "ALTER TABLE courts ADD COLUMN opening_time TIME NOT NULL DEFAULT '08:00:00' AFTER max_players"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courts' AND COLUMN_NAME = 'closing_time'
  ),
  'SELECT 1',
  "ALTER TABLE courts ADD COLUMN closing_time TIME NOT NULL DEFAULT '22:00:00' AFTER opening_time"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'competitions' AND COLUMN_NAME = 'arena_id'
  ),
  'SELECT 1',
  "ALTER TABLE competitions ADD COLUMN arena_id INT NULL AFTER id"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'arena_id'
  ),
  'SELECT 1',
  "ALTER TABLE matches ADD COLUMN arena_id INT NULL AFTER id"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs' AND COLUMN_NAME = 'arena_id'
  ),
  'SELECT 1',
  "ALTER TABLE activity_logs ADD COLUMN arena_id INT NULL AFTER id"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs' AND COLUMN_NAME = 'actor_user_id'
  ),
  'SELECT 1',
  "ALTER TABLE activity_logs ADD COLUMN actor_user_id INT NULL AFTER actor_name"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @default_arena_id := (SELECT id FROM arenas WHERE slug = 'ultima-arena' LIMIT 1);

UPDATE users
SET platform_role = CASE
  WHEN email = 'aziz@email.com' THEN 'super_admin'
  ELSE 'member'
END;

UPDATE courts SET arena_id = @default_arena_id WHERE arena_id IS NULL;
UPDATE competitions SET arena_id = @default_arena_id WHERE arena_id IS NULL;
UPDATE matches SET arena_id = @default_arena_id WHERE arena_id IS NULL;
UPDATE activity_logs SET arena_id = @default_arena_id WHERE arena_id IS NULL;

INSERT INTO arena_memberships (arena_id, user_id, role, status)
SELECT
  @default_arena_id,
  u.id,
  CASE
    WHEN u.email = 'sami@email.com' THEN 'admin'
    WHEN u.role = 'coach' THEN 'coach'
    ELSE 'player'
  END,
  CASE
    WHEN u.status = 'inactive' THEN 'inactive'
    ELSE 'active'
  END
FROM users u
WHERE u.email <> 'aziz@email.com'
  AND NOT EXISTS (
    SELECT 1
    FROM arena_memberships am
    WHERE am.user_id = u.id
      AND am.arena_id = @default_arena_id
  );

INSERT INTO reservation_participants (reservation_id, user_id)
SELECT r.id, r.user_id
FROM reservations r
WHERE NOT EXISTS (
  SELECT 1
  FROM reservation_participants rp
  WHERE rp.reservation_id = r.id
    AND rp.user_id = r.user_id
);

ALTER TABLE courts MODIFY arena_id INT NOT NULL;
ALTER TABLE competitions MODIFY arena_id INT NOT NULL;
ALTER TABLE matches MODIFY arena_id INT NOT NULL;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courts' AND INDEX_NAME = 'idx_courts_arena'
  ),
  'SELECT 1',
  "ALTER TABLE courts ADD INDEX idx_courts_arena (arena_id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'competitions' AND INDEX_NAME = 'idx_competitions_arena'
  ),
  'SELECT 1',
  "ALTER TABLE competitions ADD INDEX idx_competitions_arena (arena_id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND INDEX_NAME = 'idx_matches_arena'
  ),
  'SELECT 1',
  "ALTER TABLE matches ADD INDEX idx_matches_arena (arena_id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs' AND INDEX_NAME = 'idx_activity_logs_arena'
  ),
  'SELECT 1',
  "ALTER TABLE activity_logs ADD INDEX idx_activity_logs_arena (arena_id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'arena_memberships' AND CONSTRAINT_NAME = 'fk_arena_memberships_arena'
  ),
  'SELECT 1',
  "ALTER TABLE arena_memberships ADD CONSTRAINT fk_arena_memberships_arena FOREIGN KEY (arena_id) REFERENCES arenas(id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'arena_memberships' AND CONSTRAINT_NAME = 'fk_arena_memberships_user'
  ),
  'SELECT 1',
  "ALTER TABLE arena_memberships ADD CONSTRAINT fk_arena_memberships_user FOREIGN KEY (user_id) REFERENCES users(id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation_participants' AND CONSTRAINT_NAME = 'fk_reservation_participants_reservation'
  ),
  'SELECT 1',
  "ALTER TABLE reservation_participants ADD CONSTRAINT fk_reservation_participants_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation_participants' AND CONSTRAINT_NAME = 'fk_reservation_participants_user'
  ),
  'SELECT 1',
  "ALTER TABLE reservation_participants ADD CONSTRAINT fk_reservation_participants_user FOREIGN KEY (user_id) REFERENCES users(id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'courts' AND CONSTRAINT_NAME = 'fk_courts_arena'
  ),
  'SELECT 1',
  "ALTER TABLE courts ADD CONSTRAINT fk_courts_arena FOREIGN KEY (arena_id) REFERENCES arenas(id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'competitions' AND CONSTRAINT_NAME = 'fk_competitions_arena'
  ),
  'SELECT 1',
  "ALTER TABLE competitions ADD CONSTRAINT fk_competitions_arena FOREIGN KEY (arena_id) REFERENCES arenas(id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'matches' AND CONSTRAINT_NAME = 'fk_matches_arena'
  ),
  'SELECT 1',
  "ALTER TABLE matches ADD CONSTRAINT fk_matches_arena FOREIGN KEY (arena_id) REFERENCES arenas(id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs' AND CONSTRAINT_NAME = 'fk_activity_logs_arena'
  ),
  'SELECT 1',
  "ALTER TABLE activity_logs ADD CONSTRAINT fk_activity_logs_arena FOREIGN KEY (arena_id) REFERENCES arenas(id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_logs' AND CONSTRAINT_NAME = 'fk_activity_logs_actor_user'
  ),
  'SELECT 1',
  "ALTER TABLE activity_logs ADD CONSTRAINT fk_activity_logs_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id)"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
