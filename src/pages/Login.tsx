import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { setSession } from "@/lib/session";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api<{ token: string; user: Parameters<typeof setSession>[1] }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setSession(result.token, result.user);
      toast.success("Connexion reussie.");
      navigate(result.user.role === "admin" ? "/admin" : "/reservation");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md gradient-card rounded-2xl border border-border p-8 animate-slide-up">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold mb-2">Connexion</h1>
            <p className="text-sm text-muted-foreground">Accedez a votre espace ULTIMA</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative mt-1.5">
                <Input id="password" type={showPw ? "text" : "password"} placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full glow-yellow" disabled={loading}>
              <LogIn size={18} className="mr-2" /> {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            Pas encore de compte?{" "}
            <Link to="/signup" className="text-primary hover:underline">S'inscrire</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
