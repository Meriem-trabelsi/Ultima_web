import { useEffect, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Brain, Video, BarChart3, Target, Cpu, Zap, ChevronRight } from "lucide-react";
import aiAnalysisImg from "@/assets/ai-analysis.jpg";

/* ── Animated progress bar ── */
const AnalysisBar = ({
  label,
  value,
  color = "hsl(var(--primary))",
  delay = 0,
}: {
  label: string;
  value: number;
  color?: string;
  delay?: number;
}) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), delay + 300);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="text-xs font-black tabular-nums" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            transitionDuration: "1.2s",
            transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: `0 0 8px ${color}55`,
          }}
        />
      </div>
    </div>
  );
};

/* ── Court heatmap – pure CSS mock ── */
const CourtHeatmap = () => (
  <div className="relative w-full aspect-[3/4] max-w-[220px] mx-auto select-none">
    {/* Court base */}
    <div
      className="absolute inset-0 rounded-lg border-2 border-white/30"
      style={{ background: "linear-gradient(180deg, hsl(160 60% 18%), hsl(160 55% 14%))" }}
    />
    {/* Court lines */}
    <div className="absolute inset-x-3 top-[48%] h-[1px] bg-white/40" />
    <div className="absolute inset-y-3 left-[50%] w-[1px] bg-white/30" />
    <div className="absolute inset-x-3 top-[20%] h-[1px] bg-white/25" />
    <div className="absolute inset-x-3 bottom-[20%] h-[1px] bg-white/25" />
    <div className="absolute inset-3 border border-white/25 rounded" />

    {/* Heat zones – radial gradient blobs */}
    <div className="absolute inset-0 rounded-lg overflow-hidden">
      {/* Top-right hot zone */}
      <div
        className="absolute w-20 h-20 rounded-full"
        style={{
          top: "8%", right: "10%",
          background: "radial-gradient(circle, hsl(0 85% 55% / 0.75) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />
      {/* Center mid zone */}
      <div
        className="absolute w-24 h-24 rounded-full"
        style={{
          top: "38%", left: "25%",
          background: "radial-gradient(circle, hsl(40 90% 55% / 0.65) 0%, transparent 70%)",
          filter: "blur(10px)",
        }}
      />
      {/* Bottom-left moderate */}
      <div
        className="absolute w-16 h-16 rounded-full"
        style={{
          bottom: "12%", left: "8%",
          background: "radial-gradient(circle, hsl(55 90% 55% / 0.55) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />
      {/* Bottom-right warm */}
      <div
        className="absolute w-14 h-14 rounded-full"
        style={{
          bottom: "20%", right: "15%",
          background: "radial-gradient(circle, hsl(25 85% 55% / 0.5) 0%, transparent 70%)",
          filter: "blur(7px)",
        }}
      />
    </div>

    {/* Legend */}
    <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-3">
      {[
        { label: "Low", color: "hsl(55 90% 55%)" },
        { label: "Mid", color: "hsl(25 85% 55%)" },
        { label: "High", color: "hsl(0 85% 55%)" },
      ].map((l) => (
        <div key={l.label} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{l.label}</span>
        </div>
      ))}
    </div>
  </div>
);

/* ── Scanning analysis animation ── */
const ScanOverlay = () => {
  const [pos, setPos] = useState(0);
  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 3200;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const progress = ((ts - start) % duration) / duration;
      setPos(progress * 100);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div
      className="absolute left-0 right-0 h-px pointer-events-none z-10"
      style={{
        top: `${pos}%`,
        background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 20%, hsl(var(--primary) / 0.9) 50%, hsl(var(--primary)) 80%, transparent 100%)",
        boxShadow: "0 0 12px hsl(var(--primary) / 0.7), 0 0 24px hsl(var(--primary) / 0.4)",
      }}
    />
  );
};

/* ── Pulse progress bar ── */
const AnalysisProgress = () => {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v = Math.min(v + Math.random() * 3.5, 94);
      setPct(Math.round(v));
      if (v >= 94) clearInterval(id);
    }, 120);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-primary font-bold uppercase tracking-widest">Analyzing match footage…</span>
        <span className="font-black tabular-nums text-primary">{pct}%</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, hsl(var(--primary) / 0.7), hsl(var(--primary)))",
            transition: "width 0.15s ease",
            boxShadow: "0 0 10px hsl(var(--primary) / 0.5)",
          }}
        />
      </div>
    </div>
  );
};

