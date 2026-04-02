import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, QrCode, CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

type Court = {
  id: number;
  name: string;
  sport: string;
  status: "available" | "occupied" | "maintenance";
  has_summa: number;
  location: string;
};

type ReservationResult = {
  id: number;
  court_name: string;
  sport: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  qr_token: string;
};

const timeSlots = ["08:00", "09:30", "11:00", "14:00", "15:30", "17:00", "18:30", "20:00"];
const steps = ["Terrain", "Date & Heure", "Confirmation", "QR Code"];

const addNinetyMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const total = hours * 60 + minutes + 90;
  const nextHours = String(Math.floor(total / 60)).padStart(2, "0");
  const nextMinutes = String(total % 60).padStart(2, "0");
  return `${nextHours}:${nextMinutes}`;
};

const todayDateString = () => new Date().toISOString().split("T")[0];

const Reservation = () => {
  const [step, setStep] = useState(0);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [confirmedReservation, setConfirmedReservation] = useState<ReservationResult | null>(null);

  useEffect(() => {
    const loadCourts = async () => {
      try {
        const result = await api<{ courts: Court[] }>("/api/courts");
        setCourts(result.courts);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de charger les terrains.");
      } finally {
        setLoading(false);
      }
    };

    void loadCourts();
  }, []);

  const court = useMemo(() => courts.find((c) => c.id === selectedCourt) ?? null, [courts, selectedCourt]);

  const handleConfirm = async () => {
    const user = getSessionUser();
    if (!user) {
      toast.error("Connectez-vous pour confirmer une reservation.");
      return;
    }

    if (!selectedCourt || !selectedDate || !selectedTime) {
      toast.error("Choisissez un terrain, une date et un creneau.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api<{ reservation: ReservationResult }>("/api/reservations", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({
          courtId: selectedCourt,
          reservationDate: selectedDate,
          startTime: selectedTime,
          endTime: addNinetyMinutes(selectedTime),
        }),
      });

      setConfirmedReservation(result.reservation);
      setStep(3);
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
    setSelectedDate("");
    setSelectedTime("");
    setConfirmedReservation(null);
  };

  return (
    <Layout>
      <div className="container py-12">
        <h1 className="text-3xl font-display font-bold mb-2">Reservation de Terrains</h1>
        <p className="text-muted-foreground mb-8">Reservez votre terrain en quelques etapes simples</p>

        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span className={`text-sm whitespace-nowrap ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < steps.length - 1 && <ArrowRight size={16} className="text-muted-foreground mx-1 shrink-0" />}
            </div>
          ))}
        </div>

        {loading && <div className="text-sm text-muted-foreground">Chargement des terrains...</div>}

        {!loading && step === 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {courts.map((c) => (
              <button
                key={c.id}
                disabled={c.status !== "available"}
                onClick={() => {
                  setSelectedCourt(c.id);
                  setStep(1);
                }}
                className={`gradient-card rounded-xl p-5 border text-left transition-all ${
                  c.status !== "available"
                    ? "opacity-50 cursor-not-allowed border-border"
                    : "border-border hover:border-primary/40 cursor-pointer"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <MapPin className="text-primary" size={20} />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.status === "available" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {c.status === "available" ? "Disponible" : "Indisponible"}
                  </span>
                </div>
                <h3 className="font-semibold mb-1">{c.name}</h3>
                <p className="text-sm text-muted-foreground">{c.sport} - {c.location}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="max-w-lg animate-fade-in space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Calendar size={16} className="text-primary" /> Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={todayDateString()}
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Clock size={16} className="text-primary" /> Creneau horaire
              </label>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={`rounded-lg border py-2 text-sm font-medium transition-all ${
                      selectedTime === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/30 text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)}>Retour</Button>
              <Button onClick={() => selectedDate && selectedTime && setStep(2)} disabled={!selectedDate || !selectedTime} className="glow-yellow">
                Continuer <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && court && (
          <div className="max-w-lg gradient-card rounded-xl border border-border p-8 animate-fade-in">
            <h2 className="font-display text-xl font-bold mb-6">Recapitulatif</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Terrain</span>
                <span className="font-medium">{court.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{court.sport}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{selectedDate}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Heure</span>
                <span className="font-medium">{selectedTime} - {addNinetyMinutes(selectedTime)}</span>
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
          <div className="max-w-lg gradient-card rounded-xl border border-primary/20 p-8 text-center animate-fade-in">
            <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
            <h2 className="font-display text-xl font-bold mb-2">Reservation confirmee!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {confirmedReservation.court_name} - {confirmedReservation.reservation_date} a {confirmedReservation.start_time}
            </p>
            <div className="w-48 h-48 mx-auto bg-foreground/10 rounded-xl flex flex-col items-center justify-center border border-border mb-4 gap-3">
              <QrCode className="text-primary" size={80} />
              <span className="text-xs text-muted-foreground px-4 break-all">{confirmedReservation.qr_token}</span>
            </div>
            <p className="text-xs text-muted-foreground">Presentez ce code a l'entree du terrain</p>
            <Button className="mt-6" onClick={resetFlow}>
              Nouvelle reservation
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reservation;
