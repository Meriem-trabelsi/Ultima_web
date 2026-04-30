import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale";
import { MessageSquare, Calendar, Clock, Users, CreditCard, Loader2, Download, Smartphone, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/session";
import QRCode from "qrcode";

type RequestRow = {
  id: number;
  coachUserId: number;
  coachName: string;
  requestedDate: string;
  requestedStartTime: string;
  requestedEndTime: string;
  playersCount: number;
  status: string;
  paymentStatus: string;
  reservationId: number | null;
  coachReplyMessage: string | null;
  counterProposedDate: string | null;
  counterProposedStartTime: string | null;
  counterProposedEndTime: string | null;
  createdAt: string;
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending:          { label: "coachRequests.status.pending",          cls: "border-amber-300/30 bg-amber-300/12 text-amber-200" },
  accepted:         { label: "coachRequests.status.accepted",         cls: "border-emerald-300/30 bg-emerald-300/12 text-emerald-200" },
  rejected:         { label: "coachRequests.status.rejected",         cls: "border-red-300/30 bg-red-300/12 text-red-200" },
  counter_proposed: { label: "coachRequests.status.counter_proposed", cls: "border-sky-300/30 bg-sky-300/12 text-sky-200" },
};

// Per-request ticket QR component
const TicketQR = ({ reservationId }: { reservationId: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mobileUrl, setMobileUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api<{ url: string }>(`/api/reservations/${reservationId}/ticket-link`, { authenticated: true })
      .then((data) => setMobileUrl(data.url))
      .catch(() => {});
  }, [reservationId]);

  useEffect(() => {
    if (!mobileUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, mobileUrl, {
      width: 160,
      margin: 2,
      color: { dark: "#f5c842", light: "#0a0a0f" },
    }).catch(() => {});
  }, [mobileUrl]);

  const download = async () => {
    setDownloading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/reservations/${reservationId}/ticket.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const p = await res.json().catch(() => ({})); throw new Error(p.message ?? "Failed"); }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `coaching-session-${reservationId}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
      <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
        <CheckCircle size={15} /> Session confirmed &amp; paid
      </div>
      <Button className="glow-yellow gap-2 h-9 text-sm w-full sm:w-auto" onClick={download} disabled={downloading}>
        {downloading ? <><Loader2 className="animate-spin" size={14} /> Generating…</> : <><Download size={14} /> Download ticket PDF</>}
      </Button>
      {mobileUrl && (
        <div className="flex items-start gap-4 mt-2">
          <div className="rounded-xl overflow-hidden border border-primary/30 p-1.5 bg-[#0a0a0f] shrink-0"
            style={{ boxShadow: "0 0 16px hsl(var(--primary) / 0.15)" }}>
            <canvas ref={canvasRef} />
          </div>
          <div className="flex flex-col gap-1 justify-center">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground"><Smartphone size={13} /> Scan to download on phone</span>
            <span className="text-[11px] text-muted-foreground">Points your camera — PDF downloads directly.</span>
          </div>
        </div>
      )}
    </div>
  );
};

const CoachingRequests = () => {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);

  const handlePay = async (requestId: number) => {
    setPayingId(requestId);
    try {
      const data = await api<{ url: string }>(`/api/payments/coaching-request/${requestId}/checkout`, {
        method: "POST", authenticated: true,
      });
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to start payment.");
      setPayingId(null);
    }
  };

  useEffect(() => {
    api<{ requests: RequestRow[] }>("/api/player/coaching-requests", { authenticated: true })
      .then((data) => setRequests(data.requests ?? []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl border border-primary/25 bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("coachingRequests.title")}</h1>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="mb-6">{t("coachingRequests.empty")}</p>
            <Button onClick={() => navigate("/coaches")} className="rounded-xl glow-yellow">
              {t("coachingRequests.findCoach")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const sc = statusConfig[req.status] ?? { label: req.status, cls: "border-border bg-background/50 text-muted-foreground" };
              const isPaid = req.paymentStatus === "paid";
              return (
                <div
                  key={req.id}
                  className="rounded-xl border border-primary/20 bg-background/45 p-5 shadow-[0_18px_45px_hsl(var(--background)/0.32)] backdrop-blur-md"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-foreground">
                        {t("coachingRequests.to")}: <span className="text-primary">{req.coachName}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {req.requestedDate}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{req.requestedStartTime}–{req.requestedEndTime}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {req.playersCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${sc.cls} shrink-0`}>{t(sc.label)}</Badge>
                      {isPaid && <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shrink-0">Paid</Badge>}
                    </div>
                  </div>

                  {req.coachReplyMessage && (
                    <p className="mt-3 text-sm text-muted-foreground italic rounded-xl border border-border/40 bg-background/35 px-3 py-2">
                      "{req.coachReplyMessage}"
                    </p>
                  )}

                  {req.status === "counter_proposed" && req.counterProposedDate && (
                    <div className="mt-3 rounded-xl border border-sky-300/25 bg-sky-300/10 p-3 text-sm text-sky-100">
                      Counter-proposal: {req.counterProposedDate} · {req.counterProposedStartTime}–{req.counterProposedEndTime}
                    </div>
                  )}

                  {req.status === "accepted" && !isPaid && (
                    <div className="mt-4 pt-4 border-t border-border/40">
                      <Button
                        className="glow-yellow gap-2 h-9 text-sm"
                        onClick={() => handlePay(req.id)}
                        disabled={payingId === req.id}
                      >
                        {payingId === req.id
                          ? <><Loader2 className="animate-spin" size={14} /> Redirecting…</>
                          : <><CreditCard size={14} /> Pay &amp; confirm session</>}
                      </Button>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        You will be charged for the coach fee + court fee via Stripe.
                      </p>
                    </div>
                  )}

                  {isPaid && req.reservationId && (
                    <TicketQR reservationId={req.reservationId} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CoachingRequests;
