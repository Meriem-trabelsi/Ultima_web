import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

const Signup = () => {
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", password: "", role: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Inscription réussie ! (Démo)");
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md gradient-card rounded-2xl border border-border p-8 animate-slide-up">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold mb-2">Inscription</h1>
            <p className="text-sm text-muted-foreground">Créez votre compte ULTIMA</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom</Label>
                <Input placeholder="Ferchichi" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required className="mt-1.5" />
              </div>
              <div>
                <Label>Prénom</Label>
                <Input placeholder="Aziz" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="votre@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1.5" />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="mt-1.5" />
            </div>
            <div>
              <Label>Rôle</Label>
              <Select onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Sélectionnez un rôle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="joueur">Joueur</SelectItem>
                  <SelectItem value="entraineur">Entraîneur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full glow-yellow">
              <UserPlus size={18} className="mr-2" /> S'inscrire
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Signup;
