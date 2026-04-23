import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import {
  BarChart3, TrendingUp, Target, Flame,
  MapPin, Trophy, ArrowRight, CheckCircle2, XCircle, Activity,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar,
} from "recharts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type PlayerMatch = {
  id: number;
  court_name: string;
  arena_name: string;
  score1: number[];
  score2: number[];
  winner_team: number;
  scheduled_at: string;
  team1_player1_id: number;
  team1_player2_id: number;
  team2_player1_id: number;
  team2_player2_id: number;
};

type PerformanceResponse = {
  summary: {
    rankingScore: number;
    winRate: string;
    streak: string;
    matchesThisMonth: number;
    wins: number;
    losses: number;
  } | null;
  progress: Array<{ semaine: string; score: number; victoires: number; defaites: number }>;
  radar: Array<{ skill: string; value: number }>;
};

/* ── Count-up component ── */
const CountUp = ({
  target,
  suffix = "",
  duration = 1200,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{val.toLocaleString()}{suffix}</>;
};

const chartGrid = "hsl(var(--border))";
const chartBg = "hsl(var(--card))";
const chartPrimary = "hsl(var(--primary))";

/* ── Custom tooltip ── */
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="gradient-card rounded-xl border border-primary/20 px-4 py-3 text-xs backdrop-blur-md"
      style={{ boxShadow: "0 8px 30px hsl(var(--primary)/0.15)" }}>
      <p className="text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-primary font-black text-base">{payload[0].value} pts</p>
    </div>
  );
};

