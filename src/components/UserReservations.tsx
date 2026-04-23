import { useEffect, useState } from "react";
import { format, parseISO, isAfter, addHours } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, MapPin, XCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionUser, getToken } from "@/lib/session";

type UserReservation = {
  id: number;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled";
  court_name: string;
  arena_name: string;
  sport: string;
};

function parseDateTimeSafe(datePart?: string, timePart?: string) {
  if (!datePart) return null;
  const raw = timePart ? `${datePart}T${timePart}` : datePart;
  const parsed = parseISO(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatReservationDateSafe(rawDate?: string) {
  const parsed = parseDateTimeSafe(rawDate);
  if (!parsed) return "--";
  return format(parsed, "EEEE d MMMM yyyy", { locale: fr });
}

const UserReservations = () => {
  const [reservations, setReservations] = useState<UserReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getSessionUser();

  const loadReservations = async () => {
    if (!user) return;
    try {
      const data = await api<{ reservations: UserReservation[] }>("/api/reservations", { authenticated: true });
      setReservations(data.reservations || []);
    } catch (error) {
      console.error("Failed to load reservations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReservations();
  }, []);

  const handleCancel = async (id: number) => {
    if (!window.confirm("Etes-vous sur de vouloir annuler cette reservation ?")) return;
    try {
      await api(`/api/reservations/${id}/cancel`, {
        method: "PATCH",
        authenticated: true,
      });
      toast.success("Reservation annulee avec succes");
      void loadReservations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'annulation");
    }
  };

  const handleDownloadTicket = async (id: number) => {
    try {
      const token = getToken();
      if (!token) {
        toast.error("Connectez-vous pour telecharger le ticket.");
        return;
      }
      const response = await fetch(`/api/reservations/${id}/ticket.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Impossible de telecharger le ticket.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ultima-reservation-${id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de telecharger le ticket.");
    }
  };

  if (!user) return null;
  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="gradient-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="py-12 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-display font-bold">Mes Reservations</h2>
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
          <Activity size={14} /> {reservations.length} Jeux
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="gradient-card rounded-2xl border border-border p-12 text-center">
          <Calendar className="mx-auto text-muted-foreground mb-4 opacity-20" size={48} />
          <p className="text-muted-foreground">Vous n'avez pas encore de reservations prevues.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reservations.map((res) => {
            const resStart = parseDateTimeSafe(res.reservation_date, res.start_time);
            const canCancel = Boolean(resStart) && isAfter(resStart, addHours(new Date(), 24)) && res.status !== "cancelled";

            return (
              <div
                key={res.id}
                className={`gradient-card rounded-2xl border border-border p-6 transition-all duration-300 hover:border-primary/30 ${res.status === "cancelled" ? "opacity-60 grayscale" : ""}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary">
                    <Calendar size={20} />
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
                      res.status === "confirmed" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {res.status === "confirmed" ? "Confirmee" : "Annulee"}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-1">{res.court_name}</h3>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <MapPin size={14} className="text-primary" /> {res.arena_name}
                  </div>
                  <div className="flex items-center text-sm text-foreground/80 gap-2">
                    <Calendar size={14} className="text-primary" />
                    {formatReservationDateSafe(res.reservation_date)}
                  </div>
                  <div className="flex items-center text-sm text-foreground/80 gap-2">
                    <Clock size={14} className="text-primary" />
                    {res.start_time?.slice(0, 5) || "--:--"} - {res.end_time?.slice(0, 5) || "--:--"}
                  </div>
                </div>

                {canCancel ? (
                  <div className="space-y-2">
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => void handleDownloadTicket(res.id)}>
                      Telecharger ticket PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
                      onClick={() => handleCancel(res.id)}
                    >
                      <XCircle size={16} className="mr-2" /> Annuler la reservation
                    </Button>
                  </div>
                ) : (
                  res.status !== "cancelled" && (
                    <div className="space-y-2">
                      <Button variant="secondary" size="sm" className="w-full" onClick={() => void handleDownloadTicket(res.id)}>
                        Telecharger ticket PDF
                      </Button>
                      <div className="text-[10px] text-center text-muted-foreground italic border-t border-border/50 pt-3">
                        Annulation possible jusqu'a 24h avant le debut
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default UserReservations;
