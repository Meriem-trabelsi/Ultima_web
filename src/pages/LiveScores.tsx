import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Activity, Radio } from "lucide-react";

const initialMatches = [
  { id: 1, court: "Padel A (SUMMA)", player1: "Ahmed B.", player2: "Sami T.", score1: [6, 4, 2], score2: [3, 6, 1], set: 3, status: "live" },
  { id: 2, court: "Tennis 1", player1: "Youssef K.", player2: "Mariem F.", score1: [6, 3], score2: [2, 5], set: 2, status: "live" },
  { id: 3, court: "Padel C (SUMMA)", player1: "Aziz F.", player2: "Nabil M.", score1: [6, 6], score2: [4, 3], set: 2, status: "finished" },
  { id: 4, court: "Tennis 2", player1: "Ines R.", player2: "Leila B.", score1: [0], score2: [0], set: 1, status: "upcoming" },
];

const LiveScores = () => {
  const [matches, setMatches] = useState(initialMatches);
  const [tick, setTick] = useState(0);

  // Simulate live score updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setMatches((prev) =>
        prev.map((m) => {
          if (m.status !== "live") return m;
          const updated = { ...m, score1: [...m.score1], score2: [...m.score2] };
          const lastIdx = updated.score1.length - 1;
          if (Math.random() > 0.5) {
            updated.score1[lastIdx] = Math.min(7, updated.score1[lastIdx] + 1);
          } else {
            updated.score2[lastIdx] = Math.min(7, updated.score2[lastIdx] + 1);
          }
          return updated;
        })
      );
    }, 4000);
    return () => clearInterval(interval);
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
        <p className="text-muted-foreground mb-10">Mise à jour en temps réel via SUMMA & WebSocket (démo simulée)</p>

        <div className="grid md:grid-cols-2 gap-6">
          {matches.map((m) => (
            <div key={m.id} className={`gradient-card rounded-xl border p-6 transition-all ${
              m.status === "live" ? "border-primary/30 glow-yellow" : "border-border"
            }`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity size={12} /> {m.court}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  m.status === "live" ? "bg-green-500/20 text-green-400" :
                  m.status === "finished" ? "bg-muted text-muted-foreground" :
                  "bg-primary/20 text-primary"
                }`}>
                  {m.status === "live" ? "En cours" : m.status === "finished" ? "Terminé" : "À venir"}
                </span>
              </div>

              <div className="space-y-3">
                {[{ name: m.player1, scores: m.score1 }, { name: m.player2, scores: m.score2 }].map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="font-medium text-sm">{p.name}</span>
                    <div className="flex gap-2">
                      {p.scores.map((s, si) => (
                        <span key={si} className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                          si === p.scores.length - 1 && m.status === "live"
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-foreground"
                        }`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {m.status === "live" && (
                <div className="mt-4 text-xs text-muted-foreground">
                  Set {m.set} • Mise à jour automatique
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
