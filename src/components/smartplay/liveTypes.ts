export type LiveSession = {
  id: number;
  arenaId: number;
  arenaName: string | null;
  courtId: number;
  courtName: string | null;
  cameraId: number | null;
  cameraName: string | null;
  cameraUrl: string | null;
  cameraType: string | null;
  matchId: number | null;
  competitionId: number | null;
  reservationId: number | null;
  status: string;
  mode: "mock" | "real" | string;
  aiStatusMessage: string | null;
  fps: number | null;
  lastFrame: number | null;
  lastUpdateAt: string | null;
  players?: Array<{
    id: number;
    userId: number | null;
    slot: string;
    team: string | null;
    sideHint: string | null;
    name: string;
  }>;
};

export type LiveVisualUpdate = {
  sessionId: number;
  frame?: number;
  timestampMs?: number;
  timestamp_ms?: number;
  fps?: number;
  status?: string;
  source?: string;
  players?: Array<{
    trackId?: string;
    label?: string;
    team?: string;
    confidence?: number;
    bbox?: { x: number; y: number; w: number; h: number };
    poseStatus?: string;
  }>;
  ball?: { x: number; y: number; confidence?: number };
  minimap?: {
    players?: Array<{ id?: string; label?: string; team?: string; x: number; y: number }>;
    ball?: { x: number; y: number };
  };
  pose?: { status?: string; trackedPlayers?: number };
};
