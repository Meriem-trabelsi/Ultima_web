import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Connexion réussie ! (Démo)");
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md gradient-card rounded-2xl border border-border p-8 animate-slide-up">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold mb-2">Connexion</h1>
            <p className="text-sm text-muted-foreground">Accédez à votre espace ULTIMA</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative mt-1.5">
                <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full glow-yellow">
              <LogIn size={18} className="mr-2" /> Se connecter
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            Pas encore de compte ?{" "}
            <Link to="/signup" className="text-primary hover:underline">S'inscrire</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
