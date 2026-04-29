import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import {
  BarChart3, TrendingUp, Target, Flame, Trophy, Zap, Award,
  Calendar, MapPin, Clock, CheckCircle2, XCircle, Star,
  ArrowUpRight, ArrowDownRight, Activity, Users, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, BarChart, Bar, LineChart, Line,
} from "recharts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

type PlayerStats = {
  ranking_score: number;
  wins: number;
  losses: number;
  total_played: number;
  win_rate: number;
  matches_total: number;
  reservations_total: number;
  reservations_paid: number;
  competitions_total: number;
  profile: {
    service: number; return_skill: number; volley: number;
    endurance: number; strategy: number; mental: number;
  } | null;
  progress: Array<{ label: string; score: number; wins: number; losses: number }>;
};

type MatchRecord = {
  id: number; status: string; score1: number[]; score2: number[];
  player1_name: string; player2_name: string; player1_id: number;
  scheduled_at: string; court_name: string; arena_name: string;
  competition_name?: string; is_winner: boolean; score_source: string;
};

type ReservationRecord = {
  id: number; reservation_date: string; start_time: string; end_time: string;
  status: string; payment_status: string; court_name: string; arena_name: string;
  total_price?: number; amount?: number; currency?: string;
};

type CompetitionRecord = {
  competition_id: number; name: string; sport: string; start_date: string;
  competition_status: string; registration_status: string; arena_name: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const chartPrimary = "hsl(var(--primary))";
const chartOlive = "hsl(var(--ultima-olive, 80 40% 55%))";
const chartGrid = "hsl(var(--border))";

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string; color?: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="gradient-card rounded-xl border border-primary/20 px-4 py-3 text-xs backdrop-blur-md shadow-xl">
      <p className="text-muted-foreground mb-2 font-bold uppercase tracking-widest">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? chartPrimary }} className="font-bold">
          {p.name && <span className="capitalize mr-1">{p.name}:</span>}{p.value}
        </p>
      ))}
    </div>
  );
};

function StatCard({ icon: Icon, label, value, delta, sub, accent }: {
  icon: typeof Trophy; label: string; value: string | number; delta?: number; sub?: string; accent?: string;
}) {
  return (
    <div className="gradient-card rounded-2xl border border-border/50 p-5 flex items-center gap-4 hover:border-primary/30 transition-colors group">
      <div className={`p-3 rounded-xl ${accent ?? "bg-primary/10"} group-hover:scale-110 transition-transform`}>
        <Icon size={22} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-0.5">{label}</p>
        <p className="text-2xl font-display font-bold text-foreground leading-tight flex items-center gap-2">
          {value}
          {delta !== undefined && delta !== 0 && (
            <span className={`text-xs flex items-center gap-0.5 ${delta > 0 ? "text-green-400" : "text-red-400"}`}>
              {delta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(delta)}
            </span>
          )}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section Tabs ──────────────────────────────────────────────────────────────

const sections = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "matches", label: "Match History", icon: Activity },
  { id: "reservations", label: "Reservations", icon: Calendar },
  { id: "competitions", label: "Competitions", icon: Trophy },
];

// ── Component ─────────────────────────────────────────────────────────────────

