import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { useLocale } from "@/i18n/locale";
import {
  Users, MapPin, Trophy, Activity, BarChart3, Shield, Settings,
  CreditCard, Bell, TrendingUp, CheckCircle2, XCircle, Clock,
  RefreshCw, ChevronRight, AlertCircle, Zap, Brain, Wifi, WifiOff,
  Plus, Edit2, Trash2, UserCheck, UserX, Search, Filter, Award,
  CalendarDays, Target, Star, Layers,
} from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminOverview = {
  stats: {
    users: number;
    activeCompetitions: number;
    totalRegistrations: number;
    matchesThisWeek: number;
  };
  users: Array<{
    id: number; first_name: string; last_name: string; email: string;
    role: string; platform_role?: string; status: string;
    arena_name: string | null; created_at: string;
  }>;
  courts: Array<{
    id: number; name: string; status: string; has_summa: number;
    arena_name: string; sport: string; price_per_hour?: number;
  }>;
  logs: Array<{
    id: number; action: string; actor_name: string; detail: string;
    created_at: string; arena_name?: string | null;
  }>;
  arenas: Array<{ id: number; name: string; location: string }>;
};

type AdminReservation = {
  id: number; reservation_date: string; start_time: string; end_time: string;
  status: "confirmed" | "cancelled" | "completed"; court_name: string;
  arena_name: string; owner_name: string; owner_email: string;
  special_code?: string; payment_status?: string;
};

type ScoringMatch = {
  id: number; status: string; score1: number[]; score2: number[];
  player1_name: string; player2_name: string; court_name: string;
  arena_name: string; competition_name?: string; score_source: string;
  scheduled_at: string;
};

type RevenueSummary = {
  summary: { total_revenue: number; paid_count: number; pending_count: number; refunded_count: number };
  monthly: Array<{ month: string; revenue: number; payments: number }>;
};

type SmartPlayStatus = {
  connected: boolean; version?: string | null; message: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const roleBadge: Record<string, string> = {
  super_admin: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  admin: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  coach: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  player: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
};

const statusBadge: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border border-green-500/30",
  inactive: "bg-red-500/20 text-red-300 border border-red-500/30",
  confirmed: "bg-green-500/20 text-green-300 border border-green-500/30",
  cancelled: "bg-red-500/20 text-red-300 border border-red-500/30",
  completed: "bg-muted text-muted-foreground border border-border",
  live: "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse",
  finished: "bg-muted text-muted-foreground border border-border",
  upcoming: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  paid: "bg-green-500/20 text-green-300 border border-green-500/30",
  pending: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  failed: "bg-red-500/20 text-red-300 border border-red-500/30",
  refunded: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
};

