-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: ultima_demo
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arena_id` int DEFAULT NULL,
  `actor_user_id` int DEFAULT NULL,
  `actor_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detail` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `arena_id` (`arena_id`),
  KEY `actor_user_id` (`actor_user_id`),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`arena_id`) REFERENCES `arenas` (`id`),
  CONSTRAINT `activity_logs_ibfk_2` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_logs`
--

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
INSERT INTO `activity_logs` VALUES (1,2,12,'Coach Test','Nouveau compte','Role: coach','2026-04-07 10:35:34.792'),(2,4,13,'Arena Admin','Nouveau compte','Role: admin','2026-04-07 14:33:34.333'),(3,4,14,'Ryad Coach','Nouveau compte','Role: coach','2026-04-07 14:33:34.542'),(4,4,15,'Nour Player','Nouveau compte','Role: player','2026-04-07 14:33:34.815'),(5,4,16,'Ines Player','Nouveau compte','Role: player','2026-04-07 14:33:34.927'),(6,2,9,'Achref Ayadi','Reservation confirmee','Terrain taa wedhni A - 2026-04-25 10:00-11:30','2026-04-07 18:29:01.590'),(7,2,17,'Client Lhaj','Nouveau compte','Role: player','2026-04-08 11:32:03.318'),(8,2,5,'Aziz Ferchichi','Reservation annulee (admin)','Terrain taa wedhni A - Sat Apr 25 2026 00:00:00 GMT+0000 (Coordinated Universal Time) 10:00','2026-04-08 11:33:17.756');
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_analyses`
--

DROP TABLE IF EXISTS `ai_analyses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_analyses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `video_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('queued','processing','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'queued',
  `summary` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_ai_analyses_user` (`user_id`),
  CONSTRAINT `fk_ai_analyses_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_analyses`
--