const Performance = () => {
  const [data, setData] = useState<PerformanceResponse | null>(null);
  const [matches, setMatches] = useState<PlayerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const user = getSessionUser();

  useEffect(() => {
    const loadPerformance = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const [perf, m] = await Promise.all([
          api<PerformanceResponse>("/api/performance/me", { authenticated: true }),
          api<{ matches: PlayerMatch[] }>("/api/player/matches", { authenticated: true }),
        ]);
        setData(perf);
        setMatches(m.matches);
      } catch {
        toast.error("Impossible de charger vos statistiques.");
      } finally {
        setLoading(false);
      }
    };
    void loadPerformance();
  }, [user?.id]);

  const statCards = data?.summary
    ? [
        {
          icon: TrendingUp,
          label: "Points classement",
          numericValue: data.summary.rankingScore,
          suffix: "",
          rawValue: String(data.summary.rankingScore),
          color: "text-primary",
          glowColor: "hsl(var(--primary))",
        },
        {
          icon: Target,
          label: "Taux de victoire",
          numericValue: parseFloat(data.summary.winRate) || 0,
          suffix: "%",
          rawValue: data.summary.winRate,
          color: "text-blue-400",
          glowColor: "hsl(210 85% 60%)",
        },
        {
          icon: Flame,
          label: "Serie en cours",
          numericValue: null,
          suffix: "",
          rawValue: data.summary.streak,
          color: "text-orange-400",
          glowColor: "hsl(30 90% 55%)",
        },
        {
          icon: BarChart3,
          label: "Matchs joues",
          numericValue: data.summary.wins + data.summary.losses,
          suffix: "",
          rawValue: String(data.summary.wins + data.summary.losses),
          color: "text-green-400",
          glowColor: "hsl(142 72% 50%)",
        },
      ]
    : [];

  const filteredMatches = useMemo(() => {
    if (!user) return [];
    return matches.filter((m) => {
      const isWinner =
        (m.winner_team === 1 && (m.team1_player1_id === user.id || m.team1_player2_id === user.id)) ||
        (m.winner_team === 2 && (m.team2_player1_id === user.id || m.team2_player2_id === user.id));
      if (filter === "win") return isWinner;
      if (filter === "loss") return !isWinner;
      return true;
    });
  }, [matches, filter, user?.id]);

  if (!user) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h1 className="text-3xl font-display font-bold mb-4">Statistiques indisponibles</h1>
          <p className="text-muted-foreground mb-8">Connectez-vous pour voir vos statistiques de jeu.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient uppercase tracking-tighter mb-4">
            Performance Player
          </h1>
          <p className="text-muted-foreground tracking-widest uppercase text-xs font-bold flex items-center gap-2">
            <Activity className="text-primary" size={14} /> Statistiques & Historique de Jeu
          </p>
        </header>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="gradient-card rounded-2xl border border-border p-6 space-y-4">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="gradient-card rounded-2xl border border-border p-8 space-y-4">
                <Skeleton className="h-8 w-64 rounded-lg" />
                <Skeleton className="h-[280px] w-full rounded-xl" />
              </div>
              <div className="gradient-card rounded-2xl border border-border p-8 space-y-4">
                <Skeleton className="h-8 w-52 rounded-lg" />
                <Skeleton className="h-[280px] w-full rounded-xl" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── Stat cards ── */}
            {!!statCards.length && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {statCards.map((stat) => (
                  <div
                    key={stat.label}
                    className="gradient-card rounded-2xl border border-border p-6 shadow-lg hover:border-primary/20 transition-all group"
                    style={{
                      boxShadow: `0 0 0 0 ${stat.glowColor}`,
                      transition: "box-shadow 300ms ease, transform 300ms ease, border-color 300ms ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${stat.glowColor}28`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 0 transparent";
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="p-2 rounded-lg transition-all group-hover:scale-110"
                        style={{ background: `${stat.glowColor}18` }}
                      >
                        <stat.icon className={stat.color} size={20} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {stat.label}
                      </span>
                    </div>
                    <div className="text-3xl font-display font-bold">
                      {stat.numericValue !== null ? (
                        <CountUp target={stat.numericValue} suffix={stat.suffix} />
                      ) : (
                        stat.rawValue
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Charts ── */}
            <div className="grid lg:grid-cols-2 gap-6 mb-12">
              {/* ELO Area chart with gradient fill */}
              <div className="gradient-card rounded-2xl border border-border p-8 overflow-hidden">
                <h3 className="text-lg font-bold font-display uppercase tracking-tighter mb-8 bg-muted/40 p-3 rounded-lg flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" /> Progression ELO Score
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.progress} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartPrimary} stopOpacity={0.45} />
                          <stop offset="95%" stopColor={chartPrimary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} opacity={0.25} vertical={false} />
                      <XAxis
                        dataKey="semaine"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke={chartPrimary}
                        strokeWidth={2.5}
                        fill="url(#eloGradient)"
                        dot={{ fill: chartPrimary, r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                        activeDot={{ r: 6, stroke: chartPrimary, strokeWidth: 2, fill: "#fff" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar chart */}
              <div className="gradient-card rounded-2xl border border-border p-8">
                <h3 className="text-lg font-bold font-display uppercase tracking-tighter mb-8 bg-muted/40 p-3 rounded-lg flex items-center gap-2">
                  <Target size={16} className="text-blue-400" /> Profil Technique
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data?.radar}>
                      <defs>
                        <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartPrimary} stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(210 85% 60%)" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <PolarGrid stroke={chartGrid} strokeOpacity={0.4} />
                      <PolarAngleAxis
                        dataKey="skill"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartBg,
                          border: `1px solid ${chartGrid}`,
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Radar
                        name="Aptitude"
                        dataKey="value"
                        stroke={chartPrimary}
                        strokeWidth={2}
                        fill="url(#radarGradient)"
                        fillOpacity={1}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Match history ── */}
            <div className="gradient-card rounded-2xl border border-border p-8 shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                <h2 className="text-xl font-bold font-display uppercase tracking-tighter flex items-center gap-3">
                  <Trophy size={20} className="text-yellow-400" /> Historique des Matchs
                </h2>
                <div className="flex gap-2">
                  {(["all", "win", "loss"] as const).map((f) => (
                    <Button
                      key={f}
                      variant={filter === f ? "default" : "outline"}
                      size="sm"
                      className="text-[10px] font-bold tracking-widest uppercase h-8"
                      onClick={() => setFilter(f)}
                    >
                      {f === "all" ? "Tous" : f === "win" ? "Victoires" : "Defaites"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {filteredMatches.map((m) => {
                  const isWinner =
                    (m.winner_team === 1 && (m.team1_player1_id === user.id || m.team1_player2_id === user.id)) ||
                    (m.winner_team === 2 && (m.team2_player1_id === user.id || m.team2_player2_id === user.id));
                  return (
                    <div
                      key={m.id}
                      className="flex flex-col md:flex-row items-center justify-between p-5 rounded-2xl border border-white/5 bg-muted/20 hover:bg-muted/35 hover:border-primary/15 transition-all gap-4 group"
                    >
                      <div className="flex items-center gap-5 w-full md:w-auto">
                        <div
                          className={`p-3 rounded-full transition-all group-hover:scale-110 ${
                            isWinner ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {isWinner ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                        </div>
                        <div>
                          <div className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            {isWinner ? "Victoire" : "Defaite"}
                            <span className="text-xs text-muted-foreground font-normal tracking-normal capitalize">
                              • {new Date(m.scheduled_at).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <MapPin size={12} /> {m.arena_name} — {m.court_name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-background/50 px-6 py-3 rounded-xl border border-border group-hover:border-primary/20 transition-all">
                        <div className="text-2xl font-display font-black tracking-tighter text-gradient">
                          {m.score1.join(" ")}
                        </div>
                        <div className="text-muted-foreground text-xs font-black">VS</div>
                        <div className="text-2xl font-display font-black tracking-tighter">
                          {m.score2.join(" ")}
                        </div>
                      </div>

                      <div className="w-full md:w-auto flex justify-end">
                        <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase tracking-widest gap-2 hover:border-primary/40">
                          Analyses <ArrowRight size={14} />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredMatches.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl">
                    <Trophy size={32} className="text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground uppercase text-xs font-bold tracking-widest">
                      Aucun match enregistre pour le moment.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Performance;
