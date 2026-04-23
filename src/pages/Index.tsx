import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { Calendar, Trophy, Activity, Brain, ArrowRight, Zap, CheckCircle2, TrendingUp, Target } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { getSessionUser, SessionUser } from "@/lib/session";
import { api } from "@/lib/api";
import UserReservations from "@/components/UserReservations";
import { useLocale } from "@/i18n/locale";
import heroBg from "@/assets/hero-bg.jpg";
import smartcourt from "@/assets/smartcourt.jpg";

/* ── Animated counter hook ── */
function useCountUp(target: number, duration = 1600, enabled = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let start: number | null = null;
    let raf: number;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return value;
}

/* ── Hero stat strip (guest view) ── */
const GuestValueStrip = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), 350);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className="mt-12 grid sm:grid-cols-3 gap-3 max-w-3xl"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
        transitionDelay: "0.25s",
      }}
    >
      {[
        { title: "Book in seconds", desc: "Pick court, date and players with one clean flow." },
        { title: "Verify reservations", desc: "Each ticket includes PDF proof + admin verification code." },
        { title: "Run your arena", desc: "Handle courts, members and reservations from one dashboard." },
      ].map((item) => (
        <div key={item.title} className="rounded-xl border border-primary/20 bg-background/45 backdrop-blur-md p-4">
          <p className="text-sm font-black uppercase tracking-wider text-foreground">{item.title}</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  );
};
/* ── Live match badge ── */
const LiveBadge = () => (
  <div className="absolute top-8 right-8 hidden md:flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md bg-background/40 border border-primary/30"
    style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.2)" }}>
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
    </span>
    <span className="text-[10px] uppercase tracking-widest font-bold text-foreground/80">Live Now</span>
  </div>
);

/* ── Scroll section helper ── */
const ScrollSection = ({
  children,
  className = "",
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "up" | "left" | "right" | "scale";
}) => {
  const { ref, isVisible } = useScrollAnimation(0.12);
  const hiddenClass =
    direction === "left"
      ? "scroll-hidden-left"
      : direction === "right"
      ? "scroll-hidden-right"
      : direction === "scale"
      ? "scroll-scale-hidden"
      : "scroll-hidden";
  const visibleClass =
    direction === "up"
      ? "scroll-visible"
      : direction === "scale"
      ? "scroll-scale-visible"
      : "scroll-visible-x";
  return (
    <div ref={ref} className={`${hiddenClass} ${isVisible ? visibleClass : ""} ${className}`}>
      {children}
    </div>
  );
};

type DashboardStats = {
  totalMatches: number;
  winRate: string;
  ranking: number;
  upcomingBookings: number;
};

/* ── Dashboard stat card count-up ── */
const StatValue = ({ raw }: { raw: string }) => {
  const numeric = parseFloat(raw.replace(/[^\d.]/g, "")) || 0;
  const suffix = raw.replace(/[\d.,]/g, "").trim();
  const val = useCountUp(Math.round(numeric), 1200);
  if (!numeric) return <>{raw}</>;
  return <>
    {val.toLocaleString()}
    {suffix}
  </>;
};