const aiFeatures = [
  {
    icon: Video,
    title: "Video Analysis",
    desc: "Automated ingestion and preprocessing of match footage for data extraction.",
    preview: "34 clips processed",
    color: "hsl(271 68% 61%)",
  },
  {
    icon: Target,
    title: "Player & Ball Tracking",
    desc: "Real-time detection and tracking via OpenCV and deep learning models.",
    preview: "99.2% detection rate",
    color: "hsl(210 85% 60%)",
  },
  {
    icon: BarChart3,
    title: "Movement Heatmaps",
    desc: "Visualize play zones and movement patterns across the court.",
    preview: "12 zones mapped",
    color: "hsl(35 90% 58%)",
  },
  {
    icon: Cpu,
    title: "Stroke Prediction",
    desc: "ML models predict shot patterns and anticipate tactical strategies.",
    preview: "87% accuracy",
    color: "hsl(142 72% 50%)",
  },
  {
    icon: Zap,
    title: "AI Recommendations",
    desc: "Personalized training suggestions derived from performance analysis.",
    preview: "8 insights generated",
    color: "hsl(var(--primary))",
  },
  {
    icon: Brain,
    title: "Full Match Analysis",
    desc: "Detailed post-match report with advanced statistics and insights.",
    preview: "48-page report",
    color: "hsl(328 80% 62%)",
  },
];

