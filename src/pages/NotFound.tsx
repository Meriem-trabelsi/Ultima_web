import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/* ── Bouncing tennis ball ── */
const BouncingBall = () => (
  <div className="flex flex-col items-center gap-0 select-none" aria-hidden>
    <div
      className="w-10 h-10 rounded-full relative"
      style={{
        background: "radial-gradient(circle at 32% 28%, #fff8be 0%, #e9dd6a 45%, #cfbf33 100%)",
        boxShadow: "0 0 20px rgb(255 221 115 / 0.6), 0 0 40px rgb(255 218 98 / 0.3)",
        animation: "ball-bounce 1.4s ease-in-out infinite",
      }}
    >
      {/* seam */}
      <div
        className="absolute inset-0 rounded-full border-l-2 border-r-2 border-white/75"
        style={{ transform: "rotate(20deg) scale(0.72)" }}
      />
    </div>
    {/* Shadow under ball */}
    <div
      className="w-8 h-2 rounded-full bg-black/30 blur-sm"
      style={{ animation: "ball-shadow 1.4s ease-in-out infinite" }}
    />
  </div>
);

const NotFound = () => {
  const location = useLocation();
  const pathRef = useRef(location.pathname);

  useEffect(() => {
    console.error("404: User accessed non-existent route:", pathRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Glow orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.08), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 animate-slide-up">
        {/* Bouncing ball */}
        <div className="flex justify-center mb-8">
          <BouncingBall />
        </div>

        {/* Giant 404 */}
        <div
          className="font-display font-black leading-none mb-0 select-none"
          style={{
            fontSize: "clamp(7rem, 22vw, 16rem)",
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.35) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 0.85,
          }}
        >
          404
        </div>

        {/* Court line decoration */}
        <div className="flex items-center justify-center gap-3 my-6">
          <div className="h-px flex-1 max-w-16 bg-border" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-primary font-black px-2">
            Out of Bounds
          </span>
          <div className="h-px flex-1 max-w-16 bg-border" />
        </div>

        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
          Wrong Court
        </h2>
        <p className="text-muted-foreground mb-10 max-w-sm mx-auto">
          This page doesn't exist. Let's get you back in the game.
        </p>

        {/* The path that was attempted */}
        {location.pathname !== "/" && (
          <p className="text-xs text-muted-foreground/50 font-mono mb-8 bg-muted/30 inline-block px-4 py-2 rounded-lg border border-border">
            {location.pathname}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button size="lg" className="glow-yellow h-12 px-8 gap-2">
              <ArrowLeft size={16} /> Back to Home Court
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="h-12 px-8 border-primary/30 text-primary">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Court field decoration */}
        <div className="mt-16 flex justify-center opacity-10 pointer-events-none">
          <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
            <rect x="2" y="2" width="116" height="76" rx="2" stroke="white" strokeWidth="1.5" />
            <line x1="60" y1="2" x2="60" y2="78" stroke="white" strokeWidth="1" />
            <line x1="2" y1="40" x2="118" y2="40" stroke="white" strokeWidth="1" />
            <line x1="20" y1="2" x2="20" y2="78" stroke="white" strokeWidth="0.75" />
            <line x1="100" y1="2" x2="100" y2="78" stroke="white" strokeWidth="0.75" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
