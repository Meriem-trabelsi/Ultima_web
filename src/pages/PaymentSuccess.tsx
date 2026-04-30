import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Loader2, Calendar, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getToken } from "@/lib/session";

type SessionStatus = "loading" | "paid" | "unpaid" | "error";

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const type = params.get("type"); // "reservation" | "coaching"
  const id = params.get("id");

  const [status, setStatus] = useState<SessionStatus>("loading");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!sessionId) { setStatus("paid"); return; }

    api<{ status: string }>(`/api/payments/session/${sessionId}`, { authenticated: true })
      .then((data) => setStatus(data.status === "paid" ? "paid" : "unpaid"))
      .catch(() => setStatus("paid")); // fallback: show success anyway (webhook handles state)
  }, [sessionId]);

  const downloadTicket = async () => {
    if (!id || type !== "reservation") return;
    setDownloading(true);
    try {
      const token = getToken();
      const response = await fetch(`/api/reservations/${id}/ticket.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const p = await response.json().catch(() => ({}));
        throw new Error(p.message ?? "Failed to download ticket.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ultima-reservation-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download ticket.");
    } finally {
      setDownloading(false);
    }
  };

  if (status === "loading") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-muted-foreground">Confirming your payment…</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-6"
          style={{ boxShadow: "0 0 40px hsl(142 71% 45% / 0.20)" }}>
          <CheckCircle className="text-green-400" size={40} />
        </div>

        <h1 className="text-3xl font-bold font-display text-foreground mb-2">Payment confirmed!</h1>
        <p className="text-muted-foreground mb-8">
          {type === "reservation"
            ? "Your court is booked. Download your ticket with QR code below."
            : "Your coaching session is confirmed. Your coach has been notified."}
        </p>

        <div className="gradient-card rounded-2xl border border-border p-6 space-y-4 text-left mb-8">
          {type === "reservation" && id && (
            <>
              <div className="flex items-center gap-3 text-sm text-muted-foreground border-b border-border pb-3">
                <Calendar size={16} className="text-primary shrink-0" />
                <span>Reservation #{id}</span>
              </div>
              <Button
                className="w-full glow-yellow h-11"
                onClick={downloadTicket}
                disabled={downloading}
              >
                {downloading
                  ? <><Loader2 className="animate-spin mr-2" size={16} /> Generating…</>
                  : <><Download className="mr-2" size={16} /> Download PDF + QR Code</>}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Your QR code is embedded in the PDF. Show it at the arena entrance.
              </p>
            </>
          )}
          {type === "coaching" && id && (
            <div className="text-sm text-muted-foreground text-center">
              <p className="mb-3">Your coach has been notified and the slot is blocked in their calendar.</p>
              <Button className="w-full" variant="outline" onClick={() => navigate("/coaching-requests")}>
                View my coaching requests
              </Button>
            </div>
          )}
        </div>

        <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => navigate("/")}>
          <ArrowLeft size={16} /> Back to home
        </Button>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;
