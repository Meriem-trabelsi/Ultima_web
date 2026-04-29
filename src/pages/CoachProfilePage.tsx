import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/i18n/locale";
import { toast } from "sonner";
import {
  Award, Clock, Globe, ChevronLeft, Calendar, Users,
  CheckCircle, ShieldCheck, MapPin, Star,
} from "lucide-react";

type CoachProfile = {
  userId: number;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  headline: string | null;
  bio: string | null;
  expertise: string[];
  qualities: string[];
  certifications: string[];
  previousWorkplaces: string[];
  languages: string[];
  yearsExperience: number | null;
  hourlyRate: number | null;
  currency: string;
  isVerified: boolean;
  arenaName: string | null;
};

type Slot = { start: string; end: string };

const todayStr = () => new Date().toISOString().split("T")[0];

// ── Skeleton ──────────────────────────────────────────────────────────────────
const ProfileSkeleton = () => (
  <Layout>
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  </Layout>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const CoachProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [playersCount, setPlayersCount] = useState(1);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<{ profile: CoachProfile }>(`/api/player/coaches/${id}`, { authenticated: true })
      .then((data) => setProfile(data.profile))
      .catch(() => navigate("/coaches"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    api<{ slots: Slot[] }>(`/api/player/coaches/${id}/slots?date=${date}`, { authenticated: true })
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [id, date]);

  const handleRequest = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      await api("/api/player/coaching-requests", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({
          coachUserId: Number(id),
          requestedDate: date,
          requestedStartTime: selectedSlot.start,
          requestedEndTime: selectedSlot.end,
          playersCount,
          message: message || undefined,
        }),
      });
      toast.success(t("coachProfile.requestForm.success"));
      setSelectedSlot(null);
      setMessage("");
    } catch (err: any) {
      toast.error(err?.message ?? "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ProfileSkeleton />;
  if (!profile) return null;

  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  return (
    <Layout>
      {/* ── Hero header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border/40 bg-background">
        <div className="max-w-4xl mx-auto px-4 pt-6 pb-8">
          {/* Back link */}
          <button
            onClick={() => navigate("/coaches")}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {t("coaches.title")}
          </button>

          {/* Profile header */}
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl border border-border/60 overflow-hidden bg-muted shadow-md shrink-0">
              {profile.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {profile.firstName} {profile.lastName}
                </h1>
                {profile.isVerified && (
                  <Badge className="border-0 bg-primary/10 text-primary text-xs gap-1">
                    <ShieldCheck className="w-3 h-3" /> {t("coaches.card.verified")}
                  </Badge>
                )}
              </div>

              {profile.headline && (
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  {profile.headline}
                </p>
              )}

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                {profile.arenaName && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" /> {profile.arenaName}
                  </span>
                )}
                {profile.yearsExperience != null && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {profile.yearsExperience} {t("coaches.card.experience")}
                  </span>
                )}
                {profile.hourlyRate != null && (
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Star className="w-3.5 h-3.5 text-primary shrink-0" />
                    {profile.hourlyRate} {profile.currency}{t("coaches.card.rate")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: profile details ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-7">

          {/* About */}
          {profile.bio && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {t("coachProfile.about")}
              </h2>
              <p className="text-foreground/90 text-sm leading-relaxed">{profile.bio}</p>
            </section>
          )}

          {/* Expertise */}
          {profile.expertise.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {t("coachProfile.expertise")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.expertise.map((e) => (
                  <Badge key={e} variant="secondary" className="rounded-full text-xs px-3 py-1">
                    {e}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Qualities */}
          {profile.qualities?.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {t("coachProfile.qualities")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.qualities.map((q) => (
                  <Badge key={q} variant="outline" className="rounded-full text-xs px-3 py-1">
                    {q}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {profile.certifications?.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {t("coachProfile.certifications")}
              </h2>
              <ul className="space-y-1.5">
                {profile.certifications.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-sm text-foreground/90">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" /> {c}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Previous workplaces */}
          {profile.previousWorkplaces?.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {t("coachProfile.workplaces")}
              </h2>
              <ul className="space-y-1.5">
                {profile.previousWorkplaces.map((w) => (
                  <li key={w} className="flex items-center gap-2 text-sm text-foreground/90">
                    <Award className="w-4 h-4 text-muted-foreground shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Languages */}
          {profile.languages?.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> {t("coachProfile.languages")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((l) => (
                  <Badge key={l} variant="outline" className="rounded-full text-xs px-3 py-1">
                    {l}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right: booking panel ──────────────────────────────────────────── */}
        <div>
          <div className="rounded-2xl border border-border/40 bg-card p-5 sticky top-20">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {t("coachProfile.book")}
            </h2>

            {/* Date picker */}
            <label className="text-xs text-muted-foreground mb-1 block">
              {t("coachProfile.selectDate")}
            </label>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background text-foreground px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            {/* Slots */}
            <p className="text-xs text-muted-foreground mb-2">{t("coachProfile.availableSlots")}</p>

            {slotsLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-5">{t("coachProfile.noSlots")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    onClick={() => setSelectedSlot(selectedSlot?.start === s.start ? null : s)}
                    className={`text-xs py-2 rounded-xl border transition-all ${
                      selectedSlot?.start === s.start
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "border-border/50 text-foreground hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    {s.start}–{s.end}
                  </button>
                ))}
              </div>
            )}

            {/* Booking form (shows when slot selected) */}
            {selectedSlot && (
              <div className="space-y-3 border-t border-border/40 pt-4 mt-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {t("coachProfile.requestForm.players")}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPlayersCount(Math.max(1, playersCount - 1))}
                      className="w-8 h-8 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted text-foreground font-semibold"
                    >
                      −
                    </button>
                    <span className="font-semibold text-foreground w-4 text-center">{playersCount}</span>
                    <button
                      onClick={() => setPlayersCount(Math.min(2, playersCount + 1))}
                      className="w-8 h-8 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted text-foreground font-semibold"
                    >
                      +
                    </button>
                    <span className="text-xs text-muted-foreground">{t("coachProfile.maxPlayers")}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {t("coachProfile.requestForm.message")}
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="rounded-xl text-sm resize-none"
                    placeholder={t("coachProfile.requestForm.messagePlaceholder")}
                  />
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <Users className="inline w-3 h-3 mr-1" />
                  {t("coachProfile.confirmNotice")}
                </p>

                <Button
                  className="w-full rounded-xl h-10"
                  onClick={handleRequest}
                  disabled={submitting}
                >
                  {submitting ? "…" : t("coachProfile.requestForm.submit")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CoachProfilePage;
