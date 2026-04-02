import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, QrCode, CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const courts = [
  { id: 1, name: "Terrain Padel A", type: "Padel", status: "available" },
  { id: 2, name: "Terrain Padel B", type: "Padel", status: "available" },
  { id: 3, name: "Terrain Tennis 1", type: "Tennis", status: "occupied" },
  { id: 4, name: "Terrain Tennis 2", type: "Tennis", status: "available" },
  { id: 5, name: "Terrain Padel C (SUMMA)", type: "Padel", status: "available" },
  { id: 6, name: "Terrain Tennis 3 (SUMMA)", type: "Tennis", status: "available" },
];

const timeSlots = ["08:00", "09:30", "11:00", "14:00", "15:30", "17:00", "18:30", "20:00"];

const steps = ["Terrain", "Date & Heure", "Confirmation", "QR Code"];

const Reservation = () => {
  const [step, setStep] = useState(0);
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const court = courts.find((c) => c.id === selectedCourt);

  const handleConfirm = () => {
    setStep(3);
    toast.success("Réservation confirmée !");
  };

  return (
    <Layout>
      <div className="container py-12">
        <h1 className="text-3xl font-display font-bold mb-2">Réservation de Terrains</h1>
        <p className="text-muted-foreground mb-8">Réservez votre terrain en quelques étapes simples</p>

        {/* Stepper */}
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

        {/* Step 0: Court selection */}
        {step === 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {courts.map((c) => (
              <button
                key={c.id}
                disabled={c.status === "occupied"}
                onClick={() => { setSelectedCourt(c.id); setStep(1); }}
                className={`gradient-card rounded-xl p-5 border text-left transition-all ${
                  c.status === "occupied"
                    ? "opacity-50 cursor-not-allowed border-border"
                    : "border-border hover:border-primary/40 cursor-pointer"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <MapPin className="text-primary" size={20} />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.status === "available" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {c.status === "available" ? "Disponible" : "Occupé"}
                  </span>
                </div>
                <h3 className="font-semibold mb-1">{c.name}</h3>
                <p className="text-sm text-muted-foreground">{c.type}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Date & Time */}
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
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Clock size={16} className="text-primary" /> Créneau horaire
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

        {/* Step 2: Confirmation */}
        {step === 2 && court && (
          <div className="max-w-lg gradient-card rounded-xl border border-border p-8 animate-fade-in">
            <h2 className="font-display text-xl font-bold mb-6">Récapitulatif</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Terrain</span>
                <span className="font-medium">{court.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{court.type}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{selectedDate}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Heure</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setStep(1)}>Modifier</Button>
              <Button onClick={handleConfirm} className="glow-yellow">Confirmer la réservation</Button>
            </div>
          </div>
        )}

        {/* Step 3: QR Code */}
        {step === 3 && court && (
          <div className="max-w-lg gradient-card rounded-xl border border-primary/20 p-8 text-center animate-fade-in">
            <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
            <h2 className="font-display text-xl font-bold mb-2">Réservation Confirmée !</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {court.name} • {selectedDate} à {selectedTime}
            </p>
            <div className="w-48 h-48 mx-auto bg-foreground/10 rounded-xl flex items-center justify-center border border-border mb-4">
              <QrCode className="text-primary" size={80} />
            </div>
            <p className="text-xs text-muted-foreground">Présentez ce QR code à l'entrée du terrain</p>
            <Button className="mt-6" onClick={() => { setStep(0); setSelectedCourt(null); setSelectedDate(""); setSelectedTime(""); }}>
              Nouvelle réservation
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reservation;
