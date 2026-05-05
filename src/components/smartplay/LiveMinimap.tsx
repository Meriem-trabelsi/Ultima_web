import type { LiveVisualUpdate } from "./liveTypes";

function clampPercent(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "50%";
  return `${Math.max(0, Math.min(1, value)) * 100}%`;
}

export default function LiveMinimap({ update }: { update: LiveVisualUpdate | null }) {
  const players = update?.minimap?.players ?? update?.players?.map((player) => ({
    id: player.trackId,
    label: player.label,
    team: player.team,
    x: (player.bbox?.x ?? 0.5) + (player.bbox?.w ?? 0) / 2,
    y: (player.bbox?.y ?? 0.5) + (player.bbox?.h ?? 0),
  })) ?? [];
  const ball = update?.minimap?.ball ?? update?.ball ?? null;

  return (
    <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg border border-border bg-emerald-950/40">
      <div className="absolute inset-3 rounded-md border border-white/30" />
      <div className="absolute left-1/2 top-3 bottom-3 w-px bg-white/20" />
      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      {players.map((player, index) => (
        <div
          key={player.id ?? index}
          className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg ${player.team === "B" ? "border-sky-200 bg-sky-500" : "border-amber-100 bg-amber-400"}`}
          style={{ left: clampPercent(player.x), top: clampPercent(player.y) }}
          title={player.label ?? player.id}
        />
      ))}
      {ball && (
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]"
          style={{ left: clampPercent(ball.x), top: clampPercent(ball.y) }}
        />
      )}
      <div className="absolute bottom-2 left-2 text-[10px] font-bold uppercase tracking-widest text-white/60">
        Minimap
      </div>
    </div>
  );
}
