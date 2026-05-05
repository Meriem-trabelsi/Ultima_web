import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Crosshair, MapPin, RefreshCw, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, resolveApiUrl } from "@/lib/api";
import { getToken } from "@/lib/session";

// Padel court: 10 m wide × 20 m long. Order matches Python pipeline PADEL_ORDER + padel_keypoints_10_world().
// Service lines are 3 m from each baseline (sy1=3, sy2=17). Net at y=10.
const PADEL_KEYPOINTS = [
  { id: 0,  label: "0 – BL outer corner",        world: [0,  0]  as [number, number] },
  { id: 1,  label: "1 – BR outer corner",        world: [10, 0]  as [number, number] },
  { id: 2,  label: "2 – TR outer corner",        world: [10, 20] as [number, number] },
  { id: 3,  label: "3 – TL outer corner",        world: [0,  20] as [number, number] },
  { id: 4,  label: "4 – Near service left",      world: [0,  3]  as [number, number] },
  { id: 5,  label: "5 – Near service center",    world: [5,  3]  as [number, number] },
  { id: 6,  label: "6 – Near service right",     world: [10, 3]  as [number, number] },
  { id: 7,  label: "7 – Far service left",       world: [0,  17] as [number, number] },
  { id: 8,  label: "8 – Far service center",     world: [5,  17] as [number, number] },
  { id: 9,  label: "9 – Far service right",      world: [10, 17] as [number, number] },
  { id: 10, label: "10 – Net left (14)",         world: [0,  10] as [number, number] },
  { id: 11, label: "11 – Net right (15)",        world: [10, 10] as [number, number] },
];

type CourtRow = {
  id: number;
  name: string;
  sport: string;
  court_type: string;
  arena_name: string;
  calib_id: number | null;
  calib_status: string | null;
};

type CalibSummary = {
  id: number;
  court_id: number;
  sport_type: string;
  calibration_image_path: string | null;
  point_count: number;
  has_homography: boolean;
  status: string;
  is_active: boolean;
  version: number;
  computed_at: string | null;
  created_at: string;
};

type PlacedPoint = { kpId: number; imageX: number; imageY: number };

