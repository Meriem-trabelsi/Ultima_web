import { useState } from "react";
import Layout from "@/components/Layout";
import { Users, MapPin, Trophy, Activity, Settings, BarChart3 } from "lucide-react";

const tabs = [
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "courts", label: "Terrains", icon: MapPin },
  { id: "competitions", label: "Compétitions", icon: Trophy },
  { id: "logs", label: "Logs & Stats", icon: Activity },
];

const mockUsers = [
  { id: 1, nom: "Ahmed Bouazizi", email: "ahmed@email.com", role: "Joueur", status: "Actif" },
  { id: 2, nom: "Sami Trabelsi", email: "sami@email.com", role: "Entraîneur", status: "Actif" },
  { id: 3, nom: "Mariem Ferchichi", email: "mariem@email.com", role: "Joueur", status: "Inactif" },
  { id: 4, nom: "Youssef Khelifi", email: "youssef@email.com", role: "Joueur", status: "Actif" },
];

const mockLogs = [
  { time: "14:32", action: "Réservation confirmée", user: "Ahmed B.", detail: "Padel A - 15:30" },
  { time: "14:28", action: "Inscription tournoi", user: "Sami T.", detail: "Open Tennis La Marsa" },
  { time: "14:15", action: "Score mis à jour", user: "Système SUMMA", detail: "Court Padel C" },
  { time: "14:02", action: "Nouveau compte", user: "Ines R.", detail: "Rôle: Joueur" },
  { time: "13:45", action: "Match terminé", user: "Système", detail: "Aziz F. vs Nabil M." },
];

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");

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

        {/* Tabs */}
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

        {/* Users tab */}
        {activeTab === "users" && (
          <div className="gradient-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Nom</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Rôle</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{u.nom}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{u.role}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === "Actif" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Courts tab */}
        {activeTab === "courts" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {["Padel A", "Padel B", "Padel C (SUMMA)", "Tennis 1", "Tennis 2", "Tennis 3 (SUMMA)"].map((court, i) => (
              <div key={court} className="gradient-card rounded-xl border border-border p-5">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{court}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${i % 3 === 0 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                    {i % 3 === 0 ? "Occupé" : "Libre"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{court.includes("SUMMA") ? "Équipé scoring automatique" : "Scoring manuel"}</p>
              </div>
            ))}
          </div>
        )}

        {/* Competitions tab */}
        {activeTab === "competitions" && (
          <div className="gradient-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-primary" size={20} />
              <h3 className="font-semibold">Statistiques Compétitions</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Tournois actifs", value: "3" },
                { label: "Inscrits total", value: "80" },
                { label: "Matchs cette semaine", value: "12" },
                { label: "Tournois terminés", value: "7" },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-lg bg-muted/30 text-center">
                  <div className="text-2xl font-display font-bold text-primary">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs tab */}
        {activeTab === "logs" && (
          <div className="gradient-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Activity className="text-primary" size={16} />
              <span className="text-sm font-medium">Logs récents</span>
            </div>
            {mockLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 text-sm">
                <span className="text-xs text-muted-foreground w-12">{log.time}</span>
                <span className="font-medium flex-1">{log.action}</span>
                <span className="text-muted-foreground">{log.user}</span>
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