const Performance = () => {
  const user = getSessionUser();
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [resLoading, setResLoading] = useState(false);
  const [compLoading, setCompLoading] = useState(false);

  // Load stats on mount
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      try {
        const [statsResult] = await Promise.all([
          api<{ stats: PlayerStats }>("/api/player/stats", { authenticated: true }),
        ]);
        setStats(statsResult.stats);
      } catch {
        // Fallback to old endpoint
        try {
          const legacyResult = await api<{
            summary: { rankingScore: number; winRate: string; streak: string; matchesThisMonth: number; wins: number; losses: number } | null;
            progress: Array<{ semaine: string; score: number; victoires: number; defaites: number }>;
            radar: Array<{ skill: string; value: number }>;
          }>("/api/performance/me", { authenticated: true });
          if (legacyResult.summary) {
            setStats({
              ranking_score: legacyResult.summary.rankingScore,
              wins: legacyResult.summary.wins,
              losses: legacyResult.summary.losses,
              total_played: legacyResult.summary.wins + legacyResult.summary.losses,
              win_rate: parseInt(legacyResult.summary.winRate) || 0,
              matches_total: legacyResult.summary.matchesThisMonth,
              reservations_total: 0,
              reservations_paid: 0,
              competitions_total: 0,
              profile: legacyResult.radar.length
                ? {
                    service: legacyResult.radar.find((r) => r.skill === "Service")?.value ?? 0,
                    return_skill: legacyResult.radar.find((r) => r.skill === "Return")?.value ?? 0,
                    volley: legacyResult.radar.find((r) => r.skill === "Volley")?.value ?? 0,
                    endurance: legacyResult.radar.find((r) => r.skill === "Endurance")?.value ?? 0,
                    strategy: legacyResult.radar.find((r) => r.skill === "Strategy")?.value ?? 0,
                    mental: legacyResult.radar.find((r) => r.skill === "Mental")?.value ?? 0,
                  }
                : null,
              progress: legacyResult.progress.map((p) => ({
                label: p.semaine,
                score: p.score,
                wins: p.victoires,
                losses: p.defaites,
              })),
            });
          }
        } catch {
          toast.error("Failed to load performance data.");
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user?.id]);

  // Load section-specific data
  useEffect(() => {
    if (!user) return;
    if (tab === "matches" && !matches.length) {
      setMatchLoading(true);
      api<{ matches: MatchRecord[] }>("/api/player/history/matches", { authenticated: true })
        .then((r) => setMatches(r.matches))
        .catch(() => {
          api<{ matches: MatchRecord[] }>("/api/player/matches", { authenticated: true })
            .then((r) => setMatches(r.matches))
            .catch(() => {});
        })
        .finally(() => setMatchLoading(false));
    }
    if (tab === "reservations" && !reservations.length) {
      setResLoading(true);
      api<{ reservations: ReservationRecord[] }>("/api/player/history/reservations", { authenticated: true })
        .then((r) => setReservations(r.reservations))
        .catch(() => {
          api<{ reservations: ReservationRecord[] }>("/api/reservations/my", { authenticated: true })
            .then((r) => setReservations(r.reservations))
            .catch(() => {});
        })
        .finally(() => setResLoading(false));
    }
    if (tab === "competitions" && !competitions.length) {
      setCompLoading(true);
      api<{ competitions: CompetitionRecord[] }>("/api/player/history/competitions", { authenticated: true })
        .then((r) => setCompetitions(r.competitions))
        .catch(() => {})
        .finally(() => setCompLoading(false));
    }
  }, [tab, user?.id]);

  const radarData = useMemo(() => {
    if (!stats?.profile) return [];
    const p = stats.profile;
    return [
      { skill: "Service", value: p.service },
      { skill: "Return", value: p.return_skill },
      { skill: "Volley", value: p.volley },
      { skill: "Endurance", value: p.endurance },
      { skill: "Strategy", value: p.strategy },
      { skill: "Mental", value: p.mental },
    ];
  }, [stats?.profile]);

  const winLossData = useMemo(() => {
    if (!stats?.progress?.length) return [];
    return stats.progress.slice(-12).map((p) => ({
      week: p.label,
      Wins: p.wins,
      Losses: p.losses,
    }));
  }, [stats?.progress]);

  if (!user) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <BarChart3 size={48} className="text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold">Sign in to see your analytics</h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 lg:py-12 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <BarChart3 size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-gradient uppercase tracking-tighter">
                My Analytics
              </h1>
              <p className="text-muted-foreground text-sm">{user.firstName} {user.lastName} · Performance Dashboard</p>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                tab === s.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <s.icon size={14} />
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Dashboard Tab ── */}
        {tab === "dashboard" && (
          <div className="space-y-8">
            {loading ? (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : !stats ? (
              <div className="text-center py-16">
                <Activity size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No performance data yet. Play some matches to see your stats.</p>
              </div>
            ) : (
              <>
                {/* Stat Cards */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard icon={Star} label="Ranking Score" value={stats.ranking_score} accent="bg-yellow-500/10" />
                  <StatCard icon={CheckCircle2} label="Wins" value={stats.wins} accent="bg-green-500/10" />
                  <StatCard icon={XCircle} label="Losses" value={stats.losses} accent="bg-red-500/10" />
                  <StatCard
                    icon={TrendingUp}
                    label="Win Rate"
                    value={`${stats.win_rate}%`}
                    accent={stats.win_rate >= 50 ? "bg-green-500/10" : "bg-amber-500/10"}
                  />
                  <StatCard icon={Activity} label="Matches Played" value={stats.total_played} />
                  <StatCard icon={Calendar} label="Reservations" value={stats.reservations_total} sub={`${stats.reservations_paid} paid`} />
                  <StatCard icon={Trophy} label="Competitions" value={stats.competitions_total} />
                  <StatCard
                    icon={Target}
                    label="Win Streak"
                    value={stats.wins > 0 ? `${Math.min(stats.wins, 3)}` : "0"}
                    sub="recent wins"
                  />
                </div>

                {/* Progress Chart */}
                {stats.progress.length > 0 && (
                  <div className="gradient-card rounded-2xl border border-border/50 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-5 flex items-center gap-2">
                      <TrendingUp size={14} /> Ranking Progress
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={stats.progress}>
                        <defs>
                          <linearGradient id="rankGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartPrimary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={chartPrimary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="score" name="Ranking" stroke={chartPrimary} fill="url(#rankGrad)" strokeWidth={2} dot={{ fill: chartPrimary, r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Win/Loss Chart + Radar */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {winLossData.length > 0 && (
                    <div className="gradient-card rounded-2xl border border-border/50 p-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-5 flex items-center gap-2">
                        <BarChart3 size={14} /> Wins & Losses
                      </h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={winLossData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                          <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="Wins" fill="#10b981" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="Losses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {radarData.length > 0 && (
                    <div className="gradient-card rounded-2xl border border-border/50 p-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-5 flex items-center gap-2">
                        <Target size={14} /> Skill Profile
                      </h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke={chartGrid} />
                          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Radar name="Skills" dataKey="value" stroke={chartPrimary} fill={chartPrimary} fillOpacity={0.25} strokeWidth={2} />
                          <Tooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* AI Placeholder */}
                <div className="gradient-card rounded-2xl border border-purple-500/20 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-purple-500/10">
                      <Zap size={18} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        SmartPlay AI Insights
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300">Coming Soon</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">Advanced AI metrics will appear here once SmartPlay AI is connected</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      { label: "Court Coverage", icon: MapPin },
                      { label: "Reaction Speed", icon: Zap },
                      { label: "Shot Accuracy", icon: Target },
                      { label: "Movement Score", icon: Activity },
                      { label: "Heatmap", icon: Flame },
                    ].map(({ label, icon: Icon }) => (
                      <div key={label} className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-3 text-center">
                        <Icon size={18} className="text-purple-400/50 mx-auto mb-2" />
                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                        <p className="text-lg font-bold text-purple-300/40 mt-1">—</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Match History Tab ── */}
        {tab === "matches" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity size={18} className="text-primary" /> Match History
            </h3>
            {matchLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : !matches.length ? (
              <div className="text-center py-16">
                <Activity size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No matches found. Your match history will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <div key={match.id}
                    className={`gradient-card rounded-xl border p-4 flex items-center gap-4 ${
                      match.is_winner ? "border-green-500/20" : "border-border/40"
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${match.is_winner ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {match.is_winner
                        ? <CheckCircle2 size={18} className="text-green-400" />
                        : <XCircle size={18} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {match.player1_name} <span className="text-muted-foreground">vs</span> {match.player2_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{match.court_name} · {match.arena_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono font-bold text-sm">
                        {(match.score1 ?? []).join("-")} / {(match.score2 ?? []).join("-")}
                      </p>
                      <p className="text-xs text-muted-foreground">{match.scheduled_at ? new Date(match.scheduled_at).toLocaleDateString() : "—"}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        match.is_winner
                          ? "bg-green-500/15 text-green-300"
                          : "bg-red-500/15 text-red-300"
                      }`}>
                        {match.is_winner ? "Win" : "Loss"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Reservations Tab ── */}
        {tab === "reservations" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calendar size={18} className="text-primary" /> Reservation History
            </h3>
            {resLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : !reservations.length ? (
              <div className="text-center py-16">
                <Calendar size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No reservations yet. Book your first court!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reservations.map((res) => (
                  <div key={res.id} className="gradient-card rounded-xl border border-border/40 p-4 flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                      <MapPin size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{res.court_name}</p>
                      <p className="text-xs text-muted-foreground">{res.arena_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium">{res.reservation_date}</p>
                      <p className="text-xs text-muted-foreground">{res.start_time} – {res.end_time}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end flex-shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        res.status === "confirmed" ? "bg-green-500/15 text-green-300" : "bg-muted text-muted-foreground"
                      }`}>{res.status}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        res.payment_status === "paid" ? "bg-green-500/15 text-green-300" :
                        res.payment_status === "pending" ? "bg-amber-500/15 text-amber-300" :
                        "bg-muted text-muted-foreground"
                      }`}>{res.payment_status ?? "pending"}</span>
                    </div>
                    {(res.total_price || res.amount) && (
                      <p className="text-sm font-bold text-primary flex-shrink-0">
                        {(res.total_price ?? res.amount ?? 0).toFixed(3)} {res.currency ?? "TND"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Competitions Tab ── */}
        {tab === "competitions" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Trophy size={18} className="text-primary" /> Competition History
            </h3>
            {compLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : !competitions.length ? (
              <div className="text-center py-16">
                <Trophy size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">You haven't joined any competitions yet.</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/competitions"}>
                  Browse Competitions
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {competitions.map((comp) => (
                  <div key={comp.competition_id} className="gradient-card rounded-xl border border-border/40 p-5 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{comp.name}</p>
                        <p className="text-xs text-muted-foreground">{comp.arena_name}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                        comp.registration_status === "registered"
                          ? "bg-green-500/15 text-green-300"
                          : "bg-muted text-muted-foreground"
                      }`}>{comp.registration_status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Trophy size={10} />{comp.sport}</span>
                      <span className="flex items-center gap-1"><Calendar size={10} />{comp.start_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Performance;
