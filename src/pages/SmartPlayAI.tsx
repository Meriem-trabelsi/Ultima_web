import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import {
  Brain, Zap, Target, Activity, Clock3, CheckCircle2, AlertCircle,
  BarChart3, TrendingUp, MapPin, Eye, Cpu, Radio, Wifi, WifiOff,
  RefreshCw, Plus, ChevronRight, Flame,
} from "lucide-react";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type SmartPlayStatus = {
  connected: boolean;
  version?: string | null;
  message: string;
  features?: {
    court_detection: boolean;
    player_tracking: boolean;
    ball_tracking: boolean;
    smart_scoring: boolean;
    heatmap: boolean;
    performance_analysis: boolean;
  };
};

type AnalysisJob = {
  id: number;
  job_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  player1_name?: string;
  player2_name?: string;
  match_date?: string;
};

type AiAnalysis = {
  id: number;
  title: string;
  videoName: string;
  status: string;
  summary: string;
  createdAt: string;
};

type AiMetrics = {
  available: boolean;
  source: string;
  message?: string;
  placeholder?: {
    movement_coverage: null;
    reaction_speed_ms: null;
    shot_accuracy: null;
    winners: null;
    errors: null;
  };
};

// ── Status config ─────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; cls: string; icon: typeof Clock3 }> = {
  queued: { label: "Queued", cls: "bg-amber-500/15 text-amber-300 border-amber-500/20", icon: Clock3 },
  processing: { label: "Processing", cls: "bg-blue-500/15 text-blue-300 border-blue-500/20 animate-pulse", icon: RefreshCw },
  pending_ai: { label: "Pending AI", cls: "bg-purple-500/15 text-purple-300 border-purple-500/20", icon: Brain },
  completed: { label: "Completed", cls: "bg-green-500/15 text-green-300 border-green-500/20", icon: CheckCircle2 },
  ready: { label: "Ready", cls: "bg-green-500/15 text-green-300 border-green-500/20", icon: CheckCircle2 },
  failed: { label: "Failed", cls: "bg-red-500/15 text-red-300 border-red-500/20", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.queued;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

// ── Feature tiles for AI roadmap ──────────────────────────────────────────────

const AI_FEATURES = [
  { icon: Eye, label: "Court Detection", desc: "Automatic court boundary mapping and homography", ready: false },
  { icon: Activity, label: "Player Tracking", desc: "Real-time player position tracking per frame", ready: false },
  { icon: Zap, label: "Ball Tracking", desc: "Ball trajectory analysis at 120fps", ready: false },
  { icon: Target, label: "Smart Scoring", desc: "Automatic point detection and scoring", ready: false },
  { icon: Flame, label: "Event Detection", desc: "Bounce, net, out, winner detection", ready: false },
  { icon: BarChart3, label: "Match Analysis", desc: "Full match statistics and breakdowns", ready: false },
  { icon: MapPin, label: "Player Heatmap", desc: "Spatial movement and coverage analysis", ready: false },
  { icon: TrendingUp, label: "Performance AI", desc: "AI-powered player progression analysis", ready: false },
];

// ── Heatmap Placeholder ────────────────────────────────────────────────────────

function HeatmapPlaceholder() {
  return (
    <div className="relative rounded-xl overflow-hidden border border-purple-500/20 bg-black/30 aspect-[4/3] sm:aspect-video flex items-center justify-center">
      {/* Court outline */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 250" preserveAspectRatio="none">
        <rect x="20" y="20" width="360" height="210" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <line x1="200" y1="20" x2="200" y2="230" stroke="hsl(var(--primary))" strokeWidth="1" />
        <rect x="100" y="80" width="200" height="90" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="4 3" />
        <circle cx="200" cy="125" r="25" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" />
      </svg>
      {/* Blurry heatmap blobs (decorative) */}
      <div className="absolute top-[30%] left-[20%] w-16 h-16 rounded-full bg-purple-500/20 blur-xl" />
      <div className="absolute top-[50%] right-[25%] w-12 h-12 rounded-full bg-blue-500/20 blur-xl" />
      <div className="absolute bottom-[25%] left-[40%] w-10 h-10 rounded-full bg-primary/10 blur-lg" />
      <div className="z-10 text-center p-4">
        <MapPin size={28} className="text-purple-400/60 mx-auto mb-2" />
        <p className="text-xs font-bold text-purple-300/60 uppercase tracking-widest">Heatmap</p>
        <p className="text-[10px] text-muted-foreground mt-1">AI data pending</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const SmartPlayAI = () => {
  const user = getSessionUser();
  const [aiStatus, setAiStatus] = useState<SmartPlayStatus | null>(null);
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [legacyAnalyses, setLegacyAnalyses] = useState<AiAnalysis[]>([]);
  const [metrics, setMetrics] = useState<AiMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingJob, setCreatingJob] = useState(false);

  const loadData = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [statusRes, jobsRes, legacyRes] = await Promise.allSettled([
        api<SmartPlayStatus>("/api/smartplay/status"),
        api<{ jobs: AnalysisJob[] }>("/api/smartplay/analysis-jobs", { authenticated: true }),
        api<{ analyses: AiAnalysis[] }>("/api/ai/analyses", { authenticated: true }),
      ]);

      if (statusRes.status === "fulfilled") setAiStatus(statusRes.value);
      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.jobs);
      if (legacyRes.status === "fulfilled") setLegacyAnalyses(legacyRes.value.analyses);

      // Load AI metrics for the current player
      if (user.role === "player") {
        try {
          const metricsRes = await api<AiMetrics>(`/api/smartplay/player/${user.id}/analysis`, { authenticated: true });
          setMetrics(metricsRes);
        } catch { /* not critical */ }
      }
    } catch { /* handled individually */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [user?.id]);

  const requestAnalysis = async () => {
    setCreatingJob(true);
    try {
      await api("/api/smartplay/analysis-jobs", {
        method: "POST",
        body: JSON.stringify({ userId: user?.id, jobType: "full_match" }),
        authenticated: true,
      });
      toast.success("Analysis job queued. You'll be notified when it's ready.");
      void loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create analysis job.");
    } finally {
      setCreatingJob(false);
    }
  };

  return (
    <Layout>
      <div className="container py-8 lg:py-12 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Brain size={24} className="text-purple-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold uppercase tracking-tighter">
                  SmartPlay <span className="text-gradient">AI</span>
                </h1>
                <p className="text-muted-foreground text-sm">Intelligent Player & Match Analysis Platform</p>
              </div>
            </div>
          </div>
          {user && (
            <Button
              onClick={requestAnalysis}
              disabled={creatingJob}
              className="flex items-center gap-2 shrink-0"
              variant="outline"
            >
              <Plus size={14} />
              {creatingJob ? "Requesting…" : "Request Analysis"}
            </Button>
          )}
        </div>

        {/* AI Service Status Banner */}
        {loading ? (
          <Skeleton className="h-20 rounded-2xl" />
        ) : (
          <div className={`gradient-card rounded-2xl border p-5 flex items-center gap-4 ${
            aiStatus?.connected ? "border-green-500/30" : "border-orange-500/30"
          }`}>
            <div className={`p-3 rounded-xl flex-shrink-0 ${aiStatus?.connected ? "bg-green-500/10" : "bg-orange-500/10"}`}>
              {aiStatus?.connected
                ? <Wifi size={22} className="text-green-400" />
                : <WifiOff size={22} className="text-orange-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-sm">SmartPlay AI Microservice</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                  aiStatus?.connected
                    ? "bg-green-500/15 text-green-300 border-green-500/20"
                    : "bg-orange-500/15 text-orange-300 border-orange-500/20"
                }`}>
                  {aiStatus?.connected ? "Connected" : "Not Connected"}
                </span>
                {aiStatus?.version && (
                  <span className="text-[10px] text-muted-foreground">v{aiStatus.version}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{aiStatus?.message}</p>
            </div>
          </div>
        )}

        {/* AI Feature Roadmap */}
        <div className="space-y-4">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Cpu size={18} className="text-primary" /> SmartPlay AI Feature Roadmap
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AI_FEATURES.map((feature) => (
              <div
                key={feature.label}
                className="gradient-card rounded-xl border border-border/40 p-4 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <feature.icon size={16} className="text-purple-400" />
                  <span className="text-sm font-bold">{feature.label}</span>
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    Soon
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Player Metrics (if logged in) */}
        {user && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* AI Performance Metrics */}
            <div className="gradient-card rounded-2xl border border-purple-500/20 p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-5 flex items-center gap-2">
                <BarChart3 size={14} /> Your AI Performance Metrics
              </h3>
              {metrics?.available ? (
                <p className="text-sm text-green-300">AI metrics available — data will display here</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Court Coverage", sub: "Percentage of court surface reached" },
                    { label: "Reaction Speed", sub: "Average response time to incoming ball" },
                    { label: "Shot Accuracy", sub: "Percentage of accurate placements" },
                    { label: "Movement Score", sub: "Composite movement efficiency score" },
                    { label: "Error Rate", sub: "Unforced errors per match" },
                  ].map(({ label, sub }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{sub}</p>
                      </div>
                      <div className="h-2 w-24 rounded-full bg-purple-500/10 border border-purple-500/10 overflow-hidden flex-shrink-0">
                        <div className="h-full w-0 bg-purple-400/30 rounded-full" />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground/50 w-8 text-right flex-shrink-0">—</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground/60 text-center pt-2 border-t border-border/20 mt-3">
                    Metrics will populate once SmartPlay AI processes your matches
                  </p>
                </div>
              )}
            </div>

            {/* Heatmap Placeholder */}
            <div className="gradient-card rounded-2xl border border-purple-500/20 p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Flame size={14} /> Movement Heatmap
              </h3>
              <HeatmapPlaceholder />
            </div>
          </div>
        )}

        {/* Analysis Jobs */}
        {user && (
          <div className="space-y-4">
            <h2 className="text-lg font-display font-bold flex items-center gap-2">
              <Activity size={18} className="text-primary" /> Analysis Queue
            </h2>

            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : jobs.length === 0 && legacyAnalyses.length === 0 ? (
              <div className="gradient-card rounded-2xl border border-border/40 p-12 text-center">
                <Brain size={36} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No analysis jobs yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Request an analysis to see it here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* New smartplay jobs */}
                {jobs.map((job) => (
                  <div key={`job-${job.id}`} className="gradient-card rounded-xl border border-border/40 p-4 flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-purple-500/10 flex-shrink-0">
                      <Brain size={16} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{job.job_type.replace(/_/g, " ")} Analysis</p>
                      {job.player1_name && (
                        <p className="text-xs text-muted-foreground">{job.player1_name} vs {job.player2_name}</p>
                      )}
                    </div>
                    <StatusBadge status={job.status} />
                    <p className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {/* Legacy ai_analyses */}
                {legacyAnalyses.map((analysis) => (
                  <div key={`legacy-${analysis.id}`} className="gradient-card rounded-xl border border-border/40 p-4 flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                      <Activity size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{analysis.title}</p>
                      {analysis.summary && (
                        <p className="text-xs text-muted-foreground truncate">{analysis.summary}</p>
                      )}
                    </div>
                    <StatusBadge status={analysis.status} />
                    <p className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Future Integration Note */}
        <div className="gradient-card rounded-2xl border border-purple-500/20 p-6 bg-purple-500/3">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-purple-500/10 flex-shrink-0">
              <Radio size={18} className="text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm mb-2">About SmartPlay AI Integration</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                SmartPlay AI is ULTIMA's upcoming intelligent analysis engine. Once connected, it will automatically process
                match footage to deliver:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {[
                  "Real-time ball and player tracking at 120fps",
                  "Automatic rally length, winner, and error detection",
                  "Player movement heatmaps and court coverage scores",
                  "Shot placement and speed analytics",
                  "Match-by-match performance progression",
                  "Personalized training recommendations",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <ChevronRight size={10} className="text-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SmartPlayAI;
