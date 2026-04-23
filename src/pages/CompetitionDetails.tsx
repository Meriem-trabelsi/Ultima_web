import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar, Info, ArrowLeft, CheckCircle2, Target, Shield, Zap, Medal } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getSessionUser } from "@/lib/session";
import { Skeleton } from "@/components/ui/skeleton";

type Participant = {
  id: number;
  name: string;
  ranking: number;
};

type CompetitionDetails = {
  id: number;
  name: string;
  description: string;
  start_date: string;
  arena_name: string;
  max_participants: number;
  participants: Participant[];
  rules: string;
  prizes: string;
};

const CompetitionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [comp, setComp] = useState<CompetitionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const user = getSessionUser();

  const loadDetails = async () => {
    try {
      const data = await api<CompetitionDetails>(`/api/competitions/${id}`, { optionalAuth: true });
      setComp(data);
    } catch (error) {
      toast.error("Impossible de charger les details du tournoi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetails();
  }, [id]);

  const handleRegister = async () => {
    if (!user) {
      toast.error("Connectez-vous pour vous inscrire !");
      return;
    }
    setRegistering(true);
    try {
      await api(`/api/competitions/${id}/register`, { method: "POST", authenticated: true });
      toast.success("Inscription reussie !");
      void loadDetails();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'inscription.");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 space-y-8">
          <Skeleton className="h-4 w-40" />
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-4">
                <Skeleton className="h-6 w-44 rounded-full" />
                <Skeleton className="h-14 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-2/3" />
              </div>
              <div className="gradient-card rounded-3xl border border-border p-8 space-y-4">
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-56 w-full rounded-xl" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="gradient-card rounded-3xl border border-border p-8 space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
              <div className="gradient-card rounded-3xl border border-border p-8 space-y-3">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
                <Skeleton className="h-5 w-4/6" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  if (!comp) return <Layout><div className="container py-24 text-center">Tournoi introuvable.</div></Layout>;

  const isRegistered = comp.participants.some(p => p.id === user?.id);

  return (
    <Layout>
      <div className="container py-12">
        <Link to="/competitions" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 text-xs font-bold uppercase tracking-widest">
          <ArrowLeft size={14} /> Retour aux competitions
        </Link>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-12">
            <header>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                <Trophy size={12} /> Tournoi Officiel {comp.arena_name}
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-bold text-gradient uppercase tracking-tighter mb-6">{comp.name}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">{comp.description}</p>
            </header>

            {/* Visual Bracket (Placeholder Simulation) */}
            <section className="gradient-card rounded-3xl border border-border p-8 shadow-inner overflow-hidden relative">
              <div className="absolute top-4 right-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1 opacity-50">
                <Info size={12} /> Tableau Preliminaire
              </div>
              <h3 className="text-xl font-display font-bold uppercase tracking-tighter mb-10">Tableau Final</h3>
              
              <div className="flex justify-between items-center relative py-12">
                <div className="space-y-12">
                  {[1, 2].map(i => (
                    <div key={i} className="w-48 p-4 rounded-xl border border-border bg-muted/20 flex flex-col gap-2 relative z-10">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground">Match {i}</div>
                      <div className="text-sm font-bold truncate">{comp.participants[i-1]?.name || 'TBD'}</div>
                      <div className="h-[1px] bg-border my-1" />
                      <div className="text-sm font-bold truncate">{comp.participants[i+1]?.name || 'TBD'}</div>
                    </div>
                  ))}
                </div>
                
                {/* Connecting Lines */}
                <div className="absolute inset-x-48 inset-y-0 flex items-center">
                  <div className="w-full h-24 border-y border-r border-primary/30 rounded-r-2xl" />
                </div>

                <div className="w-56 p-6 rounded-2xl border-2 border-primary/30 bg-primary/5 flex flex-col gap-3 relative z-10 shadow-glow shadow-primary/10">
                  <div className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-1"><Zap size={10} fill="currentColor" /> Grande Finale</div>
                  <div className="text-lg font-display font-bold truncate">Gagnant M1</div>
                  <div className="h-[1px] bg-primary/20 my-1" />
                  <div className="text-lg font-display font-bold truncate">Gagnant M2</div>
                </div>
              </div>
            </section>

            {/* Rules */}
            <section>
              <h3 className="text-xl font-display font-bold uppercase tracking-tighter mb-6">Reglement & Format</h3>
              <div className="gradient-card rounded-2xl border border-border p-6 text-sm text-muted-foreground leading-relaxed">
                {comp.rules}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Registration Card */}
            <div className="gradient-card rounded-3xl border border-primary/30 p-8 shadow-2xl sticky top-24">
              <div className="flex justify-between items-center mb-8">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary"><Calendar size={24} /></div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Date de debut</div>
                  <div className="text-lg font-bold">{new Date(comp.start_date).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm border-b border-border py-4">
                  <span className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest">Participants</span>
                  <span className="font-bold">{comp.participants.length} / {comp.max_participants}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border py-4">
                  <span className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest">Niveau</span>
                  <span className="font-bold flex items-center gap-2"><Shield size={14} className="text-blue-400" /> Ouvert</span>
                </div>
              </div>

              {isRegistered ? (
                <div className="flex flex-col gap-4 text-center">
                  <div className="bg-green-500/10 text-green-400 p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-green-500/20">
                    <CheckCircle2 size={18} /> Inscrit
                  </div>
                </div>
              ) : (
                <Button size="lg" className="w-full glow-yellow h-14 font-bold uppercase tracking-widest" onClick={handleRegister} disabled={registering || comp.participants.length >= comp.max_participants}>
                  {registering ? 'Inscription...' : comp.participants.length >= comp.max_participants ? 'Complet' : 'M\'inscrire Maintenant'}
                </Button>
              )}
            </div>

            {/* Prizes */}
            <div className="gradient-card rounded-3xl border border-border p-8">
              <h4 className="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                <Medal size={16} /> Recompenses
              </h4>
              <div className="space-y-4 italic text-sm text-muted-foreground">
                {comp.prizes.split(' | ').map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground">{i+1}</div>
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Participants List */}
            <div className="gradient-card rounded-3xl border border-border p-8">
              <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                <Users size={16} /> Liste des Joueurs
              </h4>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {comp.participants.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-white/5">
                    <div className="font-bold text-sm">{p.name}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-md">{p.ranking} PTS</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CompetitionDetails;
