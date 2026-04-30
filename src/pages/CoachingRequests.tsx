import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale";
import { MessageSquare, Calendar, Clock, Users, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

type RequestRow = {
  id: number;
  coachUserId: number;
  coachName: string;
  requestedDate: string;
  requestedStartTime: string;
  requestedEndTime: string;
  playersCount: number;
  status: string;
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
            <Button
              onClick={() => navigate("/coaches")}
              className="rounded-xl glow-yellow"
            >
              {t("coachingRequests.findCoach")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const sc = statusConfig[req.status] ?? { label: req.status, cls: "border-border bg-background/50 text-muted-foreground" };
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
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {req.requestedDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {req.requestedStartTime}–{req.requestedEndTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {req.playersCount}
                        </span>
                      </div>
                    </div>
                    <Badge className={`${sc.cls} shrink-0`}>{t(sc.label)}</Badge>
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

                  {req.status === "accepted" && (
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
