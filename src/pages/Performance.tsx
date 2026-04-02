import Layout from "@/components/Layout";
import { BarChart3, TrendingUp, Target, Flame } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const monthlyData = [
  { mois: "Jan", victoires: 4, defaites: 1 },
  { mois: "Fév", victoires: 5, defaites: 2 },
  { mois: "Mar", victoires: 3, defaites: 3 },
  { mois: "Avr", victoires: 6, defaites: 1 },
  { mois: "Mai", victoires: 7, defaites: 0 },
  { mois: "Juin", victoires: 5, defaites: 2 },
];

const progressData = [
  { semaine: "S1", score: 1050 },
  { semaine: "S2", score: 1080 },
  { semaine: "S3", score: 1120 },
  { semaine: "S4", score: 1100 },
  { semaine: "S5", score: 1180 },
  { semaine: "S6", score: 1200 },
  { semaine: "S7", score: 1250 },
  { semaine: "S8", score: 1310 },
];

const radarData = [
  { skill: "Service", value: 85 },
  { skill: "Retour", value: 72 },
  { skill: "Volée", value: 90 },
  { skill: "Endurance", value: 68 },
  { skill: "Stratégie", value: 78 },
  { skill: "Mental", value: 82 },
];

const statCards = [
  { icon: TrendingUp, label: "Points classement", value: "1,310", change: "+110" },
  { icon: Target, label: "Taux de victoire", value: "78%", change: "+5%" },
  { icon: Flame, label: "Série en cours", value: "5 victoires", change: "" },
  { icon: BarChart3, label: "Matchs ce mois", value: "7", change: "+2" },
];

const Performance = () => (
  <Layout>
    <div className="container py-12">
      <h1 className="text-3xl font-display font-bold mb-2">Tableau de Bord Performance</h1>
      <p className="text-muted-foreground mb-10">Suivez vos statistiques et votre progression</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((s) => (
          <div key={s.label} className="gradient-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <s.icon className="text-primary" size={18} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-2xl font-display font-bold">{s.value}</div>
            {s.change && <span className="text-xs text-green-400">↑ {s.change}</span>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {/* Bar chart */}
        <div className="gradient-card rounded-xl border border-border p-6">
          <h3 className="font-display font-semibold mb-4">Victoires / Défaites par Mois</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(90 20% 20%)" />
              <XAxis dataKey="mois" stroke="hsl(48 20% 60%)" fontSize={12} />
              <YAxis stroke="hsl(48 20% 60%)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(15 20% 8%)", border: "1px solid hsl(90 20% 20%)", borderRadius: 8, color: "hsl(48 100% 95%)" }} />
              <Bar dataKey="victoires" fill="hsl(50 100% 63%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="defaites" fill="hsl(90 35% 27%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart */}
        <div className="gradient-card rounded-xl border border-border p-6">
          <h3 className="font-display font-semibold mb-4">Progression du Classement</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(90 20% 20%)" />
              <XAxis dataKey="semaine" stroke="hsl(48 20% 60%)" fontSize={12} />
              <YAxis stroke="hsl(48 20% 60%)" fontSize={12} domain={[1000, 1400]} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(15 20% 8%)", border: "1px solid hsl(90 20% 20%)", borderRadius: 8, color: "hsl(48 100% 95%)" }} />
              <Line type="monotone" dataKey="score" stroke="hsl(50 100% 63%)" strokeWidth={3} dot={{ fill: "hsl(50 100% 63%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar chart */}
      <div className="gradient-card rounded-xl border border-border p-6 max-w-lg mx-auto">
        <h3 className="font-display font-semibold mb-4 text-center">Profil de Compétences</h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(90 20% 20%)" />
            <PolarAngleAxis dataKey="skill" stroke="hsl(48 20% 60%)" fontSize={12} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(90 20% 20%)" fontSize={10} />
            <Radar name="Compétences" dataKey="value" stroke="hsl(50 100% 63%)" fill="hsl(50 100% 63%)" fillOpacity={0.2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </Layout>
);

export default Performance;
