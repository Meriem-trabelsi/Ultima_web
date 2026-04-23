import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, MapPin, Trophy, Activity, Clock, CheckCircle, X, Shield } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale";

const tabs = [
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "courts", label: "Terrains", icon: MapPin },
  { id: "reservations", label: "Reservations", icon: Activity },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "logs", label: "Logs & Stats", icon: Activity },
];

type AdminOverview = {
  stats: {
    users: number;
    activeCompetitions: number;
    totalRegistrations: number;
    matchesThisWeek: number;
  };
  users: Array<{ id: number; first_name: string; last_name: string; email: string; role: string; status: string; arena_name: string | null; created_at: string }>;
  courts: Array<{ id: number; name: string; status: string; has_summa: number; arena_name: string }>;
  logs: Array<{ id: number; action: string; actor_name: string; detail: string; created_at: string; arena_name?: string | null }>;
  arenas: Array<{ id: number; name: string; location: string }>;
};

type AdminReservation = {
  id: number;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled" | "completed";
  court_name: string;
  arena_name: string;
  owner_name: string;
  owner_email: string;
  special_code?: string;
};

type BillingSummary = {
  subscription: {
    status: string;
    plan: { code: string; name: string };
    period: { currentEnd: string | null; trialEnd: string | null };
  };
  limits: { admins: number; coaches: number; players: number };
  usage: { admins: number; coaches: number; players: number };
};

type BillingPlan = {
  code: "starter" | "pro" | "elite";
  name: string;
  limits: { admins: number; coaches: number; players: number };
  prices: { monthlyCents: number; yearlyCents: number };
};

