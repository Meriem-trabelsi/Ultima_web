import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale";
import { toast } from "sonner";
import { Plus, Trash2, Save, Calendar } from "lucide-react";

type Rule = { dayOfWeek: number; startTime: string; endTime: string; _idx?: number };
type Exception = {
  id?: number;
  exceptionDate: string;
  isAvailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

const DAY_KEYS = [
  "coachAvailability.days.0",
  "coachAvailability.days.1",
  "coachAvailability.days.2",
  "coachAvailability.days.3",
  "coachAvailability.days.4",
  "coachAvailability.days.5",
  "coachAvailability.days.6",
];

const todayStr = () => new Date().toISOString().split("T")[0];

const CoachAvailability = () => {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [newException, setNewException] = useState<Partial<Exception>>({
    exceptionDate: todayStr(),
    isAvailable: false,
    reason: "",
  });
  const [addingException, setAddingException] = useState(false);

  useEffect(() => {
    api<{ rules: any[]; exceptions: any[] }>("/api/coach/availability", { authenticated: true })
      .then((data) => {
        setRules(
          (data.rules ?? []).map((r: any) => ({
            dayOfWeek: r.day_of_week ?? r.dayOfWeek,
            startTime: r.start_time ?? r.startTime,
            endTime: r.end_time ?? r.endTime,
          }))
        );
        setExceptions(
          (data.exceptions ?? []).map((e: any) => ({
            id: e.id,
            exceptionDate: e.exception_date ?? e.exceptionDate,
            isAvailable: e.is_available ?? e.isAvailable,
            startTime: e.start_time ?? e.startTime,
            endTime: e.end_time ?? e.endTime,
            reason: e.reason,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addSlot = (day: number) => {
    setRules((prev) => [...prev, { dayOfWeek: day, startTime: "09:00", endTime: "17:00" }]);
  };

  const removeSlot = (idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, field: "startTime" | "endTime", value: string) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/api/coach/availability", {
        method: "PUT",
        authenticated: true,
        body: JSON.stringify({ rules }),
      });
      toast.success(t("coachAvailability.saved"));
    } catch (err: any) {
      toast.error(err?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddException = async () => {
    if (!newException.exceptionDate) return;
    setAddingException(true);
    try {
      const data = await api<{ exception: Exception }>("/api/coach/availability/exceptions", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify(newException),
      });
      setExceptions((prev) => [...prev, data.exception]);
      setNewException({ exceptionDate: todayStr(), isAvailable: false, reason: "" });
      toast.success("Exception added");
    } catch (err: any) {
      toast.error(err?.message ?? "Error");
    } finally {
      setAddingException(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("coachAvailability.title")}</h1>
            <p className="text-sm text-gray-500 mt-1">{t("coachAvailability.subtitle")}</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white rounded-xl">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "…" : t("coachAvailability.save")}
          </Button>
        </div>

        {/* Weekly rules by day */}
        <div className="space-y-3 mb-10">
          {DAY_KEYS.map((dayKey, dayIndex) => {
            const dayRules = rules.map((r, i) => ({ ...r, _idx: i })).filter((r) => r.dayOfWeek === dayIndex);
            return (
              <div key={dayIndex} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900 dark:text-white">{t(dayKey)}</span>
                  <button
                    onClick={() => addSlot(dayIndex)}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                  >
                    <Plus className="w-4 h-4" /> {t("coachAvailability.addSlot")}
                  </button>
                </div>
                {dayRules.length === 0 ? (
                  <p className="text-sm text-gray-400">—</p>
                ) : (
                  <div className="space-y-2">
                    {dayRules.map((rule) => (
                      <div key={rule._idx} className="flex items-center gap-3 flex-wrap">
                        <input
                          type="time"
                          value={rule.startTime}
                          onChange={(e) => updateSlot(rule._idx!, "startTime", e.target.value)}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800"
                        />
                        <span className="text-gray-400 text-sm">–</span>
                        <input
                          type="time"
                          value={rule.endTime}
                          onChange={(e) => updateSlot(rule._idx!, "endTime", e.target.value)}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-800"
                        />
                        <button
                          onClick={() => removeSlot(rule._idx!)}
                          className="text-red-400 hover:text-red-600 ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Exceptions */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            {t("coachAvailability.exceptions.title")}
          </h2>

          {exceptions.length > 0 && (
            <div className="space-y-2 mb-5">
              {exceptions.map((exc, i) => (
                <div key={exc.id ?? i} className="flex items-center gap-3 text-sm p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <span className="font-medium">{exc.exceptionDate}</span>
                  <span className={exc.isAvailable ? "text-green-600" : "text-red-500"}>
                    {exc.isAvailable ? "Available" : "Unavailable"}
                  </span>
                  {exc.reason && <span className="text-gray-500 truncate">{exc.reason}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Add exception form */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t("coachAvailability.exceptions.add")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("coachAvailability.exceptions.date")}</label>
                <input
                  type="date"
                  value={newException.exceptionDate ?? ""}
                  min={todayStr()}
                  onChange={(e) => setNewException((p) => ({ ...p, exceptionDate: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("coachAvailability.exceptions.reason")}</label>
                <Input
                  value={newException.reason ?? ""}
                  onChange={(e) => setNewException((p) => ({ ...p, reason: e.target.value }))}
                  className="rounded-xl text-sm"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={!newException.isAvailable}
                onChange={(e) => setNewException((p) => ({ ...p, isAvailable: !e.target.checked }))}
                className="rounded"
              />
              {t("coachAvailability.exceptions.unavailable")}
            </label>
            <Button
              onClick={handleAddException}
              disabled={addingException}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1" />
              {addingException ? "…" : t("coachAvailability.exceptions.add")}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CoachAvailability;
