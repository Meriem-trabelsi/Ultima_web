import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { api, resolveApiUrl } from "@/lib/api";
import { getToken } from "@/lib/session";
import { toast } from "sonner";
import { ArrowLeft, Radio, Users, Zap } from "lucide-react";
import LiveAIStatusBadge from "@/components/smartplay/LiveAIStatusBadge";
import LiveMinimap from "@/components/smartplay/LiveMinimap";
import LiveVideoPanel from "@/components/smartplay/LiveVideoPanel";
import type { LiveSession, LiveVisualUpdate } from "@/components/smartplay/liveTypes";

export default function LiveSessionPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [update, setUpdate] = useState<LiveVisualUpdate | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const apiRoot = useMemo(() => resolveApiUrl("").replace(/\/+$/, ""), []);
  const sourceVideoUrl = useMemo(() => {
    const token = getToken();
    if (!id || !token || session?.cameraType !== "file_demo") return null;
    return resolveApiUrl(`/api/live-sessions/${id}/source-video?token=${encodeURIComponent(token)}`);
  }, [id, session?.cameraType]);
  const renderedStreamUrl = useMemo(() => {
    const token = getToken();
    if (!id || !token || !session?.aiSessionId || session.status === "stopped") return null;
    return resolveApiUrl(`/api/live-sessions/${id}/rendered-stream?token=${encodeURIComponent(token)}`);
  }, [id, session?.aiSessionId, session?.status]);
  const mockEnabled = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_ENABLE_MOCK_LIVE === "1";

  useEffect(() => {
    if (!id) return;
    api<{ session: LiveSession }>(`/api/live-sessions/${id}`, { authenticated: true })
      .then((result) => {
        setSession(result.session);
        setStatusMessage(result.session.aiStatusMessage);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to load live session."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const socket: Socket = io(apiRoot, {
      transports: ["websocket", "polling"],
      auth: { token: getToken() },
    });
    socket.emit("live:join", { sessionId: Number(id) });
    socket.on("live:update", (payload: LiveVisualUpdate) => {
      setUpdate(payload);
      setSession((current) => current ? { ...current, fps: payload.fps ?? current.fps, lastFrame: payload.frame ?? current.lastFrame, status: payload.status ?? current.status } : current);
    });
    socket.on("live:status", (payload: { status?: string; message?: string }) => {
      setStatusMessage(payload.message ?? null);
      if (payload.status) setSession((current) => current ? { ...current, status: payload.status ?? current.status } : current);
    });
    socket.on("live:error", (payload: { message?: string }) => {
      setStatusMessage(payload.message ?? "Live analysis error.");
      setSession((current) => current ? { ...current, status: "error" } : current);
    });
    socket.on("live:stopped", () => {
      setSession((current) => current ? { ...current, status: "stopped" } : current);
    });
    return () => {
      socket.emit("live:leave", { sessionId: Number(id) });
      socket.disconnect();
    };
  }, [apiRoot, id]);

  useEffect(() => {
    if (!id) return;
    let canceled = false;
    const loadLatest = async () => {
      try {
        const result = await api<{ update: LiveVisualUpdate | null }>(`/api/live-sessions/${id}/latest-update`, { authenticated: true });
        if (canceled || !result.update) return;
        setUpdate(result.update);
        setSession((current) => current ? {
          ...current,
          fps: result.update?.fps ?? current.fps,
          lastFrame: result.update?.frame ?? current.lastFrame,
          status: result.update?.status ?? current.status,
        } : current);
      } catch {
        // Socket.IO remains the primary path; polling is only a quiet fallback.
      }
    };
    void loadLatest();
    const timer = window.setInterval(loadLatest, 1500);
    return () => {
      canceled = true;
      window.clearInterval(timer);
    };
  }, [id]);

  const startLive = async (mode: "real" | "mock" = "real") => {
    if (!id) return;
    try {
      const result = await api<{ session: LiveSession }>(`/api/live-sessions/${id}/start`, {
        method: "POST",
        authenticated: true,
        body: { mode },
      });
      setSession(result.session);
      toast.success(mode === "real" ? "Live analysis started. Loading visual models." : "Mock live analysis started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start live analysis.");
    }
  };

  const stop = async () => {
    if (!id) return;
    try {
      const result = await api<{ session: LiveSession }>(`/api/live-sessions/${id}/stop`, {
        method: "POST",
        authenticated: true,
      });
      setSession(result.session);
      toast.success("Live analysis stopped.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to stop live.");
    }
  };

  if (loading) {
    return <Layout><div className="container py-16 text-sm text-muted-foreground">Loading live session...</div></Layout>;
  }

  if (!session) {
    return <Layout><div className="container py-16 text-sm text-muted-foreground">Live session not found.</div></Layout>;
  }

  return (
    <Layout>
      <div className="container py-10 space-y-6">
        <Link to="/smartplay-ai" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary">
          <ArrowLeft size={14} /> SmartPlay AI
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Radio size={12} /> Live visual analysis
            </div>
            <h1 className="text-4xl font-display font-bold uppercase tracking-tight">{session.courtName ?? `Court ${session.courtId}`}</h1>
            <p className="text-sm text-muted-foreground">{session.arenaName} · {session.mode} mode · session #{session.id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LiveAIStatusBadge status={session.status} fps={update?.fps ?? session.fps} message={statusMessage ?? session.aiStatusMessage} />
            <Button variant="outline" onClick={() => startLive("real")} disabled={session.status === "running"}>Start Live Analysis</Button>
            {mockEnabled && <Button variant="ghost" onClick={() => startLive("mock")} disabled={session.status === "running"}>Dev Mock</Button>}
            <Button variant="destructive" onClick={stop} disabled={session.status === "stopped"}>Stop</Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <LiveVideoPanel update={update} cameraName={session.cameraName} videoUrl={sourceVideoUrl} renderedUrl={renderedStreamUrl} />
          <div className="space-y-6">
            <LiveMinimap update={update} />
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                <Users size={16} className="text-primary" /> Players
              </h2>
              <div className="space-y-2">
                {(session.players ?? []).map((player) => (
                  <div key={player.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span>{player.name}</span>
                    <span className="text-xs text-muted-foreground">{player.slot}{player.team ? ` · team ${player.team}` : ""}</span>
                  </div>
                ))}
                {!(session.players ?? []).length && <p className="text-sm text-muted-foreground">No assigned players yet.</p>}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-bold uppercase tracking-widest text-foreground">
                <Zap size={15} className="text-primary" /> AI telemetry
              </div>
              <p>Frame: {update?.frame ?? session.lastFrame ?? "-"}</p>
              <p>Pose: {update?.pose?.status ?? "waiting"}</p>
              <p>Tracked players: {update?.players?.length ?? update?.pose?.trackedPlayers ?? 0}</p>
              <p>Ball confidence: {update?.ball?.confidence ? `${Math.round(update.ball.confidence * 100)}%` : "-"}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
