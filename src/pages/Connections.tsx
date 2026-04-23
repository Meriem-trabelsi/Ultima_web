import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { toast } from "sonner";
import { Link2, UserPlus2, BellRing, ShieldCheck } from "lucide-react";

type Coach = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type Relationship = {
  id: number;
  coachUserId: number;
  coachName: string | null;
  playerUserId: number;
  playerName: string | null;
  status: "pending" | "active" | "paused" | "ended" | "rejected";
  permissions: {
    canViewPerformance: boolean;
    canViewReservations: boolean;
    canScheduleSessions: boolean;
    canViewNotes: boolean;
  };
  startDate: string;
  endDate: string | null;
  reminder?: string;
};

const Connections = () => {
  const user = getSessionUser();
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [reminders, setReminders] = useState<Relationship[]>([]);
  const [saving, setSaving] = useState(false);

  const [requestForm, setRequestForm] = useState({
    coachUserId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    notes: "",
    canViewPerformance: true,
    canViewReservations: true,
    canScheduleSessions: true,
    canViewNotes: false,
  });

  const isPlayer = user?.role === "player";
  const isCoachLike = !!user && ["coach", "admin", "super_admin"].includes(user.role);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [relationshipsResult, remindersResult] = await Promise.all([
        api<{ relationships: Relationship[] }>("/api/coach-links/my", { authenticated: true }),
        api<{ reminders: Relationship[] }>("/api/coach-links/reminders?days=14", { authenticated: true }),
      ]);
      setRelationships(relationshipsResult.relationships);
      setReminders(remindersResult.reminders);

      if (isPlayer) {
        const coachesResult = await api<{ coaches: Coach[] }>("/api/coach-links/coaches", { authenticated: true });
        setCoaches(coachesResult.coaches);
        setRequestForm((current) => ({
          ...current,
          coachUserId: current.coachUserId || String(coachesResult.coaches[0]?.id ?? ""),
        }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load connections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.id, user?.role]);

  const incomingPending = useMemo(
    () => relationships.filter((link) => link.status === "pending" && user && link.coachUserId === user.id),
    [relationships, user?.id]
  );

  const myLinks = useMemo(() => {
    return relationships.filter((link) => user && (link.coachUserId === user.id || link.playerUserId === user.id));
  }, [relationships, user?.id]);

  const requestCoach = async () => {
    if (!isPlayer) return;
    if (!requestForm.coachUserId) {
      toast.error("Choose a coach first.");
      return;
    }
    setSaving(true);
    try {
      await api<{ relationship: Relationship }>("/api/coach-links/request", {
        method: "POST",
        authenticated: true,
        body: {
          coachUserId: Number(requestForm.coachUserId),
          startDate: requestForm.startDate,
          endDate: requestForm.endDate || null,
          notes: requestForm.notes,
          permissions: {
            canViewPerformance: requestForm.canViewPerformance,
            canViewReservations: requestForm.canViewReservations,
            canScheduleSessions: requestForm.canScheduleSessions,
            canViewNotes: requestForm.canViewNotes,
          },
          consentVersion: 1,
        },
      });
      toast.success("Coach request sent.");
      setRequestForm((current) => ({ ...current, notes: "" }));
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send request.");
    } finally {
      setSaving(false);
    }
  };

  const respondRequest = async (relationshipId: number, decision: "accept" | "reject") => {
    setSaving(true);
    try {
      await api(`/api/coach-links/${relationshipId}/respond`, {
        method: "PATCH",
        authenticated: true,
        body: { decision },
      });
      toast.success(decision === "accept" ? "Request accepted." : "Request rejected.");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update request.");
    } finally {
      setSaving(false);
    }
  };

  const updateRelationshipStatus = async (relationshipId: number, status: "active" | "paused" | "ended") => {
    setSaving(true);
    try {
      await api(`/api/coach-links/${relationshipId}`, {
        method: "PATCH",
        authenticated: true,
        body: { status },
      });
      toast.success("Relationship updated.");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update relationship.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h1 className="text-3xl font-display font-bold mb-2">Connections</h1>
          <p className="text-muted-foreground">Please sign in to manage coach-player links.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12 space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl font-display font-bold text-gradient uppercase tracking-tighter flex items-center gap-3">
            <Link2 size={28} className="text-primary" /> Connections
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Manage who coaches whom, approve requests, and keep permissions clear. Nothing here changes your match flow unless you explicitly update a relationship.
          </p>
        </header>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="gradient-card rounded-2xl border border-border p-6 space-y-3">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-10 w-40 rounded-md" />
            </div>
            <div className="gradient-card rounded-2xl border border-border p-6 space-y-3">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            {isPlayer && (
              <section className="gradient-card rounded-2xl border border-primary/30 p-6 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><UserPlus2 size={18} className="text-primary" /> Request a Coach</h2>
                <p className="text-sm text-muted-foreground">Choose a coach and set exactly what data they can access.</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Coach</p>
                    <select
                      value={requestForm.coachUserId}
                      onChange={(event) => setRequestForm((current) => ({ ...current, coachUserId: event.target.value }))}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      {coaches.map((coach) => (
                        <option key={coach.id} value={coach.id}>
                          {coach.firstName} {coach.lastName} ({coach.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Start</p>
                      <Input type="date" value={requestForm.startDate} onChange={(event) => setRequestForm((current) => ({ ...current, startDate: event.target.value }))} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">End (optional)</p>
                      <Input type="date" value={requestForm.endDate} onChange={(event) => setRequestForm((current) => ({ ...current, endDate: event.target.value }))} />
                    </div>
                  </div>
                </div>
                <Input
                  placeholder="Optional note for the coach..."
                  value={requestForm.notes}
                  onChange={(event) => setRequestForm((current) => ({ ...current, notes: event.target.value }))}
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                  <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <input type="checkbox" checked={requestForm.canViewPerformance} onChange={(event) => setRequestForm((current) => ({ ...current, canViewPerformance: event.target.checked }))} />
                    Performance
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <input type="checkbox" checked={requestForm.canViewReservations} onChange={(event) => setRequestForm((current) => ({ ...current, canViewReservations: event.target.checked }))} />
                    Reservations
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <input type="checkbox" checked={requestForm.canScheduleSessions} onChange={(event) => setRequestForm((current) => ({ ...current, canScheduleSessions: event.target.checked }))} />
                    Session scheduling
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <input type="checkbox" checked={requestForm.canViewNotes} onChange={(event) => setRequestForm((current) => ({ ...current, canViewNotes: event.target.checked }))} />
                    Notes
                  </label>
                </div>
                <Button className="glow-yellow" onClick={() => void requestCoach()} disabled={saving || !requestForm.coachUserId}>
                  Send coach request
                </Button>
              </section>
            )}

            {isCoachLike && incomingPending.length > 0 && (
              <section className="gradient-card rounded-2xl border border-yellow-400/30 p-6 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck size={18} className="text-yellow-400" /> Pending Requests</h2>
                <div className="space-y-3">
                  {incomingPending.map((request) => (
                    <div key={request.id} className="rounded-xl border border-border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                          <p className="font-semibold">{request.playerName} {"->"} {request.coachName}</p>
                        <p className="text-xs text-muted-foreground">Starts {request.startDate}{request.endDate ? ` | Ends ${request.endDate}` : ""}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => void respondRequest(request.id, "accept")} disabled={saving}>Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => void respondRequest(request.id, "reject")} disabled={saving}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="gradient-card rounded-2xl border border-border p-6 space-y-4">
              <h2 className="text-xl font-bold">My Active & Past Links</h2>
              <p className="text-sm text-muted-foreground">Pause or end relationships without deleting history.</p>
              <div className="space-y-3">
                {myLinks.map((link) => {
                  const mineAsCoach = user.id === link.coachUserId;
                  const counterpart = mineAsCoach ? link.playerName : link.coachName;
                  return (
                    <div key={link.id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="font-semibold">{mineAsCoach ? `Player: ${counterpart}` : `Coach: ${counterpart}`}</p>
                          <p className="text-xs text-muted-foreground">
                            Status: {link.status.toUpperCase()} | {link.startDate}{link.endDate ? ` -> ${link.endDate}` : ""}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Permissions: {[
                            link.permissions.canViewPerformance ? "Perf" : null,
                            link.permissions.canViewReservations ? "Resa" : null,
                            link.permissions.canScheduleSessions ? "Schedule" : null,
                            link.permissions.canViewNotes ? "Notes" : null,
                          ].filter(Boolean).join(", ") || "None"}
                        </div>
                      </div>
                      {link.status === "active" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" onClick={() => void updateRelationshipStatus(link.id, "paused")} disabled={saving}>Pause</Button>
                          <Button size="sm" variant="outline" onClick={() => void updateRelationshipStatus(link.id, "ended")} disabled={saving}>End</Button>
                        </div>
                      )}
                      {link.status === "paused" && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" onClick={() => void updateRelationshipStatus(link.id, "active")} disabled={saving}>Reactivate</Button>
                          <Button size="sm" variant="outline" onClick={() => void updateRelationshipStatus(link.id, "ended")} disabled={saving}>End</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!myLinks.length && (
                  <p className="text-sm text-muted-foreground">No relationships yet. Players can send requests from this page.</p>
                )}
              </div>
            </section>

            <section className="gradient-card rounded-2xl border border-border p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><BellRing size={18} className="text-primary" /> Expiry Reminders</h2>
              <div className="space-y-2">
                {reminders.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                    {item.coachName} <span className="text-muted-foreground">and</span> {item.playerName}: <span className="text-primary">{item.reminder ?? "Expiring soon"}</span>
                  </div>
                ))}
                {!reminders.length && <p className="text-sm text-muted-foreground">No relationships expiring in the next 14 days.</p>}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Connections;