const Index = () => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const location = useLocation();
  const { t } = useLocale();

  const features = [
    { icon: Calendar, title: t("home.features.booking.title"), desc: t("home.features.booking.desc"), link: "/reservation" },
    { icon: Trophy, title: t("home.features.competitions.title"), desc: t("home.features.competitions.desc"), link: "/competitions" },
    { icon: Activity, title: t("home.features.live.title"), desc: t("home.features.live.desc"), link: "/live-scores" },
    { icon: Brain, title: t("home.features.ai.title"), desc: t("home.features.ai.desc"), link: "/smartplay-ai" },
  ];

  useEffect(() => {
    const sessionUser = getSessionUser();
    setUser(sessionUser);
    if (sessionUser) {
      void api<DashboardStats>("/api/player/dashboard", { authenticated: true })
        .then(setStats)
        .catch(console.error);
    } else {
      setStats(null);
    }
  }, [location.pathname]);

  return (
    <Layout>
      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <img src={heroBg} alt="Padel court" className="absolute inset-0 w-full h-full object-cover" />

        {/* Layered overlay – more depth than before */}
        <div className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.55) 55%, transparent 100%), " +
              "linear-gradient(to top, hsl(var(--background) / 0.7) 0%, transparent 40%)",
          }}
        />

        {/* Subtle grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <LiveBadge />

        <div className="container relative z-10">
          <div className="max-w-2xl animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 backdrop-blur-sm">
              <Zap size={16} className="animate-pulse" /> {t("home.hero.badge")}
            </div>

            {user ? (
              <>
                <h1 className="text-5xl md:text-7xl font-display font-bold leading-[0.95] mb-6">
                  <span className="text-foreground">{t("home.hero.welcome")}</span>
                  <br />
                  <span className="text-gradient">{user.firstName}</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mb-10">{t("home.hero.userText")}</p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/reservation">
                    <Button size="lg" className="glow-yellow h-14 px-8 text-lg">{t("home.hero.bookCourt")}</Button>
                  </Link>
                  <Link to="/performance">
                    <Button variant="outline" size="lg" className="h-14 px-8 text-lg border-primary/30 text-primary">
                      {t("home.hero.myStats")}
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.95] mb-6">
                  <span className="text-gradient">WE CONNECT</span>
                  <br />
                  <span className="text-foreground">YOUR SPORT</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10">{t("home.hero.guestText")}</p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/signup">
                    <Button size="lg" className="glow-yellow h-14 px-8 text-lg">{t("home.hero.start")}</Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg" className="h-14 px-8 text-lg border-primary/30 text-primary">
                      {t("home.hero.login")}
                    </Button>
                  </Link>
                </div>

                {/* Animated platform stats */}
                <GuestValueStrip />
              </>
            )}
          </div>
        </div>

        {/* Diagonal divider – more visible */}
        <div
          className="absolute bottom-0 left-0 right-0 h-28 bg-background"
          style={{ clipPath: "polygon(0 100%, 100% 45%, 100% 100%, 0 100%)" }}
        />
      </section>

      {/* ── Authenticated dashboard stats ── */}
      {user && stats && (
        <section className="py-12 -mt-16 relative z-20">
          <div className="container">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Target, label: "Win Rate", value: stats.winRate, color: "text-primary" },
                { icon: TrendingUp, label: "Ranking", value: `${stats.ranking} PTS`, color: "text-blue-400" },
                { icon: Activity, label: t("home.stats.matches"), value: String(stats.totalMatches), color: "text-green-400" },
                { icon: Calendar, label: t("home.stats.booked"), value: String(stats.upcomingBookings), color: "text-yellow-400" },
              ].map((s) => (
                <div key={s.label} className="gradient-card p-6 rounded-2xl border border-primary/20 backdrop-blur-md">
                  <div className="flex items-center gap-3 text-muted-foreground mb-4">
                    <s.icon size={18} className={s.color} />
                    <span className="text-xs font-bold uppercase tracking-widest">{s.label}</span>
                  </div>
                  <div className="text-3xl font-display font-bold">
                    <StatValue raw={s.value} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Feature cards ── */}
      <section className="py-24">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <ScrollSection key={f.title} direction="scale" className="h-full">
                <Link to={f.link} className="flex flex-col h-full gradient-card p-8 rounded-2xl border border-border hover:border-primary/40 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                    <f.icon className="text-primary" size={24} />
                  </div>
                  <h3 className="text-xl font-display font-bold mb-3">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6 flex-grow">{f.desc}</p>
                  <div className="flex items-center text-primary text-sm font-bold opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-300">
                    {t("home.explore")} <ArrowRight size={14} className="ml-2" />
                  </div>
                </Link>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── User reservations ── */}
      {user && (
        <section className="pb-24 border-t border-border mt-12 pt-20">
          <div className="container">
            <UserReservations />
          </div>
        </section>
      )}

      {/* ── Tech showcase ── */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollSection direction="left">
              <h2 className="text-4xl md:text-6xl font-display font-bold mb-8">
                {t("home.tech.title.prefix")}{" "}
                <span className="text-gradient">{t("home.tech.title.highlight")}</span>
              </h2>
              <ul className="space-y-6">
                {[
                  { t: t("home.tech.item1.t"), d: t("home.tech.item1.d") },
                  { t: t("home.tech.item2.t"), d: t("home.tech.item2.d") },
                  { t: t("home.tech.item3.t"), d: t("home.tech.item3.d") },
                ].map((item) => (
                  <li key={item.t} className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                      <CheckCircle2 size={14} className="text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold">{item.t}</h4>
                      <p className="text-sm text-muted-foreground">{item.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollSection>

            <ScrollSection direction="right">
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl skew-y-3 hover:skew-y-0 transition-all duration-700">
                <img src={smartcourt} alt="AI Analytics" className="w-full h-auto" />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-60" />
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;

