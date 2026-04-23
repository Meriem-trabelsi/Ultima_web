import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon, UserCircle2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { clearSession, getSessionUser, SessionUser } from "@/lib/session";
import { useLocale } from "@/i18n/locale";
import BrandLogo from "./BrandLogo";

const navLinks = [
  { key: "nav.home", path: "/" },
  { key: "nav.reservation", path: "/reservation" },
  { key: "nav.competitions", path: "/competitions" },
  { key: "nav.live", path: "/live-scores" },
  { key: "nav.performance", path: "/performance" },
  { key: "nav.connections", path: "/connections" },
  { key: "nav.smartplay", path: "/smartplay-ai" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();

  const profilePath =
    sessionUser && ["admin", "super_admin"].includes(sessionUser.role)
      ? "/admin"
      : sessionUser?.role === "coach"
        ? "/coach"
        : "/performance";

  const scopedLinks =
    sessionUser && ["coach", "admin", "super_admin"].includes(sessionUser.role)
      ? [...navLinks, { key: "nav.coach", path: "/coach" }]
      : navLinks;

  useEffect(() => {
    setSessionUser(getSessionUser());
  }, [location.pathname]);

  useEffect(() => {
    const syncSession = () => setSessionUser(getSessionUser());
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, []);

  const handleLogout = () => {
    clearSession();
    setSessionUser(null);
    setOpen(false);
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label="ULTIMA home">
          <BrandLogo compact />
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {scopedLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.path
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              aria-label={t("nav.lang")}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("fr")}
              className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${locale === "fr" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              aria-label={t("nav.lang")}
            >
              FR
            </button>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t("nav.theme")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {sessionUser ? (
            <>
              <Link to={profilePath}>
                <Button variant="outline" size="sm" className="border-primary/30 text-primary">
                  <UserCircle2 size={16} className="mr-2" />
                  {sessionUser.firstName}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut size={16} className="mr-2" />
                {t("nav.logout")}
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">{t("nav.login")}</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="glow-yellow">{t("nav.signup")}</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t("nav.theme")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="text-foreground" onClick={() => setOpen(!open)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-slide-up">
          <div className="container py-4 flex flex-col gap-2">
            {scopedLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === link.path ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
              >
                {t(link.key)}
              </Link>
            ))}

            <div className="flex rounded-md border border-border overflow-hidden my-1">
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`flex-1 px-3 py-2 text-xs font-semibold ${locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("fr")}
                className={`flex-1 px-3 py-2 text-xs font-semibold ${locale === "fr" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                FR
              </button>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border mt-2">
              {sessionUser ? (
                <>
                  <Link to={profilePath} className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full border-primary/30 text-primary" size="sm">
                      <UserCircle2 size={16} className="mr-2" />
                      {t("nav.profile")}
                    </Button>
                  </Link>
                  <Button variant="ghost" className="flex-1" size="sm" onClick={handleLogout}>
                    <LogOut size={16} className="mr-2" />
                    {t("nav.logout")}
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex-1"><Button variant="ghost" className="w-full" size="sm">{t("nav.login")}</Button></Link>
                  <Link to="/signup" className="flex-1"><Button className="w-full" size="sm">{t("nav.signup")}</Button></Link>
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
