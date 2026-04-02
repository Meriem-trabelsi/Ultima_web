import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { BarChart3, TrendingUp, Target, Flame } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

type PerformanceResponse = {
  summary: {
    rankingScore: number;
    winRate: string;
    streak: string;
    matchesThisMonth: number;
  } | null;
  progress: Array<{ semaine: string; score: number; victoires: number; defaites: number }>;
  radar: Array<{ skill: string; value: number }>;
};

const chartStroke = "hsl(var(--primary))";
const chartGrid = "hsl(var(--border))";
const chartBg = "hsl(var(--card))";

const Performance = () => {
  const [data, setData] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getSessionUser();

  useEffect(() => {
    const loadPerformance = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const result = await api<PerformanceResponse>("/api/performance/me", { authenticated: true });
        setData(result);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de charger vos performances.");
      } finally {
        setLoading(false);
      }
    };

    void loadPerformance();
  }, [user]);

  const monthlyData = useMemo(() => {
    return (data?.progress ?? []).map((entry, index) => ({
      mois: `S${index + 1}`,
      victoires: entry.victoires,
      defaites: entry.defaites,
    }));
  }, [data]);

  const statCards = data?.summary
    ? [
        { icon: TrendingUp, label: "Points classement", value: String(data.summary.rankingScore), change: "+110" },
        { icon: Target, label: "Taux de victoire", value: data.summary.winRate, change: "+5%" },
        { icon: Flame, label: "Serie en cours", value: data.summary.streak, change: "" },
        { icon: BarChart3, label: "Matchs ce mois", value: String(data.summary.matchesThisMonth), change: "+2" },
      ]
    : [];

  if (!user) {
    return (
      <Layout>
        <div className="container py-12">
          <h1 className="text-3xl font-display font-bold mb-2">Tableau de Bord Performance</h1>
          <p className="text-muted-foreground">Connectez-vous pour consulter vos statistiques personnelles.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12">
        <h1 className="text-3xl font-display font-bold mb-2">Tableau de Bord Performance</h1>
        <p className="text-muted-foreground mb-10">Suivez vos statistiques et votre progression</p>

        {loading && <div className="text-sm text-muted-foreground mb-6">Chargement des performances...</div>}

        {!!statCards.length && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {statCards.map((stat) => (
              <div key={stat.label} className="gradient-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <stat.icon className="text-primary" size={18} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <div className="text-2xl font-display font-bold">{stat.value}</div>
                {stat.change && <span className="text-xs text-green-400">{stat.change}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          <div className="gradient-card rounded-xl border border-border p-6">
            <h3 className="font-display font-semibold mb-4">Victoires / Defaites</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="mois" stroke={chartStroke} fontSize={12} />
                <YAxis stroke={chartStroke} fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: chartBg, border: `1px solid ${chartGrid}`, borderRadius: 8 }} />
                <Bar dataKey="victoires" fill={chartStroke} radius={[4, 4, 0, 0]} />
                <Bar dataKey="defaites" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="gradient-card rounded-xl border border-border p-6">
            <h3 className="font-display font-semibold mb-4">Progression du Classement</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data?.progress ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="semaine" stroke={chartStroke} fontSize={12} />
                <YAxis stroke={chartStroke} fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: chartBg, border: `1px solid ${chartGrid}`, borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke={chartStroke} strokeWidth={3} dot={{ fill: chartStroke }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {!!data?.radar.length && (
          <div className="gradient-card rounded-xl border border-border p-6 max-w-lg mx-auto">
            <h3 className="font-display font-semibold mb-4 text-center">Profil de Competences</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={data.radar}>
                <PolarGrid stroke={chartGrid} />
                <PolarAngleAxis dataKey="skill" stroke={chartStroke} fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={chartGrid} fontSize={10} />
                <Radar name="Competences" dataKey="value" stroke={chartStroke} fill={chartStroke} fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Performance;
