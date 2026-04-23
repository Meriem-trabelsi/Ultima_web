import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale";

type Student = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  rankingScore: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
};

type Court = {
  id: number;
  name: string;
  sport: string;
  arena_name: string;
  min_players: number;
  max_players: number;
};

type CoachSession = {
  id: number;
  title: string;
  sessionType: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  status: string;
  court: { id: number; name: string; arenaName: string };
  students: Array<{ id: number; firstName: string; lastName: string; email: string }>;
};

type StudentStats = {
  student: { id: number; firstName: string; lastName: string; email: string };
  dashboard: { totalMatches: number; wins: number; losses: number; ranking: number; winRate: string; upcomingBookings: number };
};

const Coach = () => {
  const { t } = useLocale();
  const user = getSessionUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"students" | "sessions">("students");
  const [selectedStudent, setSelectedStudent] = useState<StudentStats | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    sessionType: "individual",
    reservationDate: "",
    startTime: "09:00",
    endTime: "10:30",
    courtId: "",
    focusAreas: "",
    notes: "",
    studentIds: [] as number[],
  });

  const loadData = async () => {
    try {
      const [studentsResult, sessionsResult, courtsResult] = await Promise.all([
        api<{ students: Student[] }>("/api/coach/students", { authenticated: true }),
        api<{ sessions: CoachSession[] }>("/api/coach/sessions", { authenticated: true }),
        api<{ courts: Court[] }>("/api/courts", { authenticated: true }),
      ]);
      setStudents(studentsResult.students);
      setSessions(sessionsResult.sessions);
      setCourts(courtsResult.courts);
      setForm((current) => ({
        ...current,
        courtId: current.courtId || String(courtsResult.courts[0]?.id ?? ""),
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les donnees coach.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const winRate = useMemo(() => {
    if (!students.length) return "0%";
    const wins = students.reduce((sum, student) => sum + student.wins, 0);
    const losses = students.reduce((sum, student) => sum + student.losses, 0);
    return wins + losses === 0 ? "0%" : `${Math.round((wins / (wins + losses)) * 100)}%`;
  }, [students]);

  const loadStudentStats = async (studentId: number) => {
    setStudentLoading(true);
    try {
      const result = await api<StudentStats>(`/api/coach/students/${studentId}/stats`, { authenticated: true });
      setSelectedStudent(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de charger les stats de l'etudiant.");
    } finally {
      setStudentLoading(false);
    }
  };

  const toggleStudent = (studentId: number) => {
    setForm((current) => {
      const exists = current.studentIds.includes(studentId);
      return {
        ...current,
        studentIds: exists ? current.studentIds.filter((id) => id !== studentId) : [...current.studentIds, studentId],
      };
    });
  };

  const scheduleSession = async () => {
    setSaving(true);
    try {
      await api<{ session: CoachSession }>("/api/coach/sessions", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({
          ...form,
          courtId: Number(form.courtId),
          studentIds: form.studentIds,
        }),
      });
      toast.success("Session programmee avec succes.");
      setForm((current) => ({
        ...current,
        title: "",
        focusAreas: "",
        notes: "",
        studentIds: [],
      }));
      await loadData();
      setActiveTab("sessions");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de programmer la session.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || !["coach", "admin", "super_admin"].includes(user.role)) {
    return (
      <Layout>
        <div className="container py-24 text-center">Acces reserve aux coachs.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12 space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl font-display font-bold text-gradient uppercase tracking-tighter">Coach Desk</h1>
          <p className="text-sm text-muted-foreground">Gerez vos etudiants et programmez des sessions d'entrainement avec reservation automatique.</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="gradient-card rounded-2xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Etudiants Actifs</p>
            <p className="text-3xl font-display font-bold mt-2">{students.length}</p>
          </div>
          <div className="gradient-card rounded-2xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Sessions Planifiees</p>
            <p className="text-3xl font-display font-bold mt-2">{sessions.filter((item) => item.status === "scheduled").length}</p>
          </div>
          <div className="gradient-card rounded-2xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Taux Global</p>
            <p className="text-3xl font-display font-bold mt-2">{winRate}</p>
          </div>
          <div className="gradient-card rounded-2xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Arene</p>
            <p className="text-lg font-bold mt-3">{user.arenaName ?? "N/A"}</p>
          </div>
        </div>

        <div className="flex gap-2 text-xs uppercase tracking-widest font-bold">
          <button
            type="button"
            className={`px-4 py-2 rounded-lg ${activeTab === "students" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            onClick={() => setActiveTab("students")}
          >
            Etudiants
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg ${activeTab === "sessions" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            onClick={() => setActiveTab("sessions")}
          >
            Sessions
          </button>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="gradient-card rounded-2xl p-6 space-y-4">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
              <div className="gradient-card rounded-2xl p-6 space-y-4">
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-5 w-2/3" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "students" && (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="gradient-card rounded-2xl p-6">
                  <h2 className="text-lg font-bold mb-4">Liste des etudiants</h2>
                  <div className="space-y-3 max-h-[480px] overflow-auto pr-2">
                    {students.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => void loadStudentStats(student.id)}
                        className="w-full text-left border border-border rounded-xl p-4 hover:border-primary/40 transition-colors"
                      >
                        <p className="font-semibold">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                        <div className="mt-3 flex gap-3 text-xs">
                          <span>Ranking: {student.rankingScore}</span>
                          <span>Matchs: {student.matchesPlayed}</span>
                          <span>W/L: {student.wins}/{student.losses}</span>
                        </div>
                      </button>
                    ))}
                    {!students.length && <p className="text-sm text-muted-foreground">Aucun etudiant actif dans cette arene.</p>}
                  </div>
                </div>

                <div className="gradient-card rounded-2xl p-6">
                  <h2 className="text-lg font-bold mb-4">Fiche etudiant</h2>
                  {studentLoading && (
                    <div className="space-y-3">
                      <Skeleton className="h-7 w-52" />
                      <Skeleton className="h-4 w-64" />
                      <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                      </div>
                    </div>
                  )}
                  {!studentLoading && !selectedStudent && (
                    <p className="text-sm text-muted-foreground">Selectionnez un etudiant pour voir ses statistiques detaillees.</p>
                  )}
                  {!studentLoading && selectedStudent && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xl font-bold">{selectedStudent.student.firstName} {selectedStudent.student.lastName}</p>
                        <p className="text-sm text-muted-foreground">{selectedStudent.student.email}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="border border-border rounded-lg p-3">Classement: <strong>{selectedStudent.dashboard.ranking}</strong></div>
                        <div className="border border-border rounded-lg p-3">Taux victoire: <strong>{selectedStudent.dashboard.winRate}</strong></div>
                        <div className="border border-border rounded-lg p-3">Matchs: <strong>{selectedStudent.dashboard.totalMatches}</strong></div>
                        <div className="border border-border rounded-lg p-3">Wins/Losses: <strong>{selectedStudent.dashboard.wins}/{selectedStudent.dashboard.losses}</strong></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "sessions" && (
              <div className="grid lg:grid-cols-[420px,1fr] gap-6">
                <div className="gradient-card rounded-2xl p-6 space-y-4">
                  <h2 className="text-lg font-bold">Programmer une session</h2>
                  <Input placeholder={t("coach.placeholder.sessionTitle")} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                  <select className="w-full rounded-lg border border-border bg-card px-3 py-2" value={form.sessionType} onChange={(event) => setForm((current) => ({ ...current, sessionType: event.target.value }))}>
                    <option value="individual">{t("coach.option.individual")}</option>
                    <option value="group">{t("coach.option.group")}</option>
                    <option value="match_practice">{t("coach.option.matchPractice")}</option>
                  </select>
                  <select className="w-full rounded-lg border border-border bg-card px-3 py-2" value={form.courtId} onChange={(event) => setForm((current) => ({ ...current, courtId: event.target.value }))}>
                    {courts.map((court) => (
                      <option key={court.id} value={court.id}>{court.name} ({court.arena_name})</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="date" value={form.reservationDate} onChange={(event) => setForm((current) => ({ ...current, reservationDate: event.target.value }))} />
                    <Input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
                    <Input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
                  </div>
                  <Input placeholder={t("coach.placeholder.focusAreas")} value={form.focusAreas} onChange={(event) => setForm((current) => ({ ...current, focusAreas: event.target.value }))} />
                  <Input placeholder={t("coach.placeholder.notes")} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />

                  <div className="space-y-2 max-h-44 overflow-auto border border-border rounded-lg p-2">
                    {students.map((student) => (
                      <label key={student.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-muted/40 cursor-pointer">
                        <input type="checkbox" checked={form.studentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                        <span>{student.firstName} {student.lastName}</span>
                      </label>
                    ))}
                  </div>

                  <Button onClick={() => void scheduleSession()} disabled={saving || !form.courtId || !form.reservationDate || !form.studentIds.length} className="w-full glow-yellow">
                    {saving ? "Programmation..." : "Programmer et reserver"}
                  </Button>
                </div>

                <div className="gradient-card rounded-2xl p-6">
                  <h2 className="text-lg font-bold mb-4">Sessions planifiees</h2>
                  <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
                    {sessions.map((session) => (
                      <div key={session.id} className="border border-border rounded-xl p-4">
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-semibold">{session.title}</p>
                            <p className="text-xs text-muted-foreground">{session.court.name} - {session.court.arenaName}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary uppercase tracking-widest">{session.status}</span>
                        </div>
                        <p className="text-sm mt-2">{session.reservationDate} | {session.startTime} - {session.endTime}</p>
                        <p className="text-xs text-muted-foreground mt-1">Type: {session.sessionType}</p>
                        <p className="text-xs mt-2 text-muted-foreground">
                          Etudiants: {session.students.map((student) => `${student.firstName} ${student.lastName}`).join(", ")}
                        </p>
                      </div>
                    ))}
                    {!sessions.length && <p className="text-sm text-muted-foreground">Aucune session programmee pour le moment.</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Coach;
