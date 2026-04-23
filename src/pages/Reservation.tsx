import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, MapPin, QrCode, CheckCircle, ArrowRight, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionUser, SessionUser, getToken } from "@/lib/session";
import { useLocation } from "react-router-dom";
import UserReservations from "@/components/UserReservations";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale";

type Court = {
  id: number;
  name: string;
  sport: string;
  status: "available" | "occupied" | "maintenance";
  has_summa: number;
  location: string;
  arena_name: string;
  min_players: number;
  max_players: number;
};

type Availability = {
  reservationDate: string;
  openingTime: string;
  closingTime: string;
  slots: Array<{
    startTime: string;
    endTime: string;
    available: boolean;
  }>;
  reserved: Array<{
    startTime: string;
    endTime: string;
  }>;
};

type Participant = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

type ReservationResult = {
  id: number;
  court_name: string;
  sport: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  qr_token: string;
  participants: Participant[];
};

/* ── Canvas confetti hook ── */
function useConfetti(trigger: boolean) {
  useEffect(() => {
    if (!trigger) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;z-index:9999;pointer-events:none;width:100%;height:100%";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    const colors = ["#00E5FF", "#2C63BD", "#7ADFFF", "#FFFFFF", "#1D9FE8", "#A7ECFF", "#67D8FF"];
    type Particle = {
      x: number; y: number; vx: number; vy: number;
      color: string; w: number; h: number;
      alpha: number; rotation: number; rotV: number;
    };
    const particles: Particle[] = [];
    for (let i = 0; i < 130; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 300,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 16,
        vy: Math.random() * -14 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        w: Math.random() * 10 + 4,
        h: Math.random() * 5 + 3,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.25,
      });
    }
    let raf: number;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.vy += 0.38;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rotation += p.rotV;
        p.alpha -= 0.011;
        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }
      if (alive) raf = requestAnimationFrame(tick);
      else canvas.remove();
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); canvas.remove(); };
  }, [trigger]);
}

