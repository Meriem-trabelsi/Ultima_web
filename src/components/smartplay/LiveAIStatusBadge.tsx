import { Activity, AlertTriangle, CheckCircle2, Clock, Radio } from "lucide-react";

const statusStyles: Record<string, string> = {
  running: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  starting: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  created: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  stopped: "border-muted bg-muted/40 text-muted-foreground",
  error: "border-red-500/30 bg-red-500/10 text-red-300",
};

const statusIcons = {
  running: Radio,
  starting: Clock,
  created: Activity,
  stopped: CheckCircle2,
  error: AlertTriangle,
};

export default function LiveAIStatusBadge({ status, fps, message }: { status: string; fps?: number | null; message?: string | null }) {
  const Icon = statusIcons[status as keyof typeof statusIcons] ?? Activity;
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-widest ${statusStyles[status] ?? "border-border bg-muted/30 text-muted-foreground"}`}>
      <Icon size={14} className={status === "running" ? "animate-pulse" : ""} />
      <span>{status}</span>
      {typeof fps === "number" && <span className="text-foreground/70 normal-case tracking-normal">{fps.toFixed(0)} fps</span>}
      {message && <span className="hidden md:inline max-w-64 truncate text-foreground/60 normal-case tracking-normal">{message}</span>}
    </div>
  );
}
