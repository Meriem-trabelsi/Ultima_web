import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n/locale";
import { useNavigate } from "react-router-dom";
import { Search, Star, Clock, Globe, ArrowRight, ShieldCheck } from "lucide-react";

type CoachCard = {
  userId: number;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  headline: string | null;
  expertise: string[];
  qualities: string[];
  languages: string[];
  yearsExperience: number | null;
  hourlyRate: number | null;
  currency: string;
  isVerified: boolean;
  arenaName: string | null;
};

const CoachCardSkeleton = () => (
  <div className="rounded-2xl border border-border/40 bg-card overflow-hidden animate-pulse">
    <div className="h-28 bg-muted/60" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-muted rounded w-2/3" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="flex gap-2 pt-1">
        {[1, 2, 3].map((i) => <div key={i} className="h-5 w-14 bg-muted rounded-full" />)}
      </div>
    </div>
  </div>
);

const initials = (first: string, last: string) =>
  `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

const Coaches = () => {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<CoachCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    api<{ coaches: CoachCard[] }>(`/api/player/coaches?${params}`, { authenticated: true })
      .then((data) => setCoaches(data.coaches ?? []))
      .catch(() => setCoaches([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  return (
    <Layout>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative border-b border-border/40 bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 py-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
            <Star className="w-3.5 h-3.5 text-primary" />
            {t("coaches.title")}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
            {t("coaches.title")}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm sm:text-base">
            {t("coaches.subtitle")}
          </p>

          {/* Search */}
          <div className="relative max-w-sm mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("coaches.search.placeholder")}
              className="pl-10 h-11 rounded-xl border-border/60 bg-background text-foreground"
            />
          </div>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <CoachCardSkeleton key={i} />)}
          </div>
        ) : coaches.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-muted-foreground gap-3">
            <Star className="w-10 h-10 opacity-20" />
            <p className="text-base">{t("coaches.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {coaches.map((coach) => (
              <article
                key={coach.userId}
                onClick={() => navigate(`/coaches/${coach.userId}`)}
                className="group relative rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                {/* Top accent bar */}
                <div className="h-1 w-full bg-gradient-to-r from-primary/60 to-primary/20" />

                {/* Avatar + name row */}
                <div className="px-5 pt-5 pb-4 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/40 shadow-sm">
                    {coach.profileImageUrl ? (
                      <img
                        src={coach.profileImageUrl}
                        alt={`${coach.firstName} ${coach.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                        {initials(coach.firstName, coach.lastName)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-foreground text-sm leading-tight">
                        {coach.firstName} {coach.lastName}
                      </h3>
                      {coach.isVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </div>
                    {coach.headline && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {coach.headline}
                      </p>
                    )}
                    {coach.arenaName && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">
                        {coach.arenaName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Expertise tags */}
                {coach.expertise.length > 0 && (
                  <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                    {coach.expertise.slice(0, 3).map((exp) => (
                      <Badge
                        key={exp}
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      >
                        {exp}
                      </Badge>
                    ))}
                    {coach.expertise.length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full">
                        +{coach.expertise.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Footer row */}
                <div className="px-5 py-3 border-t border-border/30 flex items-center justify-between gap-2 bg-muted/20">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {coach.yearsExperience != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {coach.yearsExperience} {t("coaches.card.experience")}
                      </span>
                    )}
                    {coach.languages.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {coach.languages[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {coach.hourlyRate != null && (
                      <span className="text-xs font-semibold text-foreground">
                        {coach.hourlyRate} {coach.currency}{t("coaches.card.rate")}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Coaches;