const SmartPlayAI = () => {
  const [demoVisible, setDemoVisible] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setDemoVisible(true); },
      { threshold: 0.2 }
    );
    if (demoRef.current) obs.observe(demoRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <Layout>
      {/* ── Hero ── */}
      <section className="relative min-h-[60vh] flex items-end overflow-hidden">
        <img
          src={aiAnalysisImg}
          alt="AI Analysis"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background)/0.7) 40%, hsl(var(--background)/0.2) 100%)",
          }}
        />
        {/* Scan line */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <ScanOverlay />
        </div>
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="container relative z-10 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">AI Module Active</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black leading-[0.9] mb-4">
            <span className="text-gradient">SmartPlay</span>
            <br />
            <span className="text-foreground">AI</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Intelligent performance analysis powered by computer vision and machine learning.
          </p>
        </div>
      </section>

      {/* ── Live mock demo panel ── */}
      <section ref={demoRef} className="py-16">
        <div className="container">
          <div className="gradient-card rounded-3xl border border-primary/20 overflow-hidden"
            style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.1)" }}>

            {/* Panel header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-border/60 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-3 text-xs text-muted-foreground font-mono tracking-wider">
                  smartplay-ai — demo_match_analysis.py
                </span>
              </div>
              <span className="text-[10px] bg-primary/15 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest">
                Demo Mode
              </span>
            </div>

            <div className="grid lg:grid-cols-[1fr_340px] gap-0">
              {/* Left: analysis metrics */}
              <div className="p-8 border-r border-border/60">
                <div className="mb-8">
                  <AnalysisProgress />
                </div>

                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground mb-6">
                  Performance Metrics
                </h3>
                <div className="space-y-5">
                  <AnalysisBar label="Court Coverage" value={78} color="hsl(var(--primary))" delay={0} />
                  <AnalysisBar label="Serve Accuracy" value={84} color="hsl(210 85% 60%)" delay={150} />
                  <AnalysisBar label="Rally Consistency" value={62} color="hsl(142 72% 50%)" delay={300} />
                  <AnalysisBar label="Net Approaches" value={91} color="hsl(35 90% 58%)" delay={450} />
                  <AnalysisBar label="Positioning Score" value={73} color="hsl(328 80% 62%)" delay={600} />
                  <AnalysisBar label="Reaction Speed" value={88} color="hsl(var(--primary))" delay={750} />
                </div>

                {/* Mock output log */}
                <div className="mt-8 rounded-xl bg-background/60 border border-border/60 p-4 font-mono text-xs space-y-1.5">
                  {[
                    { t: "00:00.1", m: "Video stream loaded · 1920×1080 @ 60fps", c: "text-muted-foreground" },
                    { t: "00:00.4", m: "Player detection model initialized (YOLOv8)", c: "text-blue-400" },
                    { t: "00:01.2", m: "Tracking 2 players · 1 ball object", c: "text-primary" },
                    { t: "00:03.8", m: "Heatmap generation complete", c: "text-green-400" },
                    { t: "00:05.1", m: "Shot classification: serve detected ×14", c: "text-primary" },
                    { t: "00:06.7", m: "Generating personalized recommendations…", c: "text-yellow-400" },
                  ].map((line, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${line.c}`}
                      style={{
                        opacity: demoVisible ? 1 : 0,
                        transition: `opacity 0.4s ease ${i * 0.2 + 0.5}s`,
                      }}
                    >
                      <span className="text-muted-foreground/50 shrink-0">[{line.t}]</span>
                      <span>{line.m}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: court heatmap */}
              <div className="p-8 flex flex-col items-center justify-start gap-6">
                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground self-start">
                  Movement Heatmap
                </h3>
                <CourtHeatmap />

                <div className="mt-10 w-full space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] text-muted-foreground">
                    Top Insights
                  </h3>
                  {[
                    "Weak coverage in back-left corner",
                    "Strong net approach rate (+12%)",
                    "Serve consistency declining in set 3",
                  ].map((insight, i) => (
                    <div key={i}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                      style={{
                        opacity: demoVisible ? 1 : 0,
                        transform: demoVisible ? "translateX(0)" : "translateX(-12px)",
                        transition: `opacity 0.5s ease ${i * 0.15 + 1}s, transform 0.5s ease ${i * 0.15 + 1}s`,
                      }}
                    >
                      <ChevronRight size={12} className="text-primary mt-0.5 shrink-0" />
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="pb-16">
        <div className="container">
          <h2 className="text-2xl font-display font-bold uppercase tracking-tighter mb-8">
            Module Capabilities
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {aiFeatures.map((f, i) => (
              <div
                key={f.title}
                className="gradient-card rounded-2xl border border-border p-6 hover:border-primary/30 transition-all group"
                style={{
                  opacity: 0,
                  animation: `fade-in 0.5s ease forwards`,
                  animationDelay: `${i * 0.08}s`,
                }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ background: `${f.color}18`, border: `1px solid ${f.color}35` }}
                  >
                    <f.icon size={20} style={{ color: f.color }} />
                  </div>
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ background: `${f.color}18`, color: f.color }}
                  >
                    {f.preview}
                  </span>
                </div>
                <h3 className="font-display font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section className="pb-20">
        <div className="container">
          <div className="gradient-card rounded-2xl border border-border p-8">
            <h2 className="font-display text-xl font-bold mb-6 text-center uppercase tracking-tighter">
              AI Tech Stack
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { name: "TensorFlow", desc: "Deep Learning" },
                { name: "PyTorch", desc: "ML Models" },
                { name: "OpenCV", desc: "Computer Vision" },
                { name: "Flask", desc: "Microservice API" },
                { name: "Pandas", desc: "Data Processing" },
                { name: "scikit-learn", desc: "Machine Learning" },
                { name: "Plotly", desc: "Visualizations" },
                { name: "NumPy", desc: "Numerical Compute" },
              ].map((tech) => (
                <div
                  key={tech.name}
                  className="p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/25 hover:bg-muted/50 transition-all group"
                >
                  <div className="font-display text-sm font-black text-primary group-hover:text-gradient transition-all">
                    {tech.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{tech.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SmartPlayAI;
