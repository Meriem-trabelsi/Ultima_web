import Layout from "@/components/Layout";
import { Shield, Zap, Eye, BarChart3, Brain } from "lucide-react";

const LiveScores = () => {
  return (
    <Layout>
      <div className="container py-16 lg:py-24 flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto">

        {/* Icon */}
        <div className="relative">
          <div className="p-5 rounded-3xl bg-primary/10 border border-primary/20">
            <Shield size={48} className="text-primary" />
          </div>
          <span className="absolute -top-2 -right-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Zap size={9} /> Coming Soon
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gradient uppercase tracking-tighter">
            VAR Review System
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
            Our AI-powered VAR (Video Assistant Referee) scoring system is currently in development.
            Advanced match analytics, real-time score tracking, and automated event detection will be available soon.
          </p>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid sm:grid-cols-3 gap-4 w-full text-left mt-4">
          {[
            { icon: Eye, title: "Live Match Tracking", desc: "Real-time ball and player position tracking during matches" },
            { icon: Brain, title: "AI Event Detection", desc: "Automated detection of points, faults, and key moments" },
            { icon: BarChart3, title: "Match Analytics", desc: "Deep performance insights and ranking score updates" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="gradient-card rounded-2xl border border-border/50 p-5 opacity-60">
              <div className="p-2 rounded-xl bg-primary/8 mb-3 w-fit">
                <Icon size={18} className="text-primary" />
              </div>
              <p className="text-sm font-bold mb-1">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        {/* Status note */}
        <p className="text-xs text-muted-foreground border border-border/40 rounded-xl px-4 py-2.5">
          Scoring features are being rebuilt with the VAR Review System — existing match data is preserved and will be migrated automatically.
        </p>
      </div>
    </Layout>
  );
};

export default LiveScores;
