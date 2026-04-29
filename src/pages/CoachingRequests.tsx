import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale";
import { MessageSquare, Calendar, Clock, Users } from "lucide-react";

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
  pending:          { label: "coachRequests.status.pending",          cls: "bg-yellow-100 text-yellow-700" },
  accepted:         { label: "coachRequests.status.accepted",         cls: "bg-green-100 text-green-700" },
  rejected:         { label: "coachRequests.status.rejected",         cls: "bg-red-100 text-red-500" },
  counter_proposed: { label: "coachRequests.status.counter_proposed", cls: "bg-blue-100 text-blue-700" },
};

const CoachingRequests = () => {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ requests: RequestRow[] }>("/api/player/coaching-requests", { authenticated: true })
      .then((data) => setRequests(data.requests ?? []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("coachingRequests.title")}</h1>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="mb-6">{t("coachingRequests.empty")}</p>
            <Button
              onClick={() => navigate("/coaches")}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              {t("coachingRequests.findCoach")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const sc = statusConfig[req.status] ?? { label: req.status, cls: "bg-gray-100 text-gray-600" };
              return (
                <div
                  key={req.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t("coachingRequests.to")}: <span className="text-green-600">{req.coachName}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
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
                    <Badge className={`${sc.cls} border-0 shrink-0`}>{t(sc.label)}</Badge>
                  </div>

                  {req.coachReplyMessage && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                      "{req.coachReplyMessage}"
                    </p>
                  )}

                  {req.status === "counter_proposed" && req.counterProposedDate && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-xl text-sm text-blue-700 dark:text-blue-300">
                      Counter-proposal: {req.counterProposedDate} · {req.counterProposedStartTime}–{req.counterProposedEndTime}
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
