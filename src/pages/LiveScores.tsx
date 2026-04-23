import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Activity, Radio, MessageSquare, Shield, Zap, Info } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // In our local dev setup, the server is on port 3001
    const socket: Socket = io("http://localhost:3001");

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("scores:update", (data: { matches: Match[] }) => {
      setMatches(data.matches);
      setLoading(false);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Layout>
      <div className="container py-12">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient uppercase tracking-tighter">Scores Direct</h1>
            <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${connected ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-muted text-muted-foreground'}`}>
              <Radio size={12} /> {connected ? 'LIVE TV' : 'OFFLINE'}
            </div>
          </div>
          <p className="text-muted-foreground tracking-widest uppercase text-xs font-bold flex items-center gap-2">
            <Activity className="text-primary" size={14} /> Rafraichissement Instantane • Tournament Mode
          </p>
        </header>

        {loading && (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="gradient-card rounded-3xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-40" />
                    <div className="flex gap-2">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-44" />
                    <div className="flex gap-2">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {matches.map((match) => (
            <div key={match.id} className={`gradient-card rounded-3xl border transition-all duration-500 overflow-hidden ${
              match.status === "live" ? "border-primary/40 shadow-glow shadow-primary/10" : "border-border opacity-80"
            }`}>
              {/* Header */}
              <div className="bg-muted/30 px-6 py-4 flex justify-between items-center border-b border-border">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Shield size={12} className="text-primary" /> {match.court_name ?? "Court central"}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  match.status === "live" ? "bg-green-500/20 text-green-400" :
                  match.status === "finished" ? "bg-blue-500/20 text-blue-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {match.status === "live" ? "En cours" : match.status === "finished" ? "Termine" : "Bientot"}
                </span>
              </div>

              {/* Score Table */}
              <div className="p-8 space-y-6">
                {[
                  { name: match.player1_name, scores: match.score1, isServing: match.current_set === 1 },
                  { name: match.player2_name, scores: match.score2, isServing: match.current_set === 2 },
                ].map((player, pIdx) => (
                  <div key={player.name} className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${player.isServing && match.status === 'live' ? 'bg-yellow-400 shadow-glow shadow-yellow-400' : 'bg-transparent'}`} />
                      <span className="text-xl font-display font-bold uppercase tracking-tight">{player.name}</span>
                    </div>
                    <div className="flex gap-2">
                      {player.scores.map((score, sIdx) => {
                        const isCurrentSet = sIdx === match.current_set - 1 && match.status === 'live';
                        return (
                          <div key={sIdx} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                            isCurrentSet 
                              ? "bg-primary text-black scale-110 shadow-lg" 
                              : "bg-background border border-border text-muted-foreground"
                          }`}>
                            {score}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-muted/10 border-t border-border flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Zap size={12} className={match.status === 'live' ? "text-yellow-400" : ""} /> 
                  {match.status === 'live' ? `Set ${match.current_set} en cours` : "Match Archive"}
                </div>
                <button className="hover:text-primary transition-colors flex items-center gap-1.5">
                  <MessageSquare size={12} /> Commentaire
                </button>
              </div>
            </div>
          ))}
        </div>

        {matches.length === 0 && !loading && (
          <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl">
            <Info className="mx-auto mb-4 text-muted-foreground" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aucun match en direct pour le moment.</p>
            <p className="text-[10px] text-muted-foreground/60 mt-2">Revenez plus tard pour le debut des tournois.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LiveScores;
