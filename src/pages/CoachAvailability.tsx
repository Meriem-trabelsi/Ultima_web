import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale";
import { toast } from "sonner";
import { CalendarDays, Clock, Plus, Save, Sparkles, Trash2 } from "lucide-react";

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

const QUICK_SLOTS = [
  { label: "Morning", startTime: "08:00", endTime: "12:00" },
  { label: "Afternoon", startTime: "13:00", endTime: "17:00" },
  { label: "Evening", startTime: "18:00", endTime: "22:00" },
];

const todayStr = () => new Date().toISOString().split("T")[0];
const panelClass = "rounded-2xl border border-border bg-card shadow-sm";

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
            startTime: String(r.start_time ?? r.startTime).slice(0, 5),
            endTime: String(r.end_time ?? r.endTime).slice(0, 5),
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

  const totalSlots = rules.length;
  const activeDays = useMemo(() => new Set(rules.map((rule) => rule.dayOfWeek)).size, [rules]);

  const addSlot = (day: number, slot = { startTime: "09:00", endTime: "17:00" }) => {
    setRules((prev) => [...prev, { dayOfWeek: day, ...slot }]);
  };

  const removeSlot = (idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, field: "startTime" | "endTime", value: string) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const copyMondayToWeek = () => {
    const mondayRules = rules.filter((rule) => rule.dayOfWeek === 1);
    if (!mondayRules.length) {
      toast.error("Add Monday slots first.");
      return;
    }
    setRules((prev) => [
      ...prev.filter((rule) => rule.dayOfWeek === 0 || rule.dayOfWeek === 6),
      ...[1, 2, 3, 4, 5].flatMap((day) =>
        mondayRules.map((rule) => ({
          dayOfWeek: day,
          startTime: rule.startTime,
          endTime: rule.endTime,
        }))
      ),
    ]);
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
        <div className="container py-10 space-y-5">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid lg:grid-cols-2 gap-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="border-b border-border bg-background">
        <div className="container py-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              {t("coachAvailability.title")}
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t("coachAvailability.title")}</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">{t("coachAvailability.subtitle")}</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl h-11 gap-2 glow-yellow">
            <Save className="w-4 h-4" />
            {saving ? "..." : t("coachAvailability.save")}
          </Button>
        </div>
      </div>

      <div className="container py-10 grid grid-cols-1 xl:grid-cols-[1fr,360px] gap-8 items-start">
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className={`${panelClass} p-5`}>
              <p className="text-xs text-muted-foreground">{t("coachAvailability.stats.activeDays")}</p>
              <p className="text-3xl font-bold text-foreground mt-1">{activeDays}</p>
            </div>
            <div className={`${panelClass} p-5`}>
              <p className="text-xs text-muted-foreground">{t("coachAvailability.stats.slots")}</p>
              <p className="text-3xl font-bold text-foreground mt-1">{totalSlots}</p>
            </div>
            <div className={`${panelClass} p-5`}>
              <p className="text-xs text-muted-foreground">{t("coachAvailability.exceptions.title")}</p>
              <p className="text-3xl font-bold text-foreground mt-1">{exceptions.length}</p>
            </div>
          </div>

          <div className={`${panelClass} p-5 sm:p-6`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
              <div>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  {t("coachAvailability.weeklyTitle")}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">{t("coachAvailability.weeklyHint")}</p>
              </div>
              <Button variant="outline" size="sm" onClick={copyMondayToWeek} className="rounded-xl">
                {t("coachAvailability.copyWeekdays")}
              </Button>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {DAY_KEYS.map((dayKey, dayIndex) => {
                const dayRules = rules.map((r, i) => ({ ...r, _idx: i })).filter((r) => r.dayOfWeek === dayIndex);
                return (
                  <div key={dayIndex} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="font-semibold text-foreground">{t(dayKey)}</p>
                        <p className="text-xs text-muted-foreground">
                          {dayRules.length ? `${dayRules.length} ${t("coachAvailability.slotCount")}` : t("coachAvailability.closed")}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addSlot(dayIndex)} className="rounded-xl gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        {t("coachAvailability.addSlot")}
                      </Button>
                    </div>

                    {dayRules.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                        {t("coachAvailability.noSlots")}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dayRules.map((rule) => (
                          <div key={rule._idx} className="rounded-xl border border-border bg-card p-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                              <input
                                type="time"
                                value={rule.startTime}
                                onChange={(e) => updateSlot(rule._idx!, "startTime", e.target.value)}
                                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                              />
                              <span className="text-muted-foreground text-sm">to</span>
                              <input
                                type="time"
                                value={rule.endTime}
                                onChange={(e) => updateSlot(rule._idx!, "endTime", e.target.value)}
                                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                              />
                              <button
                                onClick={() => removeSlot(rule._idx!)}
                                className="h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors grid place-items-center shrink-0"
                                aria-label={t("coachAvailability.removeSlot")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3">
                      {QUICK_SLOTS.map((slot) => (
                        <button
                          key={slot.label}
                          onClick={() => addSlot(dayIndex, { startTime: slot.startTime, endTime: slot.endTime })}
                          className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className={`${panelClass} p-5 sm:p-6 sticky top-20`}>
          <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {t("coachAvailability.exceptions.title")}
          </h2>
          <p className="text-xs text-muted-foreground mb-5">{t("coachAvailability.exceptionsHint")}</p>

          {exceptions.length > 0 ? (
            <div className="space-y-2 mb-6 max-h-64 overflow-auto pr-1">
              {exceptions.map((exc, i) => (
                <div key={exc.id ?? i} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-sm text-foreground">{exc.exceptionDate}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${exc.isAvailable ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                      {exc.isAvailable ? t("coachAvailability.available") : t("coachAvailability.unavailable")}
                    </span>
                  </div>
                  {exc.reason && <p className="text-xs text-muted-foreground mt-1 truncate">{exc.reason}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground mb-6">
              {t("coachAvailability.noExceptions")}
            </div>
          )}

          <div className="border-t border-border pt-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">{t("coachAvailability.exceptions.add")}</p>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{t("coachAvailability.exceptions.date")}</label>
              <input
                type="date"
                value={newException.exceptionDate ?? ""}
                min={todayStr()}
                onChange={(e) => setNewException((p) => ({ ...p, exceptionDate: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{t("coachAvailability.exceptions.reason")}</label>
              <Input
                value={newException.reason ?? ""}
                onChange={(e) => setNewException((p) => ({ ...p, reason: e.target.value }))}
                className="rounded-xl text-sm"
              />
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={!newException.isAvailable}
                onChange={(e) => setNewException((p) => ({ ...p, isAvailable: !e.target.checked }))}
                className="rounded"
              />
              {t("coachAvailability.exceptions.unavailable")}
            </label>

            <Button onClick={handleAddException} disabled={addingException} className="w-full rounded-xl gap-2">
              <Plus className="w-4 h-4" />
              {addingException ? "..." : t("coachAvailability.exceptions.add")}
            </Button>
          </div>
        </aside>
      </div>
    </Layout>
  );
};

export default CoachAvailability;
