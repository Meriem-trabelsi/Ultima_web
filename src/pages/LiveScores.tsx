import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Activity, Radio, Zap, Clock, CheckCircle2, Trophy, MapPin, Edit2, X } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

type Match = {
  id: number;
  court_name: string | null;
  arena_name?: string | null;
  player1_name: string;
  player2_name: string;
  score1: number[];
  score2: number[];
  current_set: number;
  status: "live" | "finished" | "upcoming";
  score_source?: string;
  competition_name?: string | null;
  scheduled_at?: string | null;
};

// ── Score Source Badge ─────────────────────────────────────────────────────────

function SourceBadge({ source }: { source?: string }) {
  if (!source || source === "manual") return null;
  const map: Record<string, string> = {
    summa: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    ai: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    corrected: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${map[source] ?? "bg-muted text-muted-foreground"}`}>
      {source}
    </span>
  );
}

// ── Set Score Display ─────────────────────────────────────────────────────────

function SetScores({ scores, isWinning }: { scores: number[]; isWinning: boolean }) {
  return (
    <div className="flex gap-1.5 items-center">
      {scores.map((s, i) => (
        <span
          key={i}
          className={`w-8 h-8 flex items-center justify-center rounded-lg font-display font-bold text-base transition-colors ${
            isWinning ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted/60 text-muted-foreground"
          }`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// ── Match Card ────────────────────────────────────────────────────────────────

function MatchCard({
  match,
  canEdit,
  onEditRequest,
}: {
  match: Match;
  canEdit: boolean;
  onEditRequest: (m: Match) => void;
}) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const score1Total = match.score1?.reduce((a, b) => a + b, 0) ?? 0;
  const score2Total = match.score2?.reduce((a, b) => a + b, 0) ?? 0;
  const p1Winning = score1Total > score2Total;
  const p2Winning = score2Total > score1Total;

  return (
    <div className={`gradient-card rounded-2xl border p-5 transition-all ${
      isLive
        ? "border-red-500/30 shadow-lg shadow-red-500/10"
        : isFinished
        ? "border-border/30 opacity-80"
        : "border-border/50"
    }`}>
      {/* Top row: status & venue */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isLive && (
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
              <Radio size={10} /> Live
            </span>
          )}
          {isFinished && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              <CheckCircle2 size={10} /> Final
            </span>
          )}
          {match.status === "upcoming" && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
              <Clock size={10} /> Upcoming
            </span>
          )}
          {match.competition_name && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Trophy size={10} /> {match.competition_name}
            </span>
          )}
          <SourceBadge source={match.score_source} />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {match.court_name && (
            <span className="flex items-center gap-1 truncate max-w-[120px]">
              <MapPin size={9} /> {match.court_name}
            </span>
          )}
          {canEdit && (
            <button
              onClick={() => onEditRequest(match)}
              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors"
              title="Correct score"
            >
              <Edit2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Score area */}
      <div className="space-y-3">
        {/* Player 1 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {p1Winning && isLive && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />}
            <span className={`font-display font-bold text-base truncate ${p1Winning ? "text-foreground" : "text-muted-foreground"}`}>
              {match.player1_name}
            </span>
          </div>
          {(match.score1?.length > 0 || isLive) && (
            <SetScores scores={match.score1 ?? []} isWinning={p1Winning && (isLive || isFinished)} />
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">VS</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        {/* Player 2 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {p2Winning && isLive && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />}
            <span className={`font-display font-bold text-base truncate ${p2Winning ? "text-foreground" : "text-muted-foreground"}`}>
              {match.player2_name}
            </span>
          </div>
          {(match.score2?.length > 0 || isLive) && (
            <SetScores scores={match.score2 ?? []} isWinning={p2Winning && (isLive || isFinished)} />
          )}
        </div>
      </div>

      {/* Footer */}
      {(isLive || match.scheduled_at) && (
        <div className="mt-3 pt-3 border-t border-border/20 flex items-center justify-between text-[10px] text-muted-foreground">
          {isLive && (
            <span className="flex items-center gap-1">
              <Zap size={10} className="text-primary" /> Set {match.current_set}
            </span>
          )}
          {match.scheduled_at && (
            <span>{new Date(match.scheduled_at).toLocaleString()}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Quick Score Modal ─────────────────────────────────────────────────────────

function QuickScoreModal({
  match,
  onClose,
  onSaved,
}: {
  match: Match;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [s1, setS1] = useState((match.score1 ?? []).join(","));
  const [s2, setS2] = useState((match.score2 ?? []).join(","));
  const [status, setStatus] = useState(match.status);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const score1 = s1.split(",").map(Number).filter((n) => !isNaN(n));
    const score2 = s2.split(",").map(Number).filter((n) => !isNaN(n));
    if (!reason.trim()) { toast.error("Reason is required for score correction."); return; }
    setSaving(true);
    try {
      await api(`/api/matches/${match.id}/score`, {
        method: "PATCH",
        body: JSON.stringify({ score1, score2, status, reason }),
        authenticated: true,
      });
      toast.success("Score corrected successfully.");
      onSaved();
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save."); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="gradient-card rounded-2xl border border-border w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg">Correct Score</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-5">{match.player1_name} vs {match.player2_name}</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">{match.player1_name}</label>
            <Input value={s1} onChange={(e) => setS1(e.target.value)} placeholder="e.g. 6,3,7" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">{match.player2_name}</label>
            <Input value={s2} onChange={(e) => setS2(e.target.value)} placeholder="e.g. 4,6,5" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "live" | "finished" | "upcoming")}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              {["live", "upcoming", "finished"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Reason *</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for correction" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const LiveScores = () => {
  const user = getSessionUser();
  const isAdmin = user && ["admin", "super_admin"].includes(user.role);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "finished">("all");
  const [correcting, setCorrecting] = useState<Match | null>(null);

  useEffect(() => {
    const socketUrl = typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : "http://localhost:3001";

    const socket: Socket = io(socketUrl, { reconnectionAttempts: 5 });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("scores:update", (data: { matches: Match[] }) => {
      setMatches(data.matches ?? []);
      setLoading(false);
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      socket.disconnect();
    };
  }, []);

  const filteredMatches = matches.filter((m) => filter === "all" || m.status === filter);
  const liveCount = matches.filter((m) => m.status === "live").length;
  const upcomingCount = matches.filter((m) => m.status === "upcoming").length;
  const finishedCount = matches.filter((m) => m.status === "finished").length;

  const filterTabs: Array<{ id: "all" | "live" | "upcoming" | "finished"; label: string; count: number }> = [
    { id: "all", label: "All", count: matches.length },
    { id: "live", label: "Live", count: liveCount },
    { id: "upcoming", label: "Upcoming", count: upcomingCount },
    { id: "finished", label: "Finished", count: finishedCount },
  ];

  return (
    <Layout>
      <div className="container py-8 lg:py-12 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient uppercase tracking-tighter">
                Live Scores
              </h1>
              <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                connected
                  ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
                  : "bg-muted text-muted-foreground border-border"
              }`}>
                <Radio size={10} />
                {connected ? "Live" : "Offline"}
              </div>
            </div>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Activity size={12} className="text-primary" />
              Real-time updates · SUMMA Scoring System
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                Admin: click <Edit2 size={10} className="inline" /> to correct scores
              </div>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-xl border p-3 text-center ${liveCount > 0 ? "border-red-500/30 bg-red-500/5" : "border-border/30"}`}>
            <p className="text-2xl font-display font-bold text-red-400">{liveCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live</p>
          </div>
          <div className="rounded-xl border border-border/30 p-3 text-center">
            <p className="text-2xl font-display font-bold">{upcomingCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upcoming</p>
          </div>
          <div className="rounded-xl border border-border/30 p-3 text-center">
            <p className="text-2xl font-display font-bold text-muted-foreground">{finishedCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Finished</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                filter === tab.id
                  ? tab.id === "live"
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.id === "live" && tab.count > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              )}
              {tab.label}
              <span className="text-[10px] opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Matches grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
          </div>
        ) : !filteredMatches.length ? (
          <div className="text-center py-20">
            <Activity size={48} className="text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              {filter === "live" ? "No live matches right now." : filter === "upcoming" ? "No upcoming matches." : "No matches found."}
            </p>
            {!connected && (
              <p className="text-xs text-muted-foreground/70 mt-2">
                Not connected to live server. Check your connection.
              </p>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                canEdit={!!isAdmin}
                onEditRequest={setCorrecting}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-4 border-t border-border/20">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> SUMMA source</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" /> AI source</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Corrected</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Manual</span>
        </div>
      </div>

      {correcting && (
        <QuickScoreModal
          match={correcting}
          onClose={() => setCorrecting(null)}
          onSaved={() => {
            // Score will auto-update via WebSocket — just close
          }}
        />
      )}
    </Layout>
  );
};

export default LiveScores;
