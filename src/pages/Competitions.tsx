import Layout from "@/components/Layout";
import { Trophy, Users, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const competitions = [
  { id: 1, name: "Tournoi Padel Printemps 2026", type: "Padel", date: "15 Mars 2026", lieu: "ULTIMA Arena", participants: 16, max: 32, status: "open" },
  { id: 2, name: "Open Tennis La Marsa", type: "Tennis", date: "22 Avril 2026", lieu: "Court Central", participants: 24, max: 32, status: "open" },
  { id: 3, name: "Championnat Interclubs", type: "Padel & Tennis", date: "10 Mai 2026", lieu: "ULTIMA Arena", participants: 32, max: 32, status: "full" },
  { id: 4, name: "Tournoi Junior Padel", type: "Padel", date: "5 Juin 2026", lieu: "Terrain B", participants: 8, max: 16, status: "open" },
];

const leaderboard = [
  { rank: 1, name: "Ahmed B.", wins: 24, losses: 3, points: 1580 },
  { rank: 2, name: "Sami T.", wins: 21, losses: 5, points: 1420 },
  { rank: 3, name: "Youssef K.", wins: 19, losses: 7, points: 1310 },
  { rank: 4, name: "Mariem F.", wins: 18, losses: 6, points: 1280 },
  { rank: 5, name: "Aziz F.", wins: 17, losses: 8, points: 1200 },
];

const Competitions = () => (
  <Layout>
    <div className="container py-12">
      <h1 className="text-3xl font-display font-bold mb-2">Compétitions</h1>
      <p className="text-muted-foreground mb-10">Participez aux tournois et suivez les classements</p>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Tournaments */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="text-primary" size={20} /> Tournois à venir
          </h2>
          {competitions.map((c) => (
            <div key={c.id} className="gradient-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">{c.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  c.status === "open" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {c.status === "open" ? "Inscriptions ouvertes" : "Complet"}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Calendar size={14} /> {c.date}</span>
                <span className="flex items-center gap-1"><MapPin size={14} /> {c.lieu}</span>
                <span className="flex items-center gap-1"><Users size={14} /> {c.participants}/{c.max}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="w-full max-w-xs bg-muted rounded-full h-2 mr-4">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(c.participants / c.max) * 100}%` }} />
                </div>
                <Button size="sm" disabled={c.status === "full"} onClick={() => toast.success(`Inscrit à ${c.name} ! (Démo)`)}>
                  {c.status === "open" ? "S'inscrire" : "Complet"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="text-primary" size={20} /> Classement
          </h2>
          <div className="gradient-card rounded-xl border border-border overflow-hidden">
            {leaderboard.map((p) => (
              <div key={p.rank} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  p.rank === 1 ? "bg-primary text-primary-foreground" :
                  p.rank === 2 ? "bg-muted-foreground/30 text-foreground" :
                  p.rank === 3 ? "bg-orange-500/30 text-orange-300" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {p.rank}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.wins}V - {p.losses}D</div>
                </div>
                <span className="text-sm font-semibold text-primary">{p.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </Layout>
);

export default Competitions;