const Admin = () => {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState("users");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [userArenaFilter, setUserArenaFilter] = useState("all");
  const [reservationArenaFilter, setReservationArenaFilter] = useState("all");
  const [courtArenaFilter, setCourtArenaFilter] = useState("all");
  const [verifyReservationId, setVerifyReservationId] = useState("");
  const [verifySignature, setVerifySignature] = useState("");
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    reason?: string;
    details?: {
      reservationDate: string;
      startTime: string;
      endTime: string;
      status: string;
      courtName: string;
      arenaName: string;
      ownerName: string;
      specialCode: string;
    };
  } | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [billingSaving, setBillingSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", password: "", role: "player", arenaId: "", arenaName: "" });
  const [scoreForm, setScoreForm] = useState<{ id: number; s1: string[]; s2: string[] } | null>(null);
  const [courtForm, setCourtForm] = useState({
    name: "",
    sport: "Padel",
    location: "",
    arenaId: "",
    hasSumma: false,
    minPlayers: 2,
    maxPlayers: 4,
    openingTime: "08:00",
    closingTime: "22:00",
  });
  const [user] = useState(() => getSessionUser());

  useEffect(() => {
    const loadOverview = async () => {
      if (!user || !["admin", "super_admin"].includes(user.role)) {
        setLoading(false);
        return;
      }

      try {
        const result = await api<AdminOverview>("/api/admin/overview", { authenticated: true });
        setOverview(result);
        setForm((current) => ({ ...current, arenaId: current.arenaId || String(user.arenaId ?? result.arenas[0]?.id ?? "") }));
        setCourtForm((current) => ({ ...current, arenaId: current.arenaId || String(user.arenaId ?? result.arenas[0]?.id ?? ""), location: current.location || (user.arenaName ?? result.arenas[0]?.location ?? "") }));
      } catch (error) { toast.error("Impossible de charger le panel admin."); } finally { setLoading(false); }

      // Billing loads independently — super_admin without an arena_id won't have billing
      api<BillingSummary>("/api/admin/billing/summary", { authenticated: true })
        .then(setBilling)
        .catch(() => { /* billing not available for all account types */ });
      api<{ plans: BillingPlan[] }>("/api/admin/billing/plans", { authenticated: true })
        .then((response) => setBillingPlans(response.plans))
        .catch(() => { /* optional for now */ });
    };
    void loadOverview();
  }, [user?.id, user?.role, user?.arenaId, user?.arenaName]);

  const loadReservations = async () => {
    try {
      const result = await api<{ reservations: AdminReservation[] }>("/api/admin/reservations", { authenticated: true });
      setReservations(result.reservations);
    } catch (error) { toast.error("Impossible de charger les reservations."); }
  };

  const reloadOverview = async () => {
    try {
      const result = await api<AdminOverview>("/api/admin/overview", { authenticated: true });
      setOverview(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de recharger les donnees admin.");
    }
  };

  useEffect(() => { if (activeTab === "reservations") void loadReservations(); }, [activeTab]);

  const updateReservationStatus = async (id: number, status: string) => {
    setSaving(true);
    try {
      await api("/api/admin/reservations/" + id + "/status", { method: "PATCH", body: JSON.stringify({ status }), authenticated: true });
      toast.success("Statut mis a jour.");
      void loadReservations();
    } catch (error) { toast.error("Erreur lors de la mise a jour."); } finally { setSaving(false); }
  };

  const updateUserStatus = async (targetUserId: number, nextStatus: "active" | "inactive") => {
    setSaving(true);
    try {
      await api(`/api/admin/users/${targetUserId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
        authenticated: true,
      });
      toast.success(`Compte ${nextStatus === "inactive" ? "desactive" : "reactive"} avec succes.`);
      await reloadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de mettre a jour le statut utilisateur.");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (targetUserId: number, label: string) => {
    if (!window.confirm(`Supprimer definitivement le compte de ${label} ? Cette action est irreversible.`)) {
      return;
    }
    setSaving(true);
    try {
      await api(`/api/admin/users/${targetUserId}`, {
        method: "DELETE",
        authenticated: true,
      });
      toast.success("Compte supprime avec succes.");
      await reloadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer cet utilisateur.");
    } finally {
      setSaving(false);
    }
  };

  const finalizeMatch = async () => {
    if (!scoreForm) return;
    setSaving(true);
    try {
      await api("/api/admin/matches/finalize", {
        method: "POST",
        body: JSON.stringify({
          reservationId: scoreForm.id,
          score1: scoreForm.s1.filter(v => v !== "").map(Number),
          score2: scoreForm.s2.filter(v => v !== "").map(Number),
        }),
        authenticated: true
      });
      toast.success("Match finalise et classements mis a jour !");
      setScoreForm(null);
      void loadReservations();
    } catch (error) { toast.error("Erreur lors de la finalisation."); } finally { setSaving(false); }
  };

  const verifyTicket = async () => {
    if (!verifyReservationId || !verifySignature) {
      toast.error("Reservation ID and signature are required.");
      return;
    }
    try {
      const result = await api<{
        valid: boolean;
        reason?: string;
        details?: {
          reservationDate: string;
          startTime: string;
          endTime: string;
          status: string;
          courtName: string;
          arenaName: string;
          ownerName: string;
          specialCode: string;
        };
      }>(
        `/api/reservations/tickets/verify?reservationId=${encodeURIComponent(verifyReservationId)}&signature=${encodeURIComponent(verifySignature)}`,
        { authenticated: true }
      );
      setVerifyResult(result);
      toast.success(result.valid ? "Ticket signature is valid." : "Ticket signature is invalid.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to verify ticket.");
    }
  };

  const handleChangePlan = async (planCode: BillingPlan["code"]) => {
    setBillingSaving(true);
    try {
      const response = await api<{ summary: BillingSummary }>("/api/admin/billing/change-plan", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({ planCode, cycle: billingCycle }),
      });
      setBilling(response.summary);
      toast.success(`Plan switched to ${planCode.toUpperCase()}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de changer de plan.");
    } finally {
      setBillingSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="gradient-card rounded-2xl border border-border p-6 space-y-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
          <div className="gradient-card rounded-2xl border border-border p-6 space-y-4">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }
  if (!user || !["admin", "super_admin"].includes(user.role)) return <Layout><div className="container py-24 text-center">Acces refuse.</div></Layout>;
  if (!overview) return null;

  const filteredUsers = [...overview.users]
    .filter((member) => userArenaFilter === "all" || member.arena_name === userArenaFilter)
    .sort((a, b) => {
      const arenaA = (a.arena_name ?? "").toLowerCase();
      const arenaB = (b.arena_name ?? "").toLowerCase();
      if (arenaA !== arenaB) return arenaA.localeCompare(arenaB);
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });
  const filteredCourts = overview.courts.filter((court) => courtArenaFilter === "all" || court.arena_name === courtArenaFilter);
  const filteredReservations = reservations.filter(r => reservationArenaFilter === "all" || r.arena_name === reservationArenaFilter);

  return (
    <Layout>
      <div className="container py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-display font-bold text-gradient mb-2 uppercase tracking-tighter">Administration</h1>
          <p className="text-muted-foreground flex items-center gap-2 tracking-wide uppercase text-xs font-bold">
            <Shield className="text-primary" size={14} /> Panel de Gestion {user.role === "admin" ? `| ${user.arenaName}` : "| Super Admin"}
          </p>
        </header>

        {/* Dynamic Stats Overview */}
        {billing && (
          <div className="gradient-card rounded-2xl border border-primary/20 p-5 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Subscription</p>
                <p className="text-lg font-bold">
                  {billing.subscription.plan.name} <span className="text-xs text-muted-foreground">({billing.subscription.status})</span>
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Renewal: {billing.subscription.period.currentEnd ? new Date(billing.subscription.period.currentEnd).toLocaleDateString() : "--"}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
              <div className="rounded-lg border border-border p-3">Admins: <strong>{billing.usage.admins}/{billing.limits.admins}</strong></div>
              <div className="rounded-lg border border-border p-3">Coaches: <strong>{billing.usage.coaches}/{billing.limits.coaches}</strong></div>
              <div className="rounded-lg border border-border p-3">Players: <strong>{billing.usage.players}/{billing.limits.players}</strong></div>
            </div>
            {billingPlans.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Plan Controls</p>
                  <select
                    value={billingCycle}
                    onChange={(event) => setBillingCycle(event.target.value as "monthly" | "yearly")}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-xs"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {billingPlans.map((plan) => {
                    const current = billing.subscription.plan.code === plan.code;
                    const price = billingCycle === "monthly" ? plan.prices.monthlyCents : plan.prices.yearlyCents;
                    return (
                      <div key={plan.code} className={`rounded-xl border p-3 ${current ? "border-primary/50 bg-primary/5" : "border-border"}`}>
                        <p className="font-bold">{plan.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${(price / 100).toFixed(0)}/{billingCycle === "monthly" ? "mo" : "yr"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {plan.limits.admins} admin, {plan.limits.coaches} coach, {plan.limits.players} players
                        </p>
                        <Button
                          size="sm"
                          className="w-full mt-3"
                          variant={current ? "secondary" : "outline"}
                          disabled={current || billingSaving}
                          onClick={() => void handleChangePlan(plan.code)}
                        >
                          {current ? "Current Plan" : "Switch Plan"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {[
            { label: "Joueurs Actifs", value: overview.stats.users, icon: Users, color: "text-blue-400" },
            { label: "Tournois Ouverts", value: overview.stats.activeCompetitions, icon: Trophy, color: "text-yellow-400" },
            { label: "Inscriptions", value: overview.stats.totalRegistrations, icon: CheckCircle, color: "text-green-400" },
            { label: "Matchs (7j)", value: overview.stats.matchesThisWeek, icon: Activity, color: "text-primary" },
          ].map((stat, i) => (
            <div key={i} className="gradient-card rounded-2xl border border-border p-6 shadow-lg hover:border-primary/20 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-muted/50 rounded-lg group-hover:bg-primary/10 transition-colors">
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
              <div className="text-3xl font-display font-bold mb-1">{stat.value}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-8 bg-muted/30 p-1.5 rounded-2xl border border-border w-fit font-bold uppercase text-xs tracking-widest">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted text-muted-foreground"}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <div className="gradient-card rounded-2xl border border-border p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-display uppercase tracking-tighter">Utilisateurs</h2>
              {user.role === "super_admin" && (
                <select value={userArenaFilter} onChange={(e) => setUserArenaFilter(e.target.value)} className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-widest">
                  <option value="all">{t("auth.allArenas")}</option>
                  {overview.arenas.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 uppercase text-xs font-bold tracking-widest">
                    <th className="text-left px-4 py-4 text-muted-foreground">Nom</th>
                    <th className="text-left px-4 py-4 text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-4 text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-4 text-muted-foreground">Arena</th>
                    <th className="text-left px-4 py-4 text-muted-foreground">Statut</th>
                    <th className="text-left px-4 py-4 text-muted-foreground">Creation</th>
                    <th className="text-left px-4 py-4 text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-medium">
                  {filteredUsers.map((member) => (
                    <tr key={member.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-4 font-semibold">{member.first_name} {member.last_name}</td>
                      <td className="px-4 py-4 text-muted-foreground">{member.email}</td>
                      <td className="px-4 py-4">
                        <span className="text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md bg-primary/10 text-primary">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">{member.arena_name ?? "N/A"}</td>
                      <td className="px-4 py-4">
                        <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md ${member.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{new Date(member.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        {member.id === user.id ? (
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Current account</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {member.status === "active" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                                disabled={saving}
                                onClick={() => void updateUserStatus(member.id, "inactive")}
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                                disabled={saving}
                                onClick={() => void updateUserStatus(member.id, "active")}
                              >
                                Reactivate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                              disabled={saving}
                              onClick={() => void removeUser(member.id, `${member.first_name} ${member.last_name}`)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!filteredUsers.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Aucun utilisateur pour ce filtre.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "courts" && (
          <div className="gradient-card rounded-2xl border border-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-display uppercase tracking-tighter">Terrains</h2>
              {user.role === "super_admin" && (
                <select value={courtArenaFilter} onChange={(e) => setCourtArenaFilter(e.target.value)} className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-widest">
                  <option value="all">{t("auth.allArenas")}</option>
                  {overview.arenas.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourts.map((court) => (
                <div key={court.id} className="rounded-xl border border-border p-4 bg-muted/10">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-semibold">{court.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{court.arena_name}</p>
                    </div>
                    <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md ${court.status === "available" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {court.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">{court.has_summa ? "SUMMA active" : "SUMMA desactive"}</p>
                </div>
              ))}
              {!filteredCourts.length && <p className="text-sm text-muted-foreground">Aucun terrain pour ce filtre.</p>}
            </div>
          </div>
        )}

        {activeTab === "reservations" && (
          <div className="gradient-card rounded-2xl border border-border p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-display uppercase tracking-tighter">Reservations en cours</h2>
              {user.role === "super_admin" && (
                <select value={reservationArenaFilter} onChange={(e) => setReservationArenaFilter(e.target.value)} className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-widest">
                  <option value="all">{t("auth.allArenas")}</option>
                  {overview.arenas.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 uppercase text-xs font-bold tracking-widest">
                    <th className="text-left px-4 py-4 text-muted-foreground">Date / Heure</th>
                    <th className="text-left px-4 py-4 text-muted-foreground">Infos Terrain</th>
                    <th className="text-left px-4 py-4 text-muted-foreground">Proprietaire</th>
                    <th className="text-left px-4 py-4 text-muted-foreground">Statut</th>
                    <th className="text-left px-4 py-4 text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-medium">
                  {filteredReservations.map((res) => (
                    <tr key={res.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-4"><div className="font-bold">{res.reservation_date}</div><div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock size={12} /> {res.start_time} - {res.end_time}</div></td>
                      <td className="px-4 py-4">
                        <div>{res.court_name}</div>
                        <div className="text-xs text-muted-foreground">{res.arena_name}</div>
                        <div className="text-[10px] font-mono text-primary mt-1">#{res.id} | {res.special_code ?? "N/A"}</div>
                      </td>
                      <td className="px-4 py-4"><div>{res.owner_name}</div><div className="text-xs text-muted-foreground truncate max-w-[150px]">{res.owner_email}</div></td>
                      <td className="px-4 py-4">
                        <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-md ${res.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : res.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          {res.status === 'confirmed' && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs font-bold border-primary/20 text-primary hover:bg-primary/10" onClick={() => setScoreForm({ id: res.id, s1: ["", "", ""], s2: ["", "", ""] })}>Saisir Score</Button>
                              <Button size="sm" variant="outline" className="text-xs font-bold border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => updateReservationStatus(res.id, "cancelled")}>Annuler</Button>
                            </>
                          )}
                          {res.status === 'completed' && <span className="text-xs text-muted-foreground italic flex items-center gap-1"><CheckCircle size={12} /> Match fini</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 rounded-xl border border-border p-4 bg-muted/10">
              <p className="text-sm font-bold mb-3">Verifier un ticket PDF (code special)</p>
              <div className="grid md:grid-cols-[140px,1fr,auto] gap-3">
                <Input
                  placeholder="Reservation ID"
                  value={verifyReservationId}
                  onChange={(event) => setVerifyReservationId(event.target.value)}
                />
                <Input
                  placeholder="Signature code"
                  value={verifySignature}
                  onChange={(event) => setVerifySignature(event.target.value)}
                />
                <Button variant="outline" onClick={() => void verifyTicket()}>Verifier</Button>
              </div>
              {verifyResult && (
                <div className="mt-3 space-y-2">
                  <p className={`text-xs ${verifyResult.valid ? "text-green-400" : "text-red-400"}`}>
                    {verifyResult.valid ? "Signature valide." : `Signature invalide.${verifyResult.reason ? ` (${verifyResult.reason})` : ""}`}
                  </p>
                  {verifyResult.details && (
                    <div className="rounded-lg border border-border bg-background/40 p-3 text-xs">
                      <p><strong>Reservation:</strong> {verifyResult.details.courtName} ({verifyResult.details.arenaName})</p>
                      <p><strong>Date:</strong> {verifyResult.details.reservationDate} | {verifyResult.details.startTime} - {verifyResult.details.endTime}</p>
                      <p><strong>Owner:</strong> {verifyResult.details.ownerName}</p>
                      <p><strong>Status:</strong> {verifyResult.details.status}</p>
                      <p className="font-mono text-primary"><strong>Special code:</strong> {verifyResult.details.specialCode}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "competitions" && (
          <div className="gradient-card rounded-2xl border border-border p-6">
            <h2 className="text-xl font-bold font-display uppercase tracking-tighter mb-6">Competitions</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Tournois ouverts</p>
                <p className="text-3xl font-display font-bold mt-2">{overview.stats.activeCompetitions}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Inscriptions</p>
                <p className="text-3xl font-display font-bold mt-2">{overview.stats.totalRegistrations}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Matchs (7j)</p>
                <p className="text-3xl font-display font-bold mt-2">{overview.stats.matchesThisWeek}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="gradient-card rounded-2xl border border-border p-6">
            <h2 className="text-xl font-bold font-display uppercase tracking-tighter mb-6">Logs & Activite</h2>
            <div className="space-y-3">
              {overview.logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-border p-4 bg-muted/10">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-semibold">{log.action}</p>
                      <p className="text-sm text-muted-foreground mt-1">{log.detail}</p>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{log.actor_name} {log.arena_name ? `| ${log.arena_name}` : ""}</p>
                </div>
              ))}
              {!overview.logs.length && <p className="text-sm text-muted-foreground">Aucun log disponible.</p>}
            </div>
          </div>
        )}

        {/* Score Entry Overlay */}
        {scoreForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="gradient-card border border-primary/30 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-display font-bold uppercase tracking-tighter">Resultats du Match</h3>
                <button onClick={() => setScoreForm(null)} className="p-2 hover:bg-muted rounded-full"><X size={20} /></button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4 items-center">
                  <div className="text-xs font-bold uppercase text-muted-foreground">Equipe 1</div>
                  {[0, 1, 2].map(i => (
                    <Input key={i} type="number" placeholder={`S${i+1}`} className="text-center font-bold" value={scoreForm.s1[i]} onChange={(e) => {
                      const n = [...scoreForm.s1]; n[i] = e.target.value; setScoreForm({ ...scoreForm, s1: n });
                    }} />
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-4 items-center">
                  <div className="text-xs font-bold uppercase text-muted-foreground">Equipe 2</div>
                  {[0, 1, 2].map(i => (
                    <Input key={i} type="number" placeholder={`S${i+1}`} className="text-center font-bold" value={scoreForm.s2[i]} onChange={(e) => {
                      const n = [...scoreForm.s2]; n[i] = e.target.value; setScoreForm({ ...scoreForm, s2: n });
                    }} />
                  ))}
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <Button size="lg" className="flex-1 glow-yellow h-12 font-bold" onClick={finalizeMatch} disabled={saving}>Valider les scores</Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 text-center uppercase tracking-widest leading-relaxed">Cette action va historiser le match et mettre a jour les classements ELO des joueurs.</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Admin;
