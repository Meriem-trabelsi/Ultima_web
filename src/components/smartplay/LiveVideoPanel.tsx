import { Camera, CircleDot } from "lucide-react";
import type { LiveVisualUpdate } from "./liveTypes";

function pct(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "50%";
  return `${Math.max(0, Math.min(1, value)) * 100}%`;
}

export default function LiveVideoPanel({
  update,
  cameraName,
  videoUrl,
  renderedUrl,
}: {
  update: LiveVisualUpdate | null;
  cameraName?: string | null;
  videoUrl?: string | null;
  renderedUrl?: string | null;
}) {
  const players = update?.players ?? [];
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-zinc-950">
      {renderedUrl ? (
        <img
          key={renderedUrl}
          src={renderedUrl}
          className="absolute inset-0 h-full w-full bg-black object-contain"
          alt="Rendered SmartPlay live analysis"
        />
      ) : videoUrl ? (
        <video
          key={videoUrl}
          src={videoUrl}
          className="absolute inset-0 h-full w-full bg-black object-contain"
          controls
          autoPlay
          muted
          playsInline
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,200,66,0.12),transparent_45%),radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_42%)]" />
      )}
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/80">
        <Camera size={14} /> {renderedUrl ? "Rendered AI live" : (cameraName ?? "Live camera")}
      </div>
      {!renderedUrl && players.map((player, index) => (
          <div
            key={player.trackId ?? index}
            className={`absolute rounded-md border-2 ${player.team === "B" ? "border-sky-300" : "border-amber-300"}`}
            style={{
              left: pct(player.bbox?.x),
              top: pct(player.bbox?.y),
              width: pct(player.bbox?.w ?? 0.06),
              height: pct(player.bbox?.h ?? 0.16),
            }}
          >
            <span className={`absolute -top-6 left-0 rounded px-2 py-0.5 text-[10px] font-bold ${player.team === "B" ? "bg-sky-400 text-sky-950" : "bg-amber-300 text-amber-950"}`}>
              {player.label ?? player.trackId ?? `P${index + 1}`}
            </span>
          </div>
        ))}
      {!renderedUrl && update?.ball && (
          <div
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]"
            style={{ left: pct(update.ball.x), top: pct(update.ball.y) }}
          />
        )}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/45 px-3 py-2 text-xs text-white/70">
        <CircleDot size={12} className={update ? "text-red-400 animate-pulse" : "text-muted-foreground"} />
        Frame {update?.frame ?? "-"} · players {players.length} · ball {update?.ball ? "tracked" : "waiting"}
      </div>
    </div>
  );
}
