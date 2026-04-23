import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Trophy, Users, Calendar, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";

type Competition = {
  id: number;
  name: string;
  sport: string;
  start_date: string;
  location: string;
  participants: number;
  max_participants: number;
  status: "open" | "full" | "closed";
};

type LeaderboardEntry = {
  rank: number;
  name: string;
  wins: number;
  losses: number;
  points: number;
};

const formatDate = (date: string) => new Date(date).toLocaleDateString("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const Competitions = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompetitions = async () => {
    try {
      const result = await api<{ competitions: Competition[]; leaderboard: LeaderboardEntry[] }>("/api/competitions");
      setCompetitions(result.competitions);
      setLeaderboard(result.leaderboard);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les competitions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompetitions();
  }, []);

  const handleRegister = async (competitionId: number) => {
    if (!getSessionUser()) {
      toast.error("Connectez-vous pour vous inscrire.");
      return;
    }

    try {
      await api(`/api/competitions/${competitionId}/register`, {
        method: "POST",
        authenticated: true,
      });
      toast.success("Inscription enregistree.");
      await loadCompetitions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inscription impossible.");
    }
  };

  return (
    <Layout>
      <div className="container py-12">
        <h1 className="text-3xl font-display font-bold mb-2">Competitions</h1>
        <p className="text-muted-foreground mb-10">Participez aux tournois et suivez les classements</p>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="text-primary" size={20} /> Tournois a venir
            </h2>
            {loading && (
              <div className="space-y-4 mb-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="gradient-card rounded-xl border border-border p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-5 w-28 rounded-full" />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-9 w-28 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {competitions.map((competition) => (
              <div key={competition.id} className="gradient-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start mb-3 gap-3">
                  <h3 className="font-semibold">{competition.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    competition.status === "open" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {competition.status === "open" ? "Inscriptions ouvertes" : "Complet"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(competition.start_date)}</span>
                  <span className="flex items-center gap-1"><MapPin size={14} /> {competition.location}</span>
                  <span className="flex items-center gap-1"><Users size={14} /> {competition.participants}/{competition.max_participants}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Link to={`/competitions/${competition.id}`} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1">
                    Voir Details <ArrowRight size={14} />
                  </Link>
                  <Button size="sm" className="h-9 px-6 font-bold uppercase tracking-tighter" disabled={competition.status !== "open"} onClick={() => void handleRegister(competition.id)}>
                    {competition.status === "open" ? "S'inscrire" : "Complet"}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="text-primary" size={20} /> Classement
            </h2>
            <div className="gradient-card rounded-xl border border-border overflow-hidden">
              {loading && (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Skeleton className="w-7 h-7 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              )}
              {leaderboard.map((player) => (
                <div key={player.rank} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    player.rank === 1 ? "bg-primary text-primary-foreground" :
                    player.rank === 2 ? "bg-muted-foreground/30 text-foreground" :
                    player.rank === 3 ? "bg-orange-500/30 text-orange-300" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {player.rank}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{player.name}</div>
                    <div className="text-xs text-muted-foreground">{player.wins}V - {player.losses}D</div>
                  </div>
                  <span className="text-sm font-semibold text-primary">{player.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Competitions;
