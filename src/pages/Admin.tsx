import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Users, MapPin, Trophy, Activity, Settings, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const tabs = [
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "courts", label: "Terrains", icon: MapPin },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "logs", label: "Logs & Stats", icon: Activity },
];

type AdminOverview = {
  stats: {
    users: number;
    activeCompetitions: number;
    totalRegistrations: number;
    matchesThisWeek: number;
  };
  users: Array<{ id: number; first_name: string; last_name: string; email: string; role: string; status: string }>;
  courts: Array<{ id: number; name: string; status: string; has_summa: number }>;
  logs: Array<{ id: number; action: string; actor_name: string; detail: string; created_at: string }>;
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getSessionUser();

  useEffect(() => {
    const loadOverview = async () => {
      if (!user || user.role !== "admin") {
        setLoading(false);
        return;
      }

      try {
        const result = await api<AdminOverview>("/api/admin/overview", { authenticated: true });
        setOverview(result);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de charger le panel admin.");
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, [user]);

  if (!user || user.role !== "admin") {
    return (
      <Layout>
        <div className="container py-12">
          <h1 className="text-3xl font-display font-bold mb-2">Panel Administrateur</h1>
          <p className="text-muted-foreground">Connectez-vous avec un compte administrateur pour acceder a ce module.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="text-primary" size={28} />
          <div>
            <h1 className="text-3xl font-display font-bold">Panel Administrateur</h1>
            <p className="text-muted-foreground text-sm">Gestion de la plateforme ULTIMA</p>
          </div>
        </div>

        {loading && <div className="text-sm text-muted-foreground mb-6">Chargement du tableau de bord...</div>}

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "users" && overview && (
          <div className="gradient-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Nom</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Role</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.users.map((member) => (
                    <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{member.first_name} {member.last_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                      <td className="px-4 py-3"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{member.role}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${member.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {member.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "courts" && overview && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview.courts.map((court) => (
              <div key={court.id} className="gradient-card rounded-xl border border-border p-5">
                <div className="flex justify-between items-center mb-2 gap-3">
                  <h3 className="font-semibold">{court.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${court.status === "available" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {court.status === "available" ? "Libre" : "Occupe"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{court.has_summa ? "Equipe scoring automatique" : "Scoring manuel"}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "competitions" && overview && (
          <div className="gradient-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-primary" size={20} />
              <h3 className="font-semibold">Statistiques competitions</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Tournois actifs", value: overview.stats.activeCompetitions },
                { label: "Inscrits total", value: overview.stats.totalRegistrations },
                { label: "Matchs cette semaine", value: overview.stats.matchesThisWeek },
                { label: "Utilisateurs", value: overview.stats.users },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-lg bg-muted/30 text-center">
                  <div className="text-2xl font-display font-bold text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "logs" && overview && (
          <div className="gradient-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Activity className="text-primary" size={16} />
              <span className="text-sm font-medium">Logs recents</span>
            </div>
            {overview.logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 text-sm">
                <span className="text-xs text-muted-foreground w-20">{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="font-medium flex-1">{log.action}</span>
                <span className="text-muted-foreground">{log.actor_name}</span>
                <span className="text-xs text-muted-foreground hidden md:block">{log.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Admin;