function RBadge({ label }: { label: string }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${roleBadge[label] ?? "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}

function SBadge({ label }: { label: string }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${statusBadge[label] ?? "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--ultima-olive))", "#6366f1", "#f59e0b", "#10b981"];

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: typeof Users; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="gradient-card rounded-2xl border border-border/50 p-5 flex items-center gap-4 hover:border-primary/30 transition-colors">
      <div className={`p-3 rounded-xl ${accent ?? "bg-primary/10"}`}>
        <Icon size={22} className="text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-0.5">{label}</p>
        <p className="text-2xl font-display font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Score Source Badge ────────────────────────────────────────────────────────

function ScoreSourceBadge({ source }: { source: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    manual: { cls: "bg-muted text-muted-foreground", label: "Manual" },
    summa: { cls: "bg-blue-500/20 text-blue-300", label: "SUMMA" },
    ai: { cls: "bg-purple-500/20 text-purple-300", label: "AI" },
    corrected: { cls: "bg-amber-500/20 text-amber-300", label: "Corrected" },
  };
  const m = map[source] ?? map.manual;
  return <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}

// ── Score Correction Modal ────────────────────────────────────────────────────

function ScoreCorrectionModal({
  match, onClose, onSaved,
}: {
  match: ScoringMatch;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [s1, setS1] = useState(match.score1.join(","));
  const [s2, setS2] = useState(match.score2.join(","));
  const [status, setStatus] = useState(match.status);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const score1 = s1.split(",").map(Number).filter((n) => !isNaN(n));
    const score2 = s2.split(",").map(Number).filter((n) => !isNaN(n));
    if (!reason.trim()) { toast.error("Please provide a reason for the correction."); return; }
    setSaving(true);
    try {
      await api(`/api/matches/${match.id}/score`, {
        method: "PATCH",
        body: JSON.stringify({ score1, score2, status, reason }),
        authenticated: true,
      });
      toast.success("Score updated and correction logged.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update score.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="gradient-card rounded-2xl border border-border w-full max-w-md p-6">
        <h3 className="text-lg font-display font-bold mb-1">Correct Score</h3>
        <p className="text-xs text-muted-foreground mb-6">{match.player1_name} vs {match.player2_name}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              {match.player1_name} Sets (comma-separated)
            </label>
            <Input value={s1} onChange={(e) => setS1(e.target.value)} placeholder="0,1,2" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              {match.player2_name} Sets (comma-separated)
            </label>
            <Input value={s2} onChange={(e) => setS2(e.target.value)} placeholder="2,1,0" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              {["live", "upcoming", "finished"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Reason *</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Score entry error by referee" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save Correction"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar nav items ─────────────────────────────────────────────────────────

const navItems = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "courts", label: "Courts", icon: MapPin },
  { id: "reservations", label: "Reservations", icon: CalendarDays },
  { id: "scoring", label: "Scoring", icon: Target },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "revenue", label: "Revenue", icon: CreditCard },
  { id: "logs", label: "Activity Logs", icon: Activity },
  { id: "system", label: "System Status", icon: Settings },
];

// ── Main Component ─────────────────────────────────────────────────────────────

const Admin = () => {
  const { t } = useLocale();
  const user = getSessionUser();
  const isSuperAdmin = user?.role === "super_admin";

  const [activeSection, setActiveSection] = useState("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [scoring, setScoring] = useState<{ matches: ScoringMatch[]; recentActivity: unknown[] } | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [aiStatus, setAiStatus] = useState<SmartPlayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [correcting, setCorrecting] = useState<ScoringMatch | null>(null);

  const [form, setForm] = useState({ nom: "", prenom: "", email: "", password: "", role: "player", arenaId: "", arenaName: "", cinNumber: "" });
  const [courtForm, setCourtForm] = useState({ name: "", sport: "Padel", location: "", arenaId: "", hasSumma: false, minPlayers: 2, maxPlayers: 4, openingTime: "08:00", closingTime: "22:00" });
  const [showUserForm, setShowUserForm] = useState(false);
  const [showCourtForm, setShowCourtForm] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!user || !["admin", "super_admin"].includes(user.role)) { setLoading(false); return; }
    try {
      const result = await api<AdminOverview>("/api/admin/overview", { authenticated: true });
      setOverview(result);
      setForm((c) => ({ ...c, arenaId: c.arenaId || String(user.arenaId ?? result.arenas[0]?.id ?? "") }));
      setCourtForm((c) => ({ ...c, arenaId: c.arenaId || String(user.arenaId ?? result.arenas[0]?.id ?? "") }));
    } catch { toast.error("Failed to load admin panel."); } finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (activeSection === "reservations" && !reservations.length) {
      api<{ reservations: AdminReservation[] }>("/api/admin/reservations", { authenticated: true })
        .then((r) => setReservations(r.reservations))
        .catch(() => toast.error("Failed to load reservations."));
    }
    if (activeSection === "scoring" && !scoring) {
      api<typeof scoring>("/api/admin/scoring", { authenticated: true })
        .then(setScoring)
        .catch(() => toast.error("Failed to load scoring data."));
    }
    if (activeSection === "revenue" && !revenue) {
      api<RevenueSummary>("/api/admin/revenue", { authenticated: true })
        .then(setRevenue)
        .catch(() => {});
    }
    if (activeSection === "system" && !aiStatus) {
      api<SmartPlayStatus>("/api/smartplay/status")
        .then(setAiStatus)
        .catch(() => setAiStatus({ connected: false, message: "Unable to reach AI service." }));
    }
  }, [activeSection]);

  const updateUserStatus = async (userId: number, status: "active" | "inactive") => {
    setSaving(true);
    try {
      await api(`/api/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status }), authenticated: true });
      toast.success(`Account ${status === "inactive" ? "deactivated" : "reactivated"}.`);
      await loadOverview();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error updating status."); } finally { setSaving(false); }
  };

  const updateUserRole = async (userId: number, role: "player" | "coach") => {
    setSaving(true);
    try {
      await api(`/api/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }), authenticated: true });
      toast.success(`Role updated to ${role}.`);
      await loadOverview();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error updating role."); } finally { setSaving(false); }
  };

  const removeUser = async (userId: number, label: string) => {
    if (!confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await api(`/api/admin/users/${userId}`, { method: "DELETE", authenticated: true });
      toast.success("User deleted.");
      await loadOverview();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error deleting user."); } finally { setSaving(false); }
  };

  const createUser = async () => {
    setSaving(true);
    try {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(form), authenticated: true });
      toast.success("User created.");
      setShowUserForm(false);
      setForm({ nom: "", prenom: "", email: "", password: "", role: "player", arenaId: overview?.arenas[0]?.id?.toString() ?? "", arenaName: "", cinNumber: "" });
      await loadOverview();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error creating user."); } finally { setSaving(false); }
  };

  const createCourt = async () => {
    setSaving(true);
    try {
      await api("/api/admin/courts", { method: "POST", body: JSON.stringify(courtForm), authenticated: true });
      toast.success("Court created.");
      setShowCourtForm(false);
      await loadOverview();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Error creating court."); } finally { setSaving(false); }
  };

  const updateReservationStatus = async (id: number, status: string) => {
    setSaving(true);
    try {
      await api(`/api/admin/reservations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), authenticated: true });
      toast.success("Status updated.");
      const r = await api<{ reservations: AdminReservation[] }>("/api/admin/reservations", { authenticated: true });
      setReservations(r.reservations);
    } catch { toast.error("Error updating reservation."); } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </Layout>
    );
  }

  if (!user || !["admin", "super_admin"].includes(user.role)) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <Shield size={48} className="mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-display font-bold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You need admin privileges to access this page.</p>
        </div>
      </Layout>
    );
  }

  const filteredUsers = (overview?.users ?? []).filter((u) =>
    !search || `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const stats = overview?.stats;

  return (
    <Layout>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-background/60 backdrop-blur-sm pt-6 pb-8 px-3 fixed top-16 bottom-0 left-0 z-20 overflow-y-auto">
          <div className="px-3 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Admin Panel</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <RBadge label={user.role} />
          </div>
          <nav className="space-y-1 flex-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeSection === item.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <item.icon size={16} />
                {item.label}
                {activeSection === item.id && <ChevronRight size={14} className="ml-auto" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile top nav */}
        <div className="lg:hidden w-full px-4 pt-4 pb-2 flex gap-2 overflow-x-auto border-b border-border/50 bg-background/80 sticky top-16 z-10">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeSection === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <item.icon size={12} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 lg:ml-64 p-6 lg:p-8">

          {/* ── Overview ── */}
          {activeSection === "overview" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-display font-bold text-gradient mb-1">
                  {isSuperAdmin ? "Platform Overview" : `${user.arenaName ?? "Arena"} Dashboard`}
                </h1>
                <p className="text-muted-foreground text-sm">Welcome back, {user.firstName ?? user.email}</p>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Users" value={stats?.users ?? 0} sub="Active members" />
                <StatCard icon={Trophy} label="Active Competitions" value={stats?.activeCompetitions ?? 0} />
                <StatCard icon={Activity} label="Matches This Week" value={stats?.matchesThisWeek ?? 0} />
                <StatCard icon={Award} label="Registrations" value={stats?.totalRegistrations ?? 0} />
              </div>

              {/* Courts status */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="gradient-card rounded-2xl border border-border/50 p-5">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <MapPin size={14} /> Courts Overview
                  </h3>
                  <div className="space-y-2">
                    {(overview?.courts ?? []).slice(0, 6).map((court) => (
                      <div key={court.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{court.name}</span>
                          {court.has_summa ? <Zap size={12} className="text-primary flex-shrink-0" title="SUMMA" /> : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{court.sport}</span>
                          <SBadge label={court.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="gradient-card rounded-2xl border border-border/50 p-5">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <Activity size={14} /> Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {(overview?.logs ?? []).slice(0, 6).map((log) => (
                      <div key={log.id} className="flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{log.detail}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {log.actor_name} · {new Date(log.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {!(overview?.logs ?? []).length && (
                      <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Role distribution */}
              {isSuperAdmin && (overview?.arenas ?? []).length > 1 && (
                <div className="gradient-card rounded-2xl border border-border/50 p-5">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <Layers size={14} /> Arenas
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {overview!.arenas.map((arena) => (
                      <div key={arena.id} className="p-3 rounded-xl bg-muted/30 border border-border/30">
                        <p className="font-medium text-sm">{arena.name}</p>
                        <p className="text-xs text-muted-foreground">{arena.location}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Users ── */}
          {activeSection === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-display font-bold">Users Management</h2>
                <Button onClick={() => setShowUserForm(true)} size="sm" className="flex items-center gap-2">
                  <Plus size={14} /> Add User
                </Button>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {showUserForm && (
                <div className="gradient-card rounded-2xl border border-border p-6 space-y-4">
                  <h3 className="font-bold text-lg">Create User</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input placeholder="First name" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
                    <Input placeholder="Last name" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                    <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    <Input placeholder="CIN (8 digits)" value={form.cinNumber} onChange={(e) => setForm({ ...form, cinNumber: e.target.value })} />
                    <select className="bg-background border border-border rounded-lg px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      <option value="player">Player</option>
                      <option value="coach">Coach</option>
                      {isSuperAdmin && <option value="admin">Admin</option>}
                    </select>
                    <select className="bg-background border border-border rounded-lg px-3 py-2 text-sm" value={form.arenaId} onChange={(e) => setForm({ ...form, arenaId: e.target.value })}>
                      {(overview?.arenas ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowUserForm(false)}>Cancel</Button>
                    <Button onClick={createUser} disabled={saving}>Create</Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50">
                      <th className="text-left py-3 pr-4">Name</th>
                      <th className="text-left py-3 pr-4">Email</th>
                      <th className="text-left py-3 pr-4">Role</th>
                      <th className="text-left py-3 pr-4">Status</th>
                      <th className="text-left py-3 pr-4">Arena</th>
                      <th className="text-left py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-3 pr-4 font-medium">{u.first_name} {u.last_name}</td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">{u.email}</td>
                        <td className="py-3 pr-4"><RBadge label={u.platform_role === "super_admin" ? "super_admin" : u.role} /></td>
                        <td className="py-3 pr-4"><SBadge label={u.status} /></td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">{u.arena_name ?? "—"}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            {u.role === "player" && (
                              <button
                                onClick={() => updateUserRole(u.id, "coach")}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                disabled={saving}
                              >→ Coach</button>
                            )}
                            {u.role === "coach" && (
                              <button
                                onClick={() => updateUserRole(u.id, "player")}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                disabled={saving}
                              >→ Player</button>
                            )}
                            <button
                              onClick={() => updateUserStatus(u.id, u.status === "active" ? "inactive" : "active")}
                              className={`p-1.5 rounded-lg transition-colors ${u.status === "active" ? "hover:bg-red-500/10 text-red-400" : "hover:bg-green-500/10 text-green-400"}`}
                              disabled={saving}
                            >
                              {u.status === "active" ? <UserX size={13} /> : <UserCheck size={13} />}
                            </button>
                            <button
                              onClick={() => removeUser(u.id, `${u.first_name} ${u.last_name}`)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                              disabled={saving}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredUsers.length && (
                      <tr><td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Courts ── */}
          {activeSection === "courts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold">Courts / Terrains</h2>
                <Button onClick={() => setShowCourtForm(true)} size="sm" className="flex items-center gap-2">
                  <Plus size={14} /> Add Court
                </Button>
              </div>

              {showCourtForm && (
                <div className="gradient-card rounded-2xl border border-border p-6 space-y-4">
                  <h3 className="font-bold text-lg">Create Court</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input placeholder="Court name" value={courtForm.name} onChange={(e) => setCourtForm({ ...courtForm, name: e.target.value })} />
                    <Input placeholder="Location" value={courtForm.location} onChange={(e) => setCourtForm({ ...courtForm, location: e.target.value })} />
                    <select className="bg-background border border-border rounded-lg px-3 py-2 text-sm" value={courtForm.sport} onChange={(e) => setCourtForm({ ...courtForm, sport: e.target.value })}>
                      <option value="Padel">Padel</option>
                      <option value="Tennis">Tennis</option>
                    </select>
                    <select className="bg-background border border-border rounded-lg px-3 py-2 text-sm" value={courtForm.arenaId} onChange={(e) => setCourtForm({ ...courtForm, arenaId: e.target.value })}>
                      {(overview?.arenas ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="hasSumma" checked={courtForm.hasSumma} onChange={(e) => setCourtForm({ ...courtForm, hasSumma: e.target.checked })} />
                      <label htmlFor="hasSumma" className="text-sm">Has SUMMA Device</label>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowCourtForm(false)}>Cancel</Button>
                    <Button onClick={createCourt} disabled={saving}>Create Court</Button>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {(overview?.courts ?? []).map((court) => (
                  <div key={court.id} className="gradient-card rounded-2xl border border-border/50 p-5 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold">{court.name}</p>
                        <p className="text-xs text-muted-foreground">{court.arena_name}</p>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        {court.has_summa ? <Zap size={13} className="text-primary" /> : null}
                        <SBadge label={court.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin size={10} />{court.sport}</span>
                      {court.price_per_hour && <span>{court.price_per_hour} TND/h</span>}
                    </div>
                  </div>
                ))}
                {!(overview?.courts ?? []).length && (
                  <p className="text-muted-foreground text-sm col-span-3 py-8 text-center">No courts found</p>
                )}
              </div>
            </div>
          )}

          {/* ── Reservations ── */}
          {activeSection === "reservations" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold">Reservations</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50">
                      <th className="text-left py-3 pr-4">Player</th>
                      <th className="text-left py-3 pr-4">Court</th>
                      <th className="text-left py-3 pr-4">Date & Time</th>
                      <th className="text-left py-3 pr-4">Status</th>
                      <th className="text-left py-3 pr-4">Payment</th>
                      <th className="text-left py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r) => (
                      <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-medium">{r.owner_name}</p>
                          <p className="text-xs text-muted-foreground">{r.owner_email}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="text-sm">{r.court_name}</p>
                          <p className="text-xs text-muted-foreground">{r.arena_name}</p>
                        </td>
                        <td className="py-3 pr-4 text-xs">
                          <p>{r.reservation_date}</p>
                          <p className="text-muted-foreground">{r.start_time} – {r.end_time}</p>
                        </td>
                        <td className="py-3 pr-4"><SBadge label={r.status} /></td>
                        <td className="py-3 pr-4"><SBadge label={r.payment_status ?? "pending"} /></td>
                        <td className="py-3">
                          <div className="flex gap-1.5">
                            {r.status === "confirmed" && (
                              <>
                                <button
                                  onClick={() => updateReservationStatus(r.id, "completed")}
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                                  disabled={saving}
                                >Done</button>
                                <button
                                  onClick={() => updateReservationStatus(r.id, "cancelled")}
                                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                  disabled={saving}
                                >Cancel</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!reservations.length && (
                      <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No reservations found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Scoring ── */}
          {activeSection === "scoring" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold flex items-center gap-3">
                <Target size={24} className="text-primary" /> Smart Scoring
              </h2>
              {!scoring ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50">
                          <th className="text-left py-3 pr-4">Match</th>
                          <th className="text-left py-3 pr-4">Score</th>
                          <th className="text-left py-3 pr-4">Status</th>
                          <th className="text-left py-3 pr-4">Source</th>
                          <th className="text-left py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scoring.matches.map((m) => (
                          <tr key={m.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="py-3 pr-4">
                              <p className="font-medium text-sm">{m.player1_name} <span className="text-muted-foreground">vs</span> {m.player2_name}</p>
                              <p className="text-xs text-muted-foreground">{m.court_name} · {m.arena_name}</p>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="font-mono text-sm font-bold">
                                {(m.score1 ?? []).join("-")} | {(m.score2 ?? []).join("-")}
                              </span>
                            </td>
                            <td className="py-3 pr-4"><SBadge label={m.status} /></td>
                            <td className="py-3 pr-4"><ScoreSourceBadge source={m.score_source ?? "manual"} /></td>
                            <td className="py-3">
                              <button
                                onClick={() => setCorrecting(m)}
                                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                              >
                                <Edit2 size={10} /> Correct
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!scoring.matches.length && (
                          <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No matches found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {(scoring.recentActivity as Array<{ id: number; first_name: string; last_name: string; changed_by_role: string; player1_name: string; player2_name: string; created_at: string; reason: string }>).length > 0 && (
                    <div className="gradient-card rounded-2xl border border-border/50 p-5">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                        <Activity size={14} /> Recent Score Corrections
                      </h3>
                      <div className="space-y-3">
                        {(scoring.recentActivity as Array<{ id: number; first_name: string; last_name: string; changed_by_role: string; player1_name: string; player2_name: string; created_at: string; reason: string }>).map((item) => (
                          <div key={item.id} className="flex items-start gap-3 text-xs border-b border-border/20 pb-3 last:border-0 last:pb-0">
                            <RBadge label={item.changed_by_role} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{item.first_name} {item.last_name} corrected: {item.player1_name} vs {item.player2_name}</p>
                              {item.reason && <p className="text-muted-foreground">{item.reason}</p>}
                            </div>
                            <span className="text-muted-foreground whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Competitions ── */}
          {activeSection === "competitions" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold">Competitions</h2>
              <p className="text-muted-foreground text-sm">Manage tournaments from the competitions page.</p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="gradient-card rounded-2xl border border-primary/20 p-6 text-center">
                  <Trophy size={32} className="text-primary mx-auto mb-3" />
                  <p className="font-bold">{stats?.activeCompetitions ?? 0} Active</p>
                  <p className="text-xs text-muted-foreground">Running competitions</p>
                </div>
                <div className="gradient-card rounded-2xl border border-border/50 p-6 text-center">
                  <Users size={32} className="text-muted-foreground mx-auto mb-3" />
                  <p className="font-bold">{stats?.totalRegistrations ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total registrations</p>
                </div>
                <div className="gradient-card rounded-2xl border border-border/50 p-6 text-center">
                  <Activity size={32} className="text-muted-foreground mx-auto mb-3" />
                  <p className="font-bold">{stats?.matchesThisWeek ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Matches this week</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Revenue ── */}
          {activeSection === "revenue" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold">Revenue & Billing</h2>
              {!revenue ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard icon={CreditCard} label="Total Revenue" value={`${(revenue.summary?.total_revenue ?? 0).toFixed(3)} TND`} />
                    <StatCard icon={CheckCircle2} label="Paid" value={revenue.summary?.paid_count ?? 0} />
                    <StatCard icon={Clock} label="Pending" value={revenue.summary?.pending_count ?? 0} />
                    <StatCard icon={RefreshCw} label="Refunded" value={revenue.summary?.refunded_count ?? 0} />
                  </div>
                  {revenue.monthly.length > 0 && (
                    <div className="gradient-card rounded-2xl border border-border/50 p-5">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Monthly Revenue (TND)</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={revenue.monthly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {!revenue.monthly.length && (
                    <div className="gradient-card rounded-2xl border border-border/50 p-12 text-center">
                      <CreditCard size={32} className="text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No payment history yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Activity Logs ── */}
          {activeSection === "logs" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold">Activity Logs</h2>
              <div className="space-y-2">
                {(overview?.logs ?? []).map((log) => (
                  <div key={log.id} className="gradient-card rounded-xl border border-border/30 p-4 flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{log.action}</span>
                        {log.arena_name && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{log.arena_name}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.detail}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{log.actor_name} · {new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {!(overview?.logs ?? []).length && (
                  <div className="py-16 text-center">
                    <Activity size={32} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No activity logs yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── System Status ── */}
          {activeSection === "system" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold">System Status</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {/* API Status */}
                <div className="gradient-card rounded-2xl border border-green-500/30 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="font-bold text-sm">API Server</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Express.js — Operational</p>
                </div>

                {/* Database */}
                <div className="gradient-card rounded-2xl border border-green-500/30 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="font-bold text-sm">Database</span>
                  </div>
                  <p className="text-xs text-muted-foreground">PostgreSQL — Connected</p>
                </div>

                {/* WebSocket */}
                <div className="gradient-card rounded-2xl border border-green-500/30 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Wifi size={14} className="text-green-400" />
                    <span className="font-bold text-sm">WebSocket (Socket.IO)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Live scoring & updates active</p>
                </div>

                {/* Redis Placeholder */}
                <div className="gradient-card rounded-2xl border border-amber-500/30 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="font-bold text-sm">Redis Cache</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Optional — configure REDIS_URL to enable</p>
                </div>

                {/* SmartPlay AI */}
                <div className={`gradient-card rounded-2xl border p-5 sm:col-span-2 ${aiStatus?.connected ? "border-green-500/30" : "border-orange-500/30"}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {aiStatus?.connected
                      ? <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                      : <AlertCircle size={14} className="text-orange-400" />}
                    <Brain size={14} className="text-primary" />
                    <span className="font-bold text-sm">SmartPlay AI Microservice</span>
                    {aiStatus?.version && <span className="text-[10px] text-muted-foreground">v{aiStatus.version}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {aiStatus?.message ?? "Checking status…"}
                  </p>
                  {!aiStatus?.connected && (
                    <div className="mt-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                      <p className="text-xs text-orange-300">
                        The AI microservice is pending deployment. The platform continues to function normally without it.
                        Set <code className="font-mono">SMARTPLAY_AI_URL</code> to connect when ready.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {correcting && (
        <ScoreCorrectionModal
          match={correcting}
          onClose={() => setCorrecting(null)}
          onSaved={() => {
            api<typeof scoring>("/api/admin/scoring", { authenticated: true })
              .then(setScoring)
              .catch(() => {});
          }}
        />
      )}
    </Layout>
  );
};

export default Admin;
