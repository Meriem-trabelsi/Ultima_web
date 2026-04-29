/**
 * SmartPlay AI Integration Service
 * Placeholder / stub module for future AI microservice integration.
 * The actual AI backend is NOT ready. This module provides safe fallbacks.
 * PostgreSQL via shared pg-pool.
 *
 * TODO: When AI microservice is ready, replace HTTP stubs with real calls to:
 *   POST /api/ia/analyse
 *   GET  /api/ia/predictions/:id
 *   GET  /api/ia/heatmap/:matchId
 *   GET  /api/ia/status
 */
import pool from "./pg-pool.mjs";

const AI_SERVICE_URL = process.env.SMARTPLAY_AI_URL ?? null;

/** Check AI microservice connectivity */
export async function getSmartPlayStatus() {
  const base = {
    connected: false,
    version: null,
    message: "SmartPlay AI microservice is not yet connected. Analytics features will be available once the AI backend is deployed.",
    features: {
      court_detection: false,
      player_tracking: false,
      ball_tracking: false,
      smart_scoring: false,
      heatmap: false,
      performance_analysis: false,
    },
  };

  if (!AI_SERVICE_URL) {
    return base;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${AI_SERVICE_URL}/api/ia/status`, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return { connected: true, ...data };
    }
  } catch {
    // AI service unavailable — return safe placeholder
  }

  return base;
}

/** Create an analysis job (queued for AI processing) */
export async function createAnalysisJob({ userId, matchId, jobType, sourceVideoPath, requestedByUserId }) {
  const result = await pool.query(
    `INSERT INTO smartplay_analysis_jobs (user_id, match_id, job_type, source_video_path, status, requested_by_user_id)
     VALUES ($1, $2, $3, $4, 'queued', $5)
     RETURNING id`,
    [userId, matchId ?? null, jobType ?? "full_match", sourceVideoPath ?? null, requestedByUserId ?? userId]
  );
  return { id: result.rows[0].id, userId, matchId, jobType, status: "queued" };
}

/** List analysis jobs for a user */
export async function listAnalysisJobs(userId, limit = 20) {
  const result = await pool.query(
    `SELECT sj.*, m.player1_name, m.player2_name, m.scheduled_at AS match_date,
            u.first_name AS requested_by_first, u.last_name AS requested_by_last
     FROM smartplay_analysis_jobs sj
     LEFT JOIN matches m ON m.id = sj.match_id
     LEFT JOIN users u ON u.id = sj.requested_by_user_id
     WHERE sj.user_id = $1
     ORDER BY sj.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

/** Get match analysis (real if available, placeholder if not) */
export async function getMatchAnalysis(matchId) {
  const result = await pool.query(
    "SELECT * FROM match_analysis WHERE match_id = $1",
    [matchId]
  );
  if (result.rows.length) {
    const row = result.rows[0];
    return {
      available: true,
      source: "database",
      data: {
        ...row,
        heatmap_data: row.heatmap_data ?? null,
        raw_analysis: row.raw_analysis ?? null,
      },
    };
  }

  return {
    available: false,
    source: "placeholder",
    message: "AI analysis for this match is not yet available. SmartPlay AI will generate detailed metrics once processing is complete.",
    // TODO: Call AI microservice here when ready
    placeholder: {
      rally_count: null,
      avg_rally_length: null,
      court_coverage: null,
      heatmap: null,
      ball_speed: null,
    },
  };
}

/** Get player AI analysis data */
export async function getPlayerAiMetrics(userId, matchId = null) {
  const params = [userId];
  let query = "SELECT * FROM player_analysis WHERE user_id = $1";
  if (matchId) {
    params.push(matchId);
    query += ` AND match_id = $${params.length}`;
  }
  query += " ORDER BY created_at DESC LIMIT 5";

  const result = await pool.query(query, params);

  if (result.rows.length) {
    return {
      available: true,
      source: "database",
      metrics: result.rows.map((row) => ({
        ...row,
        heatmap_json: row.heatmap_json ?? null,
        raw_metrics: row.raw_metrics ?? null,
      })),
    };
  }

  return {
    available: false,
    source: "placeholder",
    message: "AI performance metrics will appear here once SmartPlay AI processes your matches.",
    // TODO: Request analysis from AI microservice here
    placeholder: {
      movement_coverage: null,
      reaction_speed_ms: null,
      shot_accuracy: null,
      winners: null,
      errors: null,
    },
  };
}