// SVG reference diagram (10 × 20 m court)
function CourtDiagram({
  placedIds,
  activeKpId,
  onSelect,
}: {
  placedIds: Set<number>;
  activeKpId: number;
  onSelect: (id: number) => void;
}) {
  const PAD = 10, W = 100, H = 200;
  const sx = (x: number) => PAD + (x / 10) * W;
  // y=0 (near/BL-BR) at BOTTOM, y=20 (far/TL-TR) at TOP — matches typical camera view
  const sy = (y: number) => PAD + H - (y / 20) * H;
  return (
    <svg width={W + 2 * PAD} height={H + 2 * PAD} className="border border-border/40 rounded bg-muted/10 select-none">
      <rect x={PAD} y={PAD} width={W} height={H} fill="none" stroke="#64748b" strokeWidth="2" />
      {/* net */}
      <line x1={PAD} y1={sy(10)} x2={PAD + W} y2={sy(10)} stroke="#94a3b8" strokeWidth="2.5" />
      {/* service lines at y=3 and y=17 (3 m from each baseline) */}
      <line x1={PAD} y1={sy(3)}  x2={PAD + W} y2={sy(3)}  stroke="#64748b" strokeWidth="1" strokeDasharray="4,3" />
      <line x1={PAD} y1={sy(17)} x2={PAD + W} y2={sy(17)} stroke="#64748b" strokeWidth="1" strokeDasharray="4,3" />
      {/* center vertical between service lines */}
      <line x1={sx(5)} y1={sy(3)} x2={sx(5)} y2={sy(17)} stroke="#64748b" strokeWidth="1" strokeDasharray="4,3" />
      {PADEL_KEYPOINTS.map((kp) => {
        const placed = placedIds.has(kp.id);
        const active = kp.id === activeKpId;
        return (
          <g key={kp.id} onClick={() => onSelect(kp.id)} style={{ cursor: "pointer" }}>
            <circle cx={sx(kp.world[0])} cy={sy(kp.world[1])} r={6}
              fill={active ? "#3b82f6" : placed ? "#10b981" : "#475569"}
              stroke="#fff" strokeWidth="1.5" />
            <text x={sx(kp.world[0])} y={sy(kp.world[1])}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="6" fill="#fff" fontWeight="bold" style={{ pointerEvents: "none" }}>
              {kp.id + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function CourtCalibrationPanel() {
  const [courts, setCourts] = useState<CourtRow[]>([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<CourtRow | null>(null);
  const [calibrations, setCalibrations] = useState<CalibSummary[]>([]);
  const [calibsLoading, setCalibsLoading] = useState(false);

  // Annotation state
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [placedPoints, setPlacedPoints] = useState<PlacedPoint[]>([]);
  const [activeKpId, setActiveKpId] = useState(0);
  const [newCalibId, setNewCalibId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameUrlRef = useRef<string | null>(null);

  useEffect(() => {
    loadCourts();
  }, []);

  async function loadCourts() {
    setCourtsLoading(true);
    try {
      const res = await api<{ courts: CourtRow[] }>("/api/admin/courts-with-calibrations", { authenticated: true });
      setCourts(res.courts ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load courts.");
    } finally {
      setCourtsLoading(false);
    }
  }

  async function loadCalibrations(courtId: number) {
    setCalibsLoading(true);
    try {
      const res = await api<{ calibrations: CalibSummary[] }>(`/api/admin/court-calibrations/${courtId}`, { authenticated: true });
      setCalibrations(res.calibrations ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load calibrations.");
    } finally {
      setCalibsLoading(false);
    }
  }

  function openAnnotator(court: CourtRow) {
    setSelectedCourt(court);
    setCalibrations([]);
    setFrameFile(null);
    setFrameUrl(null);
    setPlacedPoints([]);
    setActiveKpId(0);
    setNewCalibId(null);
    setOpen(true);
    loadCalibrations(court.id);
  }

  function handleClose() {
    setOpen(false);
    setSelectedCourt(null);
    if (frameUrlRef.current) {
      URL.revokeObjectURL(frameUrlRef.current);
      frameUrlRef.current = null;
    }
    setFrameUrl(null);
    setFrameFile(null);
    setPlacedPoints([]);
    loadCourts();
  }

  function onFrameFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (frameUrlRef.current) URL.revokeObjectURL(frameUrlRef.current);
    const url = file ? URL.createObjectURL(file) : null;
    frameUrlRef.current = url;
    setFrameFile(file);
    setFrameUrl(url);
    setPlacedPoints([]);
    setNewCalibId(null);
    imgRef.current = null;
  }

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    for (const pt of placedPoints) {
      const active = pt.kpId === activeKpId;
      ctx.beginPath();
      ctx.arc(pt.imageX, pt.imageY, 13, 0, Math.PI * 2);
      ctx.fillStyle = active ? "rgba(59,130,246,0.88)" : "rgba(16,185,129,0.88)";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(pt.kpId + 1), pt.imageX, pt.imageY);
    }
  }, [placedPoints, activeKpId]);

  useEffect(() => {
    if (!frameUrl) { imgRef.current = null; drawCanvas(); return; }
    const img = new Image();
    img.onload = () => { imgRef.current = img; drawCanvas(); };
    img.src = frameUrl;
  }, [frameUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));
    const updated: PlacedPoint[] = [
      ...placedPoints.filter((p) => p.kpId !== activeKpId),
      { kpId: activeKpId, imageX: x, imageY: y },
    ];
    setPlacedPoints(updated);
    const placedIds = new Set(updated.map((p) => p.kpId));
    const next = PADEL_KEYPOINTS.find((kp) => !placedIds.has(kp.id));
    if (next) setActiveKpId(next.id);
  }

  async function computeAndSave() {
    if (!selectedCourt) return;
    if (placedPoints.length < 4) { toast.error("Place at least 4 keypoints first."); return; }
    setSaving(true);
    try {
      const sorted = [...placedPoints].sort((a, b) => a.kpId - b.kpId);
      const imagePoints = sorted.map((p) => [p.imageX, p.imageY]);
      const worldPoints = sorted.map((p) => PADEL_KEYPOINTS[p.kpId].world);
      const keypointLabels = sorted.map((p) => PADEL_KEYPOINTS[p.kpId].label);

      let calibId = newCalibId;
      if (!calibId) {
        const form = new FormData();
        form.set("sport_type", "padel");
        if (frameFile) form.append("frame", frameFile);
        const token = getToken();
        const createResp = await fetch(resolveApiUrl(`/api/admin/court-calibrations/${selectedCourt.id}`), {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        });
        const createData = await createResp.json().catch(() => ({}));
        if (!createResp.ok) throw new Error(createData.message ?? "Failed to create calibration.");
        calibId = createData.calibration.id;
        setNewCalibId(calibId);
      }

      const result = await api<{ homography_computed: boolean }>(`/api/admin/court-calibrations/${calibId}/keypoints`, {
        method: "PATCH",
        authenticated: true,
        body: { image_points: imagePoints, world_points: worldPoints, keypoint_labels: keypointLabels },
      });

      if (result.homography_computed) {
        toast.success("Homography computed and saved.");
      } else {
        toast.warning("Keypoints saved but homography computation failed. Check Python/numpy availability.");
      }
      await loadCalibrations(selectedCourt.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to compute homography.");
    } finally {
      setSaving(false);
    }
  }

  async function activateCalibration(calibId: number) {
    if (!selectedCourt) return;
    setActivating(calibId);
    try {
      await api(`/api/admin/court-calibrations/${calibId}/activate`, { method: "POST", authenticated: true });
      toast.success("Calibration activated.");
      await Promise.all([loadCalibrations(selectedCourt.id), loadCourts()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate.");
    } finally {
      setActivating(null);
    }
  }

  async function deleteCalibration(calibId: number) {
    if (!selectedCourt) return;
    setDeletingId(calibId);
    try {
      await api(`/api/admin/court-calibrations/${calibId}`, { method: "DELETE", authenticated: true });
      toast.success("Calibration deleted.");
      if (newCalibId === calibId) setNewCalibId(null);
      await Promise.all([loadCalibrations(selectedCourt.id), loadCourts()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  }

  const placedIds = new Set(placedPoints.map((p) => p.kpId));

  return (
    <section id="court-calibration-panel" className="gradient-card rounded-2xl border border-border/50 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <MapPin size={18} className="text-primary" /> Court Calibrations
          </h3>
          <p className="text-xs text-muted-foreground">Annotate keypoints to compute the homography matrix for each court.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={loadCourts} disabled={courtsLoading}>
          <RefreshCw size={14} className={courtsLoading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {courtsLoading ? (
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : courts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border/50 rounded-xl">
          No courts found for your arena.
        </p>
      ) : (
        <div className="space-y-2">
          {courts.map((court) => (
            <div key={court.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/35 px-4 py-3 gap-3">
              <div>
                <p className="text-sm font-semibold">{court.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {court.arena_name ?? ""}{court.arena_name ? " · " : ""}{court.court_type ?? court.sport ?? "padel"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {court.calib_id ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-green-400">
                    <CheckCircle2 size={10} /> Calibrated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    <AlertCircle size={10} /> Uncalibrated
                  </span>
                )}
                <Button type="button" size="sm" variant="outline" onClick={() => openAnnotator(court)}>
                  <Crosshair size={13} /> Annotate
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0" aria-describedby={undefined}>
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Crosshair size={16} className="text-primary" />
              Calibrate: {selectedCourt?.name ?? ""}
              <span className="text-xs font-normal text-muted-foreground ml-1 capitalize">
                {selectedCourt?.court_type ?? ""} · Court #{selectedCourt?.id}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 pt-4 space-y-5">
            {/* Existing calibrations */}
            {calibsLoading ? (
              <Skeleton className="h-10 rounded-lg" />
            ) : calibrations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Saved calibrations</p>
                {calibrations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 px-3 py-2 gap-2">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <span className="font-medium">v{c.version}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {c.point_count ?? 0} pts · {c.status}
                        {c.computed_at && ` · ${new Date(c.computed_at).toLocaleDateString()}`}
                      </span>
                      {c.is_active && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-400 flex-shrink-0">
                          <CheckCircle2 size={10} /> Active
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {c.has_homography && !c.is_active && (
                        <Button type="button" size="sm" onClick={() => activateCalibration(c.id)} disabled={activating === c.id}>
                          <Zap size={12} /> {activating === c.id ? "…" : "Activate"}
                        </Button>
                      )}
                      {!c.has_homography && newCalibId !== c.id && (
                        <span className="text-xs text-amber-300 self-center">No H yet</span>
                      )}
                      <Button type="button" size="sm" variant="destructive" onClick={() => deleteCalibration(c.id)} disabled={deletingId === c.id}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New annotation */}
            <div className="border-t border-border/30 pt-5 space-y-4">
              <p className="text-sm font-bold">New annotation</p>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Calibration frame image <span className="text-muted-foreground/60">(screenshot from camera)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFrameFileChange}
                  className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                {/* Canvas */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Click to place keypoint {activeKpId + 1}: {PADEL_KEYPOINTS[activeKpId]?.label}
                  </p>
                  {frameUrl ? (
                    <canvas
                      ref={canvasRef}
                      onClick={onCanvasClick}
                      className="w-full rounded-lg border border-border/50 cursor-crosshair bg-black"
                      style={{ maxHeight: "400px", objectFit: "contain" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/40 bg-muted/5 text-center text-sm text-muted-foreground" style={{ minHeight: 220 }}>
                      <Crosshair size={28} className="opacity-25" />
                      <span>Upload a frame image above to start annotating</span>
                      {/* hidden canvas so ref is always assigned */}
                      <canvas ref={canvasRef} style={{ display: "none" }} />
                    </div>
                  )}
                </div>

                {/* Reference + keypoint list */}
                <div className="space-y-3 lg:w-56">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reference (click to select)</p>
                  <CourtDiagram placedIds={placedIds} activeKpId={activeKpId} onSelect={setActiveKpId} />

                  <div className="space-y-0.5 max-h-44 overflow-y-auto pr-1">
                    {PADEL_KEYPOINTS.map((kp) => {
                      const placed = placedIds.has(kp.id);
                      const active = kp.id === activeKpId;
                      return (
                        <div key={kp.id} className={`flex items-center gap-1.5 rounded px-2 py-1 cursor-pointer text-xs transition-colors ${active ? "bg-primary/15 text-primary font-bold" : "hover:bg-muted/20 text-muted-foreground"}`}
                          onClick={() => setActiveKpId(kp.id)}>
                          <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${placed ? "bg-green-500/25 text-green-400" : active ? "bg-primary/25 text-primary" : "bg-muted/40"}`}>
                            {kp.id + 1}
                          </span>
                          <span className="truncate">{kp.label}</span>
                          {placed && (
                            <button type="button" className="ml-auto text-muted-foreground hover:text-red-400 flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); setPlacedPoints((pp) => pp.filter((p) => p.kpId !== kp.id)); }}>
                              <X size={9} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Button type="button" onClick={computeAndSave} disabled={saving || placedPoints.length < 4}>
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                  {saving ? "Computing…" : `Compute & Save (${placedPoints.length} pts)`}
                </Button>
                {newCalibId && !saving && (
                  <Button type="button" variant="outline" onClick={() => activateCalibration(newCalibId)} disabled={activating === newCalibId}>
                    <CheckCircle2 size={13} /> Activate
                  </Button>
                )}
                {placedPoints.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setPlacedPoints([])}>
                    Clear all
                  </Button>
                )}
                <span className="text-xs text-muted-foreground ml-auto">Min 4 keypoints · More = better accuracy</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
