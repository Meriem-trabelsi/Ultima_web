import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { setSession } from "@/lib/session";
import { useLocale } from "@/i18n/locale";

type Arena = {
  id: number;
  name: string;
  location: string;
};

const Signup = () => {
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    cinNumber: "",
    role: "joueur",
    arenaId: "",
    arenaName: "",
    arenaLocation: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingArenas, setLoadingArenas] = useState(true);
  const navigate = useNavigate();
  const { t } = useLocale();

  useEffect(() => {
    const loadArenas = async () => {
      try {
        const result = await api<{ arenas: Arena[] }>("/api/arenas");
        setArenas(result.arenas);
        if (result.arenas[0]) {
          setForm((current) => ({ ...current, arenaId: current.arenaId || String(result.arenas[0].id) }));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load arenas.");
      } finally {
        setLoadingArenas(false);
      }
    };

    void loadArenas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim().toLowerCase());
    const passwordOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password);
    const cinOk = /^\d{8}$/.test(form.cinNumber.trim());
    if (!emailOk) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!passwordOk) {
      toast.error("Password must be at least 8 chars with uppercase, lowercase and number.");
      return;
    }
    if (form.password !== confirmPassword) {
      toast.error("Password confirmation does not match.");
      return;
    }
    if (!cinOk) {
      toast.error("CIN must contain exactly 8 digits.");
      return;
    }
    setLoading(true);

    try {
      const result = await api<{
        token?: string;
        user?: Parameters<typeof setSession>[1];
        requiresEmailVerification?: boolean;
        message?: string;
        verificationLink?: string;
      }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (result.token && result.user) {
        setSession(result.token, result.user);
        toast.success("Account created successfully.");
        navigate(["admin", "super_admin"].includes(result.user.role) ? "/admin" : result.user.role === "coach" ? "/coach" : "/reservation");
        return;
      }

      toast.success(result.message ?? "Account created. Check your email to verify your account.");
      if (result.verificationCode) {
        toast.message(`Dev code: ${result.verificationCode}`);
      }
      if (result.verificationLink) {
        toast.message(`Dev link: ${result.verificationLink}`);
      }
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md gradient-card rounded-2xl border border-border p-8 animate-slide-up">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold mb-2">{t("auth.signup.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.signup.subtitle")}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("auth.lastName")}</Label>
                <Input placeholder={t("auth.placeholder.lastName")} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required className="mt-1.5" />
              </div>
              <div>
                <Label>{t("auth.firstName")}</Label>
                <Input placeholder={t("auth.placeholder.firstName")} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>{t("auth.email")}</Label>
              <Input type="email" placeholder={t("auth.placeholder.email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1.5" />
            </div>
            <div>
              <Label>{t("auth.password")}</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.placeholder.password")}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">8+ chars, uppercase, lowercase, and a number.</p>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("auth.placeholder.password")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <Label>CIN</Label>
              <Input
                inputMode="numeric"
                pattern="\d{8}"
                placeholder="14533520"
                value={form.cinNumber}
                onChange={(e) => setForm({ ...form, cinNumber: e.target.value.replace(/[^\d]/g, "").slice(0, 8) })}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>{t("auth.role")}</Label>
              <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder={t("auth.role")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="joueur">{t("auth.role.player")}</SelectItem>
                  <SelectItem value="entraineur">{t("auth.role.coach")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("auth.arena")}</Label>
              <Select value={form.arenaId} onValueChange={(arenaId) => setForm({ ...form, arenaId })} disabled={loadingArenas || arenas.length === 0}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder={t("auth.chooseArena")} /></SelectTrigger>
                <SelectContent>
                  {arenas.map((arena) => (
                    <SelectItem key={arena.id} value={String(arena.id)}>
                      {arena.name} - {arena.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full glow-yellow" disabled={loading || loadingArenas || !form.arenaId}>
              <UserPlus size={18} className="mr-2" /> {loading ? t("auth.signup.loading") : t("auth.signup.submit")}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            {t("auth.signup.haveAccount")} {" "}
            <Link to="/login" className="text-primary hover:underline">{t("auth.login.link")}</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Signup;
