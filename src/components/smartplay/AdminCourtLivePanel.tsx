import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Camera, CheckCircle2, Play, Radio, Square } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LiveAIStatusBadge from "./LiveAIStatusBadge";
import type { LiveSession } from "./liveTypes";

type Court = {
  id: number;
  name: string;
  arena_name?: string;
  arenaName?: string;
  sport?: string;
};

type CameraRecord = {
  id: number;
  name: string;
  camera_url: string;
  camera_type: string;
  is_active: boolean;
};

type CourtCalibration = {
  id?: number;
  calibration_status?: string;
  calibrationStatus?: "valid" | "pending" | "missing" | "invalid" | string;
  homography_json_path?: string | null;
  isValidForLive?: boolean;
};

export default function AdminCourtLivePanel({ courts }: { courts: Court[] }) {
  const navigate = useNavigate();
  const mockEnabled = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_ENABLE_MOCK_LIVE === "1";
  const [selectedCourtId, setSelectedCourtId] = useState("");
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [calibration, setCalibration] = useState<CourtCalibration | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [cameraForm, setCameraForm] = useState({
    name: "",
    cameraUrl: "",
    cameraType: "file_demo",
  });
  const [saving, setSaving] = useState(false);

  const selectedCourt = useMemo(() => courts.find((court) => String(court.id) === selectedCourtId), [courts, selectedCourtId]);

  useEffect(() => {
    if (!selectedCourtId && courts[0]) setSelectedCourtId(String(courts[0].id));
  }, [courts, selectedCourtId]);

  const loadSessions = async () => {
    const result = await api<{ sessions: LiveSession[] }>("/api/live-sessions", { authenticated: true });
    setSessions(result.sessions);
  };

  const loadCameras = async (courtId: string) => {
    if (!courtId) return;
    const result = await api<{ cameras: CameraRecord[] }>(`/api/courts/${courtId}/cameras`, { authenticated: true });
    setCameras(result.cameras);
    setSelectedCameraId((current) => current || String(result.cameras[0]?.id ?? ""));
  };

  const loadCalibration = async (courtId: string, cameraId?: string) => {
    if (!courtId) return;
    const suffix = cameraId ? `?cameraId=${cameraId}` : "";
    const result = await api<{ calibration: CourtCalibration }>(`/api/courts/${courtId}/calibration${suffix}`, { authenticated: true });
    setCalibration(result.calibration);
  };

  useEffect(() => {
    void loadSessions().catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedCameraId("");
    void loadCameras(selectedCourtId).catch(() => setCameras([]));
    void loadCalibration(selectedCourtId).catch(() => setCalibration(null));
  }, [selectedCourtId]);

  useEffect(() => {
    if (selectedCourtId) void loadCalibration(selectedCourtId, selectedCameraId).catch(() => setCalibration(null));
  }, [selectedCameraId]);

  const createCamera = async () => {
    if (!selectedCourtId) return;
    if (!cameraForm.name.trim() || !cameraForm.cameraUrl.trim()) {
      toast.error("Camera name and source path are required.");
      return;
    }
    setSaving(true);
    try {
      const result = await api<{ camera: CameraRecord }>(`/api/courts/${selectedCourtId}/cameras`, {
        method: "POST",
        authenticated: true,
        body: cameraForm,
      });
      setCameras((current) => [result.camera, ...current]);
      setSelectedCameraId(String(result.camera.id));
      toast.success("Camera saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save camera.");
    } finally {
      setSaving(false);
    }
  };

  const startSession = async (mode: "mock" | "real") => {
    if (!selectedCourtId) return;
    setSaving(true);
    try {
      let cameraId = selectedCameraId ? Number(selectedCameraId) : null;
      if (!cameraId && mode === "mock") {
        const camera = await api<{ camera: CameraRecord }>(`/api/courts/${selectedCourtId}/cameras`, {
          method: "POST",
          authenticated: true,
          body: cameraForm,
        });
        cameraId = camera.camera.id;
        setCameras((current) => [camera.camera, ...current]);
        setSelectedCameraId(String(cameraId));
      }
      const created = await api<{ session: LiveSession }>("/api/live-sessions", {
        method: "POST",
        authenticated: true,
        body: {
          courtId: Number(selectedCourtId),
          cameraId,
          mode,
        },
      });
      const started = await api<{ session: LiveSession }>(`/api/live-sessions/${created.session.id}/start`, {
        method: "POST",
        authenticated: true,
        body: { mode },
      });
      setSessions((current) => [started.session, ...current.filter((session) => session.id !== started.session.id)]);
      toast.success(mode === "mock" ? "Mock live session started." : "Live AI started. Loading visual models.");
      void loadSessions().catch(() => {});
      navigate(`/live-sessions/${started.session.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start live session.");
    } finally {
      setSaving(false);
    }
  };

  const stopSession = async (sessionId: number) => {
    setSaving(true);
    try {
      const result = await api<{ session: LiveSession }>(`/api/live-sessions/${sessionId}/stop`, { method: "POST", authenticated: true });
      setSessions((current) => current.map((session) => session.id === sessionId ? result.session : session));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to stop live session.");
    } finally {
      setSaving(false);
    }
  };

  const courtSessions = sessions.filter((session) => !selectedCourtId || String(session.courtId) === selectedCourtId);
  const selectedCamera = cameras.find((camera) => String(camera.id) === selectedCameraId) ?? cameras[0] ?? null;
  const calibrationStatus = calibration?.calibrationStatus ?? calibration?.calibration_status ?? "missing";
  const liveReady = Boolean(selectedCamera?.is_active && calibration?.isValidForLive);

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Radio size={18} className="text-primary" /> Live SmartPlay AI
          </h3>
          <p className="text-sm text-muted-foreground">Visual tracking for player detection, ball tracking, pose status, and minimap telemetry.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => startSession("real")} disabled={saving || !selectedCourtId || !liveReady} className="gap-2">
            <Camera size={14} /> Start Live Analysis
          </Button>
          {!liveReady && (
            <Button asChild variant="secondary" className="gap-2">
              <a href="#court-calibration-panel">
                <AlertTriangle size={14} /> {calibrationStatus === "invalid" ? "Re-annotate court" : "Annotate court first"}
              </a>
            </Button>
          )}
          {mockEnabled && (
            <Button onClick={() => startSession("mock")} disabled={saving || !selectedCourtId} className="gap-2">
              <Play size={14} /> Dev Mock
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={selectedCourtId} onChange={(event) => setSelectedCourtId(event.target.value)}>
          {courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}
        </select>
        <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={selectedCameraId} onChange={(event) => setSelectedCameraId(event.target.value)}>
          <option value="">No camera selected</option>
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {camera.name} - {camera.camera_type}{camera.is_active ? "" : " - inactive"}
            </option>
          ))}
        </select>
        <div className="text-xs text-muted-foreground md:text-right">
          {selectedCourt?.arena_name ?? selectedCourt?.arenaName ?? "Arena"} · {selectedCourt?.sport ?? "Padel"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_120px]">
        <Input value={cameraForm.name} onChange={(event) => setCameraForm((current) => ({ ...current, name: event.target.value }))} placeholder="Camera name" />
        <Input value={cameraForm.cameraUrl} onChange={(event) => setCameraForm((current) => ({ ...current, cameraUrl: event.target.value }))} placeholder="rtsp://, webcam id, or file_demo MP4 path" />
        <Button variant="outline" onClick={createCamera} disabled={saving || !selectedCourtId}>Save Camera</Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live video source</p>
          <p className="mt-1 break-all text-xs">{selectedCamera?.camera_url ?? "No active camera configured"}</p>
          {selectedCamera && (
            <p className="mt-1 text-[10px] uppercase tracking-widest text-primary">
              {selectedCamera.camera_type} - {selectedCamera.is_active ? "active" : "inactive"}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {calibration?.isValidForLive ? <CheckCircle2 size={13} className="text-emerald-400" /> : <AlertTriangle size={13} className="text-amber-400" />}
            Calibration status
          </p>
          <p className="mt-1 text-sm font-bold capitalize">{calibrationStatus}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{calibration?.homography_json_path ?? "No reusable homography JSON path saved for this court."}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {courtSessions.map((session) => (
          <div key={session.id} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold">Session #{session.id} · {session.cameraName ?? "camera"}</p>
              <p className="text-xs text-muted-foreground">{session.mode} mode · frame {session.lastFrame ?? "-"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LiveAIStatusBadge status={session.status} fps={session.fps} message={session.aiStatusMessage} />
              <Button asChild variant="outline" size="sm"><Link to={`/live-sessions/${session.id}`}>Open</Link></Button>
              <Button variant="destructive" size="sm" onClick={() => stopSession(session.id)} disabled={saving || session.status === "stopped"}>
                <Square size={13} />
              </Button>
            </div>
          </div>
        ))}
        {!courtSessions.length && <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No live sessions for this court yet.</p>}
      </div>
    </div>
  );
}