const steps = ["Terrain", "Planning & Joueurs", "Confirmation", "QR Code"];
const today = new Date();
today.setHours(0, 0, 0, 0);

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Reservation = () => {
  const { t } = useLocale();
  const [user, setUser] = useState<SessionUser | null>(null);
  const location = useLocation();

  useEffect(() => {
    setUser(getSessionUser());
  }, [location.pathname]);

  const [step, setStep] = useState(0);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [participantCount, setParticipantCount] = useState(2);
  const [participantEmails, setParticipantEmails] = useState(["", "", ""]);
  const [participantPreview, setParticipantPreview] = useState<Participant[]>([]);
  const [confirmedReservation, setConfirmedReservation] = useState<ReservationResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  useConfetti(showConfetti);

  useEffect(() => {
    const loadCourts = async () => {
      try {
        const result = await api<{ courts: Court[] }>("/api/courts", { authenticated: true });
        setCourts(result.courts);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de charger les terrains.");
      } finally {
        setLoading(false);
      }
    };

    void loadCourts();
  }, []);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedCourt || !selectedDate) {
        setAvailability(null);
        setSelectedTime("");
        return;
      }

      setLoadingAvailability(true);
      try {
        const result = await api<Availability>(`/api/courts/${selectedCourt}/availability?date=${toDateKey(selectedDate)}`, {
          authenticated: true,
        });
        setAvailability(result);
        setSelectedTime("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de charger les disponibilites.");
      } finally {
        setLoadingAvailability(false);
      }
    };

    void loadAvailability();
  }, [selectedCourt, selectedDate]);

  const court = useMemo(() => courts.find((item) => item.id === selectedCourt) ?? null, [courts, selectedCourt]);
  const selectedParticipants = participantEmails.slice(0, Math.max(0, participantCount - 1));

  const handleReview = async () => {
    if (!user) {
      toast.error("Connectez-vous pour continuer.");
      return;
    }

    if (!selectedCourt || !selectedDate || !selectedTime) {
      toast.error("Choisissez un terrain, une date et un creneau.");
      return;
    }

    if (!court) {
      toast.error("Terrain introuvable.");
      return;
    }

    const normalizedEmails = selectedParticipants.map((email) => email.trim().toLowerCase());
    if (normalizedEmails.some((email) => !email)) {
      toast.error("Renseignez tous les emails des participants.");
      return;
    }

    if (normalizedEmails.some((email) => email === user.email.toLowerCase())) {
      toast.error("Votre email est deja pris en compte automatiquement dans la reservation.");
      return;
    }

    if (new Set(normalizedEmails).size !== normalizedEmails.length) {
      toast.error("Le meme email ne peut pas etre utilise deux fois.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api<{ participants: Participant[] }>("/api/participants/lookup", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({ emails: normalizedEmails }),
      });

      if (result.participants.length !== normalizedEmails.length) {
        toast.error("Tous les participants doivent deja avoir un compte actif dans votre arena.");
        return;
      }

      setParticipantPreview([
        { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email },
        ...result.participants,
      ]);
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de verifier les participants.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCourt || !selectedDate || !selectedTime) {
      toast.error("Reservation incomplete.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedSlot = availability?.slots.find((slot) => slot.startTime === selectedTime);
      const result = await api<{ reservation: ReservationResult }>("/api/reservations", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({
          courtId: selectedCourt,
          reservationDate: toDateKey(selectedDate),
          startTime: selectedTime,
          endTime: selectedSlot?.endTime,
          participantEmails: selectedParticipants,
        }),
      });

      setConfirmedReservation(result.reservation);
      setStep(3);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
      toast.success("Reservation confirmee.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reservation impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setStep(0);
    setSelectedCourt(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setParticipantCount(2);
    setParticipantEmails(["", "", ""]);
    setParticipantPreview([]);
    setConfirmedReservation(null);
    setAvailability(null);
  };

  const downloadReservationTicket = async (reservationId: number) => {
    try {
      const token = getToken();
      if (!token) {
        toast.error("Connectez-vous pour telecharger le ticket.");
        return;
      }

      const response = await fetch(`/api/reservations/${reservationId}/ticket.pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Impossible de telecharger le ticket.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ultima-reservation-${reservationId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de telecharger le ticket.");
    }
  };

  return (
    <Layout>
      <div className="container py-12">
        <h1 className="text-3xl font-display font-bold mb-2">Reservation de Terrains</h1>
        <p className="text-muted-foreground mb-8">Choisissez votre arena, visualisez les heures reservees et ajoutez vos joueurs avant de confirmer.</p>

        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
          {steps.map((item, index) => (
            <div key={item} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                index <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {index < step ? <CheckCircle size={16} /> : index + 1}
              </div>
              <span className={`text-sm whitespace-nowrap ${index <= step ? "text-foreground" : "text-muted-foreground"}`}>{item}</span>
              {index < steps.length - 1 && <ArrowRight size={16} className="text-muted-foreground mx-1 shrink-0" />}
            </div>
          ))}
        </div>

        {loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="gradient-card rounded-xl border border-border p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loading && step === 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {courts.map((item) => (
              <button
                key={item.id}
                disabled={item.status !== "available"}
                onClick={() => {
                  setSelectedCourt(item.id);
                  setStep(1);
                }}
                className={`gradient-card rounded-xl p-5 border text-left transition-all ${
                  item.status !== "available"
                    ? "opacity-50 cursor-not-allowed border-border"
                    : "border-border hover:border-primary/40 cursor-pointer"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <MapPin className="text-primary" size={20} />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.status === "available" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {item.status === "available" ? "Disponible" : "Indisponible"}
                  </span>
                </div>
                <h3 className="font-semibold mb-1">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.sport} - {item.arena_name}</p>
                <p className="text-xs text-muted-foreground mt-2">Capacite: {item.min_players} a {item.max_players} joueurs</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && court && (
          <div className="grid lg:grid-cols-[340px,1fr] gap-6 animate-fade-in">
            <div className="gradient-card rounded-xl border border-border p-5 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Calendar size={16} className="text-primary" /> Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {selectedDate ? selectedDate.toLocaleDateString() : t("reservation.chooseDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DateCalendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < today}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Users size={16} className="text-primary" /> Nombre de joueurs
                </label>
                <select
                  value={participantCount}
                  onChange={(event) => setParticipantCount(Number(event.target.value))}
                  className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground"
                >
                  {Array.from({ length: court.max_players - court.min_players + 1 }, (_, index) => court.min_players + index).map((count) => (
                    <option key={count} value={count}>
                      {count} {t("reservation.playersSuffix")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Createur de la reservation</p>
                  <p className="text-xs text-muted-foreground">{user?.email ?? "Connectez-vous pour reserver"}</p>
                </div>
                {selectedParticipants.map((email, index) => (
                  <div key={index}>
                    <label className="text-sm font-medium">Participant {index + 2}</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        const next = [...participantEmails];
                        next[index] = event.target.value;
                        setParticipantEmails(next);
                      }}
                      placeholder={t("reservation.placeholder.participantEmail")}
                      className="mt-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="gradient-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-display text-xl font-bold">{court.name}</h2>
                  <p className="text-sm text-muted-foreground">{court.sport} - {court.arena_name}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{availability?.openingTime ?? "--:--"} - {availability?.closingTime ?? "--:--"}</div>
                  <div>Slots de 90 min</div>
                </div>
              </div>

              {!selectedDate && <p className="text-sm text-muted-foreground">Choisissez une date pour afficher les creneaux reserves et disponibles.</p>}
              {loadingAvailability && (
                <div className="grid sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-[76px] w-full rounded-lg" />
                  ))}
                </div>
              )}

              {availability && (
                <>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {availability.slots.map((slot) => (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.startTime)}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          !slot.available
                            ? "border-border opacity-50 cursor-not-allowed"
                            : selectedTime === slot.startTime
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                        <div className="text-xs text-muted-foreground">{slot.available ? "Disponible" : "Reserve"}</div>
                      </button>
                    ))}
                  </div>

                  {availability.reserved.length > 0 && (
                    <div className="mt-5">
                      <p className="text-sm font-medium mb-2">Heures deja reservees</p>
                      <div className="flex flex-wrap gap-2">
                        {availability.reserved.map((slot) => (
                          <span key={`${slot.startTime}-${slot.endTime}`} className="text-xs rounded-full bg-muted px-3 py-1 text-muted-foreground">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 mt-8">
                <Button variant="outline" onClick={() => setStep(0)}>Retour</Button>
                <Button onClick={handleReview} disabled={!selectedDate || !selectedTime || submitting} className="glow-yellow">
                  {submitting ? "Verification..." : "Verifier et continuer"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && court && (
          <div className="max-w-2xl gradient-card rounded-xl border border-border p-8 animate-fade-in">
            <h2 className="font-display text-xl font-bold mb-6">Recapitulatif</h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Terrain</span>
                  <span className="font-medium">{court.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Arena</span>
                  <span className="font-medium">{court.arena_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{selectedDate?.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Heure</span>
                  <span className="font-medium">
                    {availability?.slots.find((slot) => slot.startTime === selectedTime)?.startTime}
                    {" - "}
                    {availability?.slots.find((slot) => slot.startTime === selectedTime)?.endTime}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Participants verifies</p>
                <div className="space-y-2">
                  {participantPreview.map((participant) => (
                    <div key={participant.email} className="rounded-lg bg-muted/30 px-3 py-2">
                      <div className="font-medium">{participant.firstName} {participant.lastName}</div>
                      <div className="text-xs text-muted-foreground">{participant.email}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setStep(1)}>Modifier</Button>
              <Button onClick={handleConfirm} className="glow-yellow" disabled={submitting}>
                {submitting ? "Confirmation..." : "Confirmer la reservation"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && confirmedReservation && (
          <div
            className="max-w-lg gradient-card rounded-2xl border border-green-500/25 p-8 text-center animate-fade-in"
            style={{
              animation: "fade-in 0.5s ease, success-ring-glow 1.8s ease-out 2",
              boxShadow:
                "0 0 0 0 hsl(142 76% 55% / 0.4), 0 28px 55px hsl(245 40% 5% / 0.5)",
            }}
          >
            {/* Animated checkmark circle */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(142 72% 30% / 0.3)" strokeWidth="3" />
                <circle
                  cx="40" cy="40" r="36"
                  fill="none"
                  stroke="hsl(142 72% 50%)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="226"
                  strokeDashoffset="226"
                  style={{ animation: "draw-circle 0.7s ease forwards 0.1s" }}
                />
              </svg>
              <CheckCircle
                className="text-green-400 absolute inset-0 m-auto"
                size={34}
                style={{ animation: "fade-in 0.3s ease forwards 0.7s", opacity: 0 }}
              />
            </div>

            <h2 className="font-display text-2xl font-bold mb-1">Reservation confirmee!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              <span className="text-foreground font-medium">{confirmedReservation.court_name}</span>
              {" · "}
              {confirmedReservation.reservation_date}
              {" à "}
              {confirmedReservation.start_time}
            </p>

            <div className="w-56 h-56 mx-auto rounded-2xl flex flex-col items-center justify-center border border-primary/20 mb-5 gap-3 bg-foreground/5 backdrop-blur-sm p-3"
              style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.12)" }}>
              <QrCode className="text-primary/85" size={92} />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">QR in PDF ticket</span>
            </div>

            <p className="text-xs text-muted-foreground mb-8">
              {confirmedReservation.participants?.length ?? participantPreview.length} joueurs rattaches a cette reservation.
            </p>

            <div className="flex flex-col gap-3">
              <Button className="glow-yellow h-11" onClick={resetFlow}>
                Nouvelle reservation
              </Button>
              <Button variant="outline" className="h-11 border-primary/25" onClick={() => void downloadReservationTicket(confirmedReservation.id)}>
                Telecharger ticket PDF
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Le PDF contient un QR de verification + un code special admin.
              </p>
            </div>
          </div>
        )}

        {/* User's existing reservations list */}
        {user && (
          <div className="mt-20 border-t border-border pt-12">
            <UserReservations />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reservation;