LOCK TABLES `ai_analyses` WRITE;
/*!40000 ALTER TABLE `ai_analyses` DISABLE KEYS */;
INSERT INTO `ai_analyses` VALUES (1,1,'Analyse Match Demo','match-demo.mp4','completed','Heatmaps generees, patterns de deplacement detectes et recommandations pretes.','2026-04-02 18:02:54.852');
/*!40000 ALTER TABLE `ai_analyses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `arena_memberships`
--

DROP TABLE IF EXISTS `arena_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arena_memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arena_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('admin','coach','player') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_arena_membership` (`arena_id`,`user_id`),
  KEY `fk_arena_memberships_user` (`user_id`),
  CONSTRAINT `fk_arena_memberships_arena` FOREIGN KEY (`arena_id`) REFERENCES `arenas` (`id`),
  CONSTRAINT `fk_arena_memberships_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `arena_memberships`
--

LOCK TABLES `arena_memberships` WRITE;
/*!40000 ALTER TABLE `arena_memberships` DISABLE KEYS */;
INSERT INTO `arena_memberships` VALUES (1,1,1,'player','active','2026-04-04 12:46:26.412'),(2,1,3,'player','active','2026-04-04 12:46:26.412'),(3,1,6,'coach','active','2026-04-04 12:46:26.412'),(4,1,2,'admin','active','2026-04-04 12:46:26.412'),(5,1,4,'player','active','2026-04-04 12:46:26.412'),(8,2,7,'admin','active','2026-04-04 21:57:45.774'),(9,2,8,'player','active','2026-04-04 22:24:10.652'),(10,2,9,'player','active','2026-04-04 22:24:47.077'),(11,1,10,'player','active','2026-04-05 19:18:01.635'),(12,3,11,'admin','active','2026-04-05 19:22:15.513'),(13,2,12,'coach','active','2026-04-07 10:35:34.779'),(14,4,13,'admin','active','2026-04-07 14:33:34.332'),(15,4,14,'coach','active','2026-04-07 14:33:34.542'),(16,4,15,'player','active','2026-04-07 14:33:34.814'),(17,4,16,'player','active','2026-04-07 14:33:34.925'),(18,2,17,'player','active','2026-04-08 11:32:03.284');
/*!40000 ALTER TABLE `arena_memberships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `arena_subscriptions`
--

DROP TABLE IF EXISTS `arena_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arena_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arena_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `status` enum('trialing','active','past_due','canceled','paused') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'trialing',
  `provider` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `provider_customer_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_subscription_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_period_start` datetime(3) DEFAULT NULL,
  `current_period_end` datetime(3) DEFAULT NULL,
  `trial_end` datetime(3) DEFAULT NULL,
  `cancel_at_period_end` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_arena_subscriptions_arena` (`arena_id`),
  KEY `idx_arena_subscriptions_provider` (`provider`,`provider_customer_id`,`provider_subscription_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `arena_subscriptions`
--

LOCK TABLES `arena_subscriptions` WRITE;
/*!40000 ALTER TABLE `arena_subscriptions` DISABLE KEYS */;
INSERT INTO `arena_subscriptions` VALUES (1,4,1,'trialing','manual',NULL,NULL,'2026-04-07 14:33:34.159','2026-05-07 14:33:34.159','2026-04-21 14:33:34.159',0,'2026-04-07 14:33:34.159','2026-04-07 14:33:34.159'),(2,2,1,'trialing','manual',NULL,NULL,'2026-04-07 18:30:16.528','2026-05-07 18:30:16.528','2026-04-21 18:30:16.528',0,'2026-04-07 18:30:16.528','2026-04-07 18:30:16.528');
/*!40000 ALTER TABLE `arena_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `arenas`
--

DROP TABLE IF EXISTS `arenas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arenas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `arenas`
--

LOCK TABLES `arenas` WRITE;
/*!40000 ALTER TABLE `arenas` DISABLE KEYS */;
INSERT INTO `arenas` VALUES (1,'ULTIMA Arena','ultima-arena','La Marsa','2026-04-04 12:46:20.431'),(2,'Salle de Sport weld lhaj','salle-de-sport-weld-lhaj','Plateforme ULTIMA','2026-04-04 21:57:45.762'),(3,'Salle Gammar ElDin','salle-gammar-eldin','Plateforme ULTIMA','2026-04-05 19:22:15.495'),(4,'ULTIMA Arena Test Lab','ultima-arena-test-lab','Demo City','2026-04-07 14:33:34.139');
/*!40000 ALTER TABLE `arenas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `billing_plans`
--

DROP TABLE IF EXISTS `billing_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `billing_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(48) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(96) COLLATE utf8mb4_unicode_ci NOT NULL,
  `max_admins` int NOT NULL,
  `max_coaches` int NOT NULL,
  `max_players` int NOT NULL,
  `features_json` json DEFAULT NULL,
  `monthly_price_cents` int NOT NULL DEFAULT '0',
  `yearly_price_cents` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `billing_plans`
--

LOCK TABLES `billing_plans` WRITE;
/*!40000 ALTER TABLE `billing_plans` DISABLE KEYS */;
INSERT INTO `billing_plans` VALUES (1,'starter','Starter',1,2,50,'{\"liveScores\": true, \"smartPlayAi\": false, \"competitions\": true}',9900,99000,1,'2026-04-07 14:33:34.113','2026-04-07 14:33:34.113'),(2,'pro','Pro',3,10,300,'{\"liveScores\": true, \"smartPlayAi\": true, \"competitions\": true}',29900,299000,1,'2026-04-07 14:33:34.113','2026-04-07 14:33:34.113'),(3,'elite','Elite',10,30,2000,'{\"liveScores\": true, \"smartPlayAi\": true, \"competitions\": true, \"prioritySupport\": true}',79900,799000,1,'2026-04-07 14:33:34.113','2026-04-07 14:33:34.113');
/*!40000 ALTER TABLE `billing_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coach_player_relationships`
--

DROP TABLE IF EXISTS `coach_player_relationships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coach_player_relationships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arena_id` int NOT NULL,
  `coach_user_id` int NOT NULL,
  `player_user_id` int NOT NULL,
  `status` enum('pending','active','paused','ended','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `requested_by_user_id` int NOT NULL,
  `responded_by_user_id` int DEFAULT NULL,
  `can_view_performance` tinyint(1) NOT NULL DEFAULT '1',
  `can_view_reservations` tinyint(1) NOT NULL DEFAULT '1',
  `can_schedule_sessions` tinyint(1) NOT NULL DEFAULT '1',
  `can_view_notes` tinyint(1) NOT NULL DEFAULT '0',
  `consent_version` int NOT NULL DEFAULT '1',
  `consent_granted_at` datetime(3) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `responded_at` datetime(3) DEFAULT NULL,
  `last_reminder_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coach_player_active_window` (`coach_user_id`,`player_user_id`,`start_date`,`end_date`),
  KEY `idx_cpr_coach` (`coach_user_id`),
  KEY `idx_cpr_player` (`player_user_id`),
  KEY `idx_cpr_status_dates` (`status`,`start_date`,`end_date`),
  KEY `idx_cpr_arena` (`arena_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coach_player_relationships`
--

LOCK TABLES `coach_player_relationships` WRITE;
/*!40000 ALTER TABLE `coach_player_relationships` DISABLE KEYS */;
INSERT INTO `coach_player_relationships` VALUES (1,4,14,15,'active',15,NULL,1,1,1,0,1,'2026-04-07 14:33:34.943','2026-04-07','2026-04-12','Active test link (expires soon for reminder testing)',NULL,NULL,'2026-04-07 14:33:34.943','2026-04-07 14:33:34.943'),(2,4,14,16,'pending',16,NULL,1,1,1,0,1,NULL,'2026-04-07',NULL,'Pending test request',NULL,NULL,'2026-04-07 14:33:34.955','2026-04-07 14:33:34.955');
/*!40000 ALTER TABLE `coach_player_relationships` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `competition_registrations`
--

DROP TABLE IF EXISTS `competition_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competition_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `competition_id` int NOT NULL,
  `user_id` int NOT NULL,
  `status` enum('registered','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'registered',
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_competition_user` (`competition_id`,`user_id`),
  KEY `fk_competition_registrations_user` (`user_id`),
  CONSTRAINT `fk_competition_registrations_competition` FOREIGN KEY (`competition_id`) REFERENCES `competitions` (`id`),
  CONSTRAINT `fk_competition_registrations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `competition_registrations`
--

LOCK TABLES `competition_registrations` WRITE;
/*!40000 ALTER TABLE `competition_registrations` DISABLE KEYS */;
INSERT INTO `competition_registrations` VALUES (1,1,1,'registered','2026-04-02 18:02:54.852'),(2,1,2,'registered','2026-04-02 18:02:54.852'),(3,1,3,'registered','2026-04-02 18:02:54.852'),(4,1,4,'registered','2026-04-02 18:02:54.852'),(5,2,1,'registered','2026-04-02 18:02:54.852'),(6,2,2,'registered','2026-04-02 18:02:54.852'),(7,2,3,'registered','2026-04-02 18:02:54.852'),(8,2,4,'registered','2026-04-02 18:02:54.852'),(9,3,1,'registered','2026-04-02 18:02:54.852'),(10,3,2,'registered','2026-04-02 18:02:54.852'),(11,3,3,'registered','2026-04-02 18:02:54.852'),(12,3,4,'registered','2026-04-02 18:02:54.852'),(13,4,1,'registered','2026-04-02 18:02:54.852'),(14,4,2,'registered','2026-04-02 18:02:54.852'),(15,4,3,'registered','2026-04-02 18:02:54.852'),(16,4,4,'registered','2026-04-02 18:02:54.852');
/*!40000 ALTER TABLE `competition_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `competitions`
--

DROP TABLE IF EXISTS `competitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `competitions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arena_id` int NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sport` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL,
  `location` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `max_participants` int NOT NULL,
  `status` enum('open','full','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_competitions_arena` (`arena_id`),
  CONSTRAINT `fk_competitions_arena` FOREIGN KEY (`arena_id`) REFERENCES `arenas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `competitions`
--

LOCK TABLES `competitions` WRITE;
/*!40000 ALTER TABLE `competitions` DISABLE KEYS */;
INSERT INTO `competitions` VALUES (1,1,'Tournoi Padel Printemps 2026','Padel','Tournoi de demonstration ULTIMA pour les joueurs confirmes.','2026-03-15','ULTIMA Arena',32,'open','2026-04-02 18:02:54.852'),(2,1,'Open Tennis La Marsa','Tennis','Competition open avec diffusion des scores en direct.','2026-04-22','Court Central',32,'open','2026-04-02 18:02:54.852'),(3,1,'Championnat Interclubs','Padel & Tennis','Tournoi complet reserve aux clubs partenaires.','2026-05-10','ULTIMA Arena',32,'full','2026-04-02 18:02:54.852'),(4,1,'Tournoi Junior Padel','Padel','Competition junior dediee a la detection de talents.','2026-06-05','Terrain B',16,'open','2026-04-02 18:02:54.852');
/*!40000 ALTER TABLE `competitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courts`
--

DROP TABLE IF EXISTS `courts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arena_id` int NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sport` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('available','occupied','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL,
  `has_summa` tinyint(1) NOT NULL DEFAULT '0',
  `location` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_players` int NOT NULL DEFAULT '2',
  `max_players` int NOT NULL DEFAULT '4',
  `opening_time` time NOT NULL DEFAULT '08:00:00',
  `closing_time` time NOT NULL DEFAULT '22:00:00',
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_courts_arena` (`arena_id`),
  CONSTRAINT `fk_courts_arena` FOREIGN KEY (`arena_id`) REFERENCES `arenas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courts`
--

LOCK TABLES `courts` WRITE;
/*!40000 ALTER TABLE `courts` DISABLE KEYS */;
INSERT INTO `courts` VALUES (1,1,'Terrain Padel A','Padel','available',0,'ULTIMA Arena',2,4,'08:00:00','22:00:00','2026-04-02 18:02:54.851'),(2,1,'Terrain Padel B','Padel','available',0,'ULTIMA Arena',2,4,'08:00:00','22:00:00','2026-04-02 18:02:54.851'),(3,1,'Terrain Tennis 1','Tennis','occupied',0,'Court Central',2,4,'08:00:00','22:00:00','2026-04-02 18:02:54.851'),(4,1,'Terrain Tennis 2','Tennis','available',0,'Court Central',2,4,'08:00:00','22:00:00','2026-04-02 18:02:54.851'),(5,1,'Terrain Padel C (SUMMA)','Padel','available',1,'ULTIMA Arena',2,4,'08:00:00','22:00:00','2026-04-02 18:02:54.852'),(6,1,'Terrain Tennis 3 (SUMMA)','Tennis','available',1,'Court Central',2,4,'08:00:00','22:00:00','2026-04-02 18:02:54.852'),(7,2,'Terrain taa wedhni A','Padel','available',1,'Salle de Sport weld lhaj',2,4,'08:00:00','22:00:00','2026-04-04 22:22:54.198');
/*!40000 ALTER TABLE `courts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int DEFAULT NULL,
  `court_id` int DEFAULT NULL,
  `arena_id` int DEFAULT NULL,
  `team1_player1_id` int DEFAULT NULL,
  `team1_player2_id` int DEFAULT NULL,
  `team2_player1_id` int DEFAULT NULL,
  `team2_player2_id` int DEFAULT NULL,
  `score1` json DEFAULT NULL,
  `score2` json DEFAULT NULL,
  `winner_team` int DEFAULT NULL,
  `status` enum('upcoming','live','finished') COLLATE utf8mb4_unicode_ci DEFAULT 'upcoming',
  `scheduled_at` datetime DEFAULT NULL,
  `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reservation_id` (`reservation_id`),
  KEY `court_id` (`court_id`),
  KEY `arena_id` (`arena_id`),
  CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`),
  CONSTRAINT `matches_ibfk_2` FOREIGN KEY (`court_id`) REFERENCES `courts` (`id`),
  CONSTRAINT `matches_ibfk_3` FOREIGN KEY (`arena_id`) REFERENCES `arenas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matches`
--

LOCK TABLES `matches` WRITE;
/*!40000 ALTER TABLE `matches` DISABLE KEYS */;
/*!40000 ALTER TABLE `matches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `performance_profiles`
--

DROP TABLE IF EXISTS `performance_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `performance_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `skill_power` int DEFAULT '50',
  `skill_speed` int DEFAULT '50',
  `skill_stamina` int DEFAULT '50',
  `skill_technique` int DEFAULT '50',
  `skill_tactics` int DEFAULT '50',
  `updated_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `performance_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `performance_profiles`
--

LOCK TABLES `performance_profiles` WRITE;
/*!40000 ALTER TABLE `performance_profiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `performance_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `performance_snapshots`
--

DROP TABLE IF EXISTS `performance_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `performance_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `ranking_score` int DEFAULT '1000',
  `wins` int DEFAULT '0',
  `losses` int DEFAULT '0',
  `matches_this_month` int DEFAULT '0',
  `streak` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '-',
  `snapshot_date` date DEFAULT NULL,
  `created_at` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `performance_snapshots_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `performance_snapshots`
--

LOCK TABLES `performance_snapshots` WRITE;
/*!40000 ALTER TABLE `performance_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `performance_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservation_participants`
--

DROP TABLE IF EXISTS `reservation_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reservation_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reservation_participant` (`reservation_id`,`user_id`),
  KEY `fk_reservation_participants_user` (`user_id`),
  CONSTRAINT `fk_reservation_participants_reservation` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservation_participants_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservation_participants`
--

LOCK TABLES `reservation_participants` WRITE;
/*!40000 ALTER TABLE `reservation_participants` DISABLE KEYS */;
INSERT INTO `reservation_participants` VALUES (1,2,1,'2026-04-04 12:46:26.559'),(2,1,5,'2026-04-04 12:46:26.559'),(3,3,5,'2026-04-04 12:46:26.559'),(4,4,6,'2026-04-04 12:46:26.559'),(8,5,8,'2026-04-04 22:28:05.179'),(9,5,9,'2026-04-04 22:28:05.195'),(10,6,8,'2026-04-05 14:59:44.587'),(11,6,9,'2026-04-05 14:59:44.589'),(12,7,10,'2026-04-05 19:20:10.212'),(13,7,4,'2026-04-05 19:20:10.214'),(14,8,9,'2026-04-07 18:29:01.575'),(15,8,8,'2026-04-07 18:29:01.585');
/*!40000 ALTER TABLE `reservation_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `court_id` int NOT NULL,
  `reservation_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `status` enum('confirmed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmed',
  `qr_token` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_token` (`qr_token`),
  KEY `fk_reservations_user` (`user_id`),
  KEY `idx_reservations_court_date` (`court_id`,`reservation_date`,`start_time`,`end_time`),
  CONSTRAINT `fk_reservations_court` FOREIGN KEY (`court_id`) REFERENCES `courts` (`id`),
  CONSTRAINT `fk_reservations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservations`
--

LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
INSERT INTO `reservations` VALUES (1,5,1,'2026-04-10','15:30:00','17:00:00','cancelled','214fe197-f225-4588-acb2-6722f570a8a2','','2026-04-02 18:12:19.858'),(2,1,1,'2004-05-11','17:00:00','18:30:00','cancelled','232a87b3-8908-4c20-94b9-2af4767195e6','','2026-04-02 18:49:25.552'),(3,5,1,'2025-01-01','08:00:00','09:30:00','cancelled','4bf73247-224f-4ee5-8fec-dcd0b2378e7a','','2026-04-02 18:56:22.101'),(4,6,5,'2026-04-03','08:00:00','09:30:00','cancelled','61fb38dc-4960-4d2c-acbd-0da3f5d4272c','','2026-04-02 19:05:29.386'),(5,9,7,'2026-04-09','11:30:00','13:00:00','confirmed','9fed8393-71fd-45a8-ab63-318acfe62bfd','','2026-04-04 22:28:05.178'),(6,9,7,'2026-04-08','11:30:00','13:00:00','confirmed','bf443834-4a8c-48de-95f9-3438ad48cfb9','','2026-04-05 14:59:44.581'),(7,10,1,'2026-04-08','08:30:00','10:00:00','confirmed','962a9841-4528-427b-a27d-9728899af0bd','','2026-04-05 19:20:10.209'),(8,9,7,'2026-04-25','10:00:00','11:30:00','cancelled','27fbd642-1b67-4b4b-8d79-7eed4b575dcb','','2026-04-07 18:29:01.556');
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `training_sessions`
--

DROP TABLE IF EXISTS `training_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `training_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `arena_id` int NOT NULL,
  `coach_user_id` int NOT NULL,
  `reservation_id` int NOT NULL,
  `session_type` enum('individual','group','match_practice') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'individual',
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `focus_areas` text COLLATE utf8mb4_unicode_ci,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `status` enum('scheduled','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'scheduled',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_training_sessions_arena` (`arena_id`),
  KEY `idx_training_sessions_coach` (`coach_user_id`),
  KEY `idx_training_sessions_reservation` (`reservation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `training_sessions`
--

LOCK TABLES `training_sessions` WRITE;
/*!40000 ALTER TABLE `training_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `training_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photo_url` text COLLATE utf8mb4_unicode_ci,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('player','coach','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform_role` enum('member','super_admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Ahmed','Bouazizi','ahmed@email.com',NULL,NULL,'$2b$10$o3uQcXa5CZKz8fpHmsw4nO3NrSnNtoK4ijqkxWTlpaee4oH4.VKaG','player','member','active','2026-04-02 18:02:54.330'),(2,'Imed','Trabelsi','sami@email.com',NULL,NULL,'$2b$10$wS82IslNVJ4npYfocISd9exulsDWTmuQJ10ptDBxTdNIFUP2.BRAq','coach','member','active','2026-04-02 18:02:54.459'),(3,'Meryam','Trbsli','mariem@email.com',NULL,NULL,'$2b$10$F8SydrXWOrtb2ooWFxxfjui/QV5a72zfQOutlymkNlNohK6ZRklh6','player','member','active','2026-04-02 18:02:54.591'),(4,'Youssef','Khelifi','youssef@email.com',NULL,NULL,'$2b$10$Pmk5bKMDtfE0c2.ZpbZPJeVqpwUCBTpuf3ZkgXsRRQvEsSrrRYJqy','player','member','active','2026-04-02 18:02:54.722'),(5,'Aziz','Ferchichi','aziz@email.com',NULL,NULL,'$2b$10$k5R6s63aUjWiMRHpWV76v.1k6WgR1nKWDHPRj0Nr0NYXUoEHNGKre','admin','super_admin','active','2026-04-02 18:02:54.851'),(6,'NotFerchichi','NotAziz','Notaziz@email.com',NULL,NULL,'$2b$10$I4FlnmpzIQJyUO60oCse/OWVjoPRUS9ysyJAQn.sJ6ZHzZ8M1kZCG','coach','member','active','2026-04-02 19:04:31.023'),(7,'Admin','Salle de Sport weld lhaj','lhaj@gmail.com',NULL,NULL,'$2b$10$hP3teEz.SUWtR0SckvRJ8eAvpLYcybuUXgh7dSuJstJNGxeiE2mBa','admin','member','active','2026-04-04 21:57:45.774'),(8,'Wassim','Ayadi','wassim@gmail.com',NULL,NULL,'$2b$10$Kjyj1n6jUyvg7J0y.FVV.OJMltuAwroV4SfhNKxnQGPpMEJVMVcZC','player','member','active','2026-04-04 22:24:10.650'),(9,'Achref','Ayadi','achref@gmail.com',NULL,NULL,'$2b$10$b8D5tlYZYPOmAVgux.irnOMCBcPxAETJAS4GE4H7G/PQPFzPK5g.6','player','member','active','2026-04-04 22:24:47.076'),(10,'Emna','Ferchichi','emna@gmail.com',NULL,NULL,'$2b$10$pVWx6OHX7vOFdppZwqAxfe7j1xGrjdNNu1DAOG7cDX2w0if18zeJy','player','member','active','2026-04-05 19:18:01.632'),(11,'Admin','Salle Gammar ElDin','salle123@gmail.com',NULL,NULL,'$2b$10$cqTsysdaZm074kjcU4Lq1O5KJsShoO8g7AxIY3EBFGtCmDC2hIJru','admin','member','active','2026-04-05 19:22:15.513'),(12,'Coach','Test','coach@gmail.com',NULL,NULL,'$2b$10$eMd284NCQG6tMJ7g8PvAwuW0RERQP/7xhOcpyZvzTjfVsdyPecjA6','coach','member','active','2026-04-07 10:35:34.740'),(13,'Arena','Admin','admin@ultima-arena.test',NULL,NULL,'$2b$10$MJSHORthS2/Bv.XXgY7Fdul.w490DqwYqSFsUJEmkPhVvLliIXHuS','admin','member','active','2026-04-07 14:33:34.331'),(14,'Ryad','Coach','coach@ultima-arena.test',NULL,NULL,'$2b$10$/j5umAgqDwwVg24jQ/w33.LJW6PnbFMJYWxfiVA5P3D7zc3X99Xmy','coach','member','active','2026-04-07 14:33:34.541'),(15,'Nour','Player','player1@ultima-arena.test',NULL,NULL,'$2b$10$G5H67DU1Og/IIiXZmkgnqet16.2ASMdVnsoLbQe4tFPNhffjA0TdW','player','member','active','2026-04-07 14:33:34.812'),(16,'Ines','Player','player2@ultima-arena.test',NULL,NULL,'$2b$10$vZ/1al/BT5cfzRbFchr1Tu42yGlz36k4K2X.y36rxHzZJUDrz1GAW','player','member','active','2026-04-07 14:33:34.924'),(17,'Client','Lhaj','samir@gmail.com',NULL,NULL,'$2b$10$a8giNvuc/dK9bNp4vTOAI.WGWvxg7FglFpckal7h6aQQx5qgkBLz2','player','member','active','2026-04-08 11:32:03.279');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-09 21:53:03
