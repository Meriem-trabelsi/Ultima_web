import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon, UserCircle2, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { clearSession, getSessionUser, SessionUser } from "@/lib/session";
import { useLocale } from "@/i18n/locale";
import BrandLogo from "./BrandLogo";
import { api } from "@/lib/api";

// Core navigation visible to every authenticated user
const coreLinks = [
  { key: "nav.home", path: "/" },
  { key: "nav.reservation", path: "/reservation" },
  { key: "nav.competitions", path: "/competitions" },
  { key: "nav.performance", path: "/performance" },
];

// Role-specific extras
const playerExtras = [
  { key: "nav.coaches", path: "/coaches" },
  { key: "nav.coachingRequests", path: "/coaching-requests" },
];

const coachExtras = [
  { key: "nav.coachProfile", path: "/coach/profile" },
  { key: "nav.coachAvailability", path: "/coach/availability" },
  { key: "nav.coachRequests", path: "/coach/requests" },
];

const adminExtras = [
  { key: "nav.coach", path: "/coach" },
  { key: "admin.title", path: "/admin" },
];

function getScopedLinks(user: SessionUser | null) {
  if (!user) return coreLinks;
  const role = user.role;
  if (role === "admin" || role === "super_admin") return [...coreLinks, ...adminExtras];
  if (role === "coach") return [...coreLinks, ...coachExtras];
  return [...coreLinks, ...playerExtras];
}

// ── Notification type ─────────────────────────────────────────────────────────
type Notification = { id: number; title: string; body: string; readAt: string | null; linkUrl?: string | null };

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();

  const profilePath =
    sessionUser && ["admin", "super_admin"].includes(sessionUser.role)
      ? "/admin"
      : sessionUser?.role === "coach"
        ? "/coach/profile"
        : "/performance";

  const scopedLinks = getScopedLinks(sessionUser);

  useEffect(() => { setSessionUser(getSessionUser()); }, [location.pathname]);

  useEffect(() => {
    const sync = () => setSessionUser(getSessionUser());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!sessionUser) { setNotifications([]); return; }
    void api<{ notifications: Notification[] }>("/api/notifications", { authenticated: true })
      .then((r) => setNotifications(r.notifications ?? []))
      .catch(() => {});
  }, [sessionUser?.id, location.pathname]);

  const handleLogout = () => {
    clearSession();
    setSessionUser(null);
    setOpen(false);
    navigate("/");
  };

  const handleOpenNotif = async (id: number, linkUrl?: string | null) => {
    try {
      await api(`/api/notifications/${id}/read`, { method: "PATCH", authenticated: true });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    } catch { /* ignore */ }
    setNotificationsOpen(false);
    if (linkUrl) navigate(linkUrl);
  };

  const unread = notifications.filter((n) => !n.readAt).length;
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 flex h-16 items-center justify-between gap-2">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="ULTIMA home">
          <BrandLogo compact />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-0.5 flex-1 mx-4 overflow-x-auto scrollbar-hide">
          {scopedLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                isActive(link.path)
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
        </div>

        {/* Desktop right controls */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          {/* Locale toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            {(["en", "fr"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-2 py-1 text-xs font-semibold transition-colors ${
                  locale === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t("nav.theme")}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {sessionUser ? (
            <>
              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotificationsOpen((v) => !v)}
                  className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={17} />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {Math.min(unread, 9)}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl p-2 z-50">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {t("notifications.title")}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length ? notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => void handleOpenNotif(n.id, n.linkUrl)}
                          className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                            n.readAt ? "hover:bg-muted/40 text-muted-foreground" : "bg-primary/5 hover:bg-primary/10 text-foreground"
                          }`}
                        >
                          <div className="font-semibold text-xs">{n.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>
                        </button>
                      )) : (
                        <p className="px-3 py-5 text-sm text-muted-foreground text-center">{t("notifications.empty")}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <Link to={profilePath}>
                <Button variant="outline" size="sm" className="border-border text-foreground gap-1.5">
                  <UserCircle2 size={15} />
                  <span className="max-w-[80px] truncate">{sessionUser.firstName}</span>
                </Button>
              </Link>

              {/* Logout */}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground gap-1">
                <LogOut size={15} />
                {t("nav.logout")}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">{t("nav.login")}</Button></Link>
              <Link to="/signup"><Button size="sm">{t("nav.signup")}</Button></Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex lg:hidden items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors"
            aria-label={t("nav.theme")}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-md text-foreground hover:bg-muted transition-colors"
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ────────────────────────────────────────────────────────── */}
      {open && (
        <div className="lg:hidden border-t border-border bg-background/98 backdrop-blur-xl">
          {/* Scrollable nav links */}
          <div className="max-h-[60vh] overflow-y-auto px-4 py-3 flex flex-col gap-1">
            {scopedLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t(link.key)}
              </Link>
            ))}
          </div>

          {/* Fixed bottom bar: locale + auth */}
          <div className="border-t border-border px-4 py-3 space-y-2 bg-background">
            {/* Locale */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["en", "fr"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                    locale === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Auth buttons — always visible */}
            <div className="flex gap-2">
              {sessionUser ? (
                <>
                  <Link to={profilePath} className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full gap-1.5 text-sm" size="sm">
                      <UserCircle2 size={14} /> {t("nav.profile")}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="flex-1 gap-1.5 text-sm text-muted-foreground"
                    size="sm"
                    onClick={handleLogout}
                  >
                    <LogOut size={14} /> {t("nav.logout")}
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full text-sm" size="sm">{t("nav.login")}</Button>
                  </Link>
                  <Link to="/signup" className="flex-1" onClick={() => setOpen(false)}>
                    <Button className="w-full text-sm" size="sm">{t("nav.signup")}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
