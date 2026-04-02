import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Activity, Radio } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type Match = {
  id: number;
  court_name: string | null;
  player1_name: string;
  player2_name: string;
  score1: number[];
  score2: number[];
  current_set: number;
  status: "live" | "finished" | "upcoming";
};

const LiveScores = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadScores = async () => {
      try {
        const result = await api<{ matches: Match[] }>("/api/live-scores");
        if (!cancelled) {
          setMatches(result.matches);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Impossible de charger les scores.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadScores();
    const interval = setInterval(() => void loadScores(), 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-display font-bold">Scores en Direct</h1>
          <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full animate-pulse">
            <Radio size={12} /> LIVE
          </span>
        </div>
        <p className="text-muted-foreground mb-10">Mise a jour en temps reel via l'API demo ULTIMA</p>

        {loading && <div className="text-sm text-muted-foreground mb-6">Chargement des matchs...</div>}

        <div className="grid md:grid-cols-2 gap-6">
          {matches.map((match) => (
            <div key={match.id} className={`gradient-card rounded-xl border p-6 transition-all ${
              match.status === "live" ? "border-primary/30 glow-yellow" : "border-border"
            }`}>
              <div className="flex justify-between items-center mb-4 gap-4">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity size={12} /> {match.court_name ?? "Terrain non assigne"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  match.status === "live" ? "bg-green-500/20 text-green-400" :
                  match.status === "finished" ? "bg-muted text-muted-foreground" :
                  "bg-primary/20 text-primary"
                }`}>
                  {match.status === "live" ? "En cours" : match.status === "finished" ? "Termine" : "A venir"}
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { name: match.player1_name, scores: match.score1 },
                  { name: match.player2_name, scores: match.score2 },
                ].map((player) => (
                  <div key={player.name} className="flex items-center justify-between gap-4">
                    <span className="font-medium text-sm">{player.name}</span>
                    <div className="flex gap-2">
                      {player.scores.map((score, index) => (
                        <span key={`${player.name}-${index}`} className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                          index === player.scores.length - 1 && match.status === "live"
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-foreground"
                        }`}>
                          {score}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {match.status === "live" && (
                <div className="mt-4 text-xs text-muted-foreground">
                  Set {match.current_set} - rafraichissement automatique toutes les 5 secondes
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default LiveScores;
