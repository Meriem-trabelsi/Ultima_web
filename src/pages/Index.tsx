import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { Calendar, Trophy, Activity, Brain, ArrowRight, Zap, Shield, BarChart3, Play, Monitor, Smartphone } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import heroBg from "@/assets/hero-bg.jpg";
import aiAnalysis from "@/assets/ai-analysis.jpg";
import smartcourt from "@/assets/smartcourt.jpg";

const ScrollSection = ({ children, className = "", direction = "up" }: { children: React.ReactNode; className?: string; direction?: "up" | "left" | "right" | "scale" }) => {
  const { ref, isVisible } = useScrollAnimation(0.12);
  const hiddenClass = direction === "left" ? "scroll-hidden-left" : direction === "right" ? "scroll-hidden-right" : direction === "scale" ? "scroll-scale-hidden" : "scroll-hidden";
  const visibleClass = direction === "up" ? "scroll-visible" : direction === "scale" ? "scroll-scale-visible" : "scroll-visible-x";
  return (
    <div ref={ref} className={`${hiddenClass} ${isVisible ? visibleClass : ""} ${className}`}>
      {children}
    </div>
  );
};

const features = [
  {
    icon: Calendar,
    title: "Réservation de Terrains",
    desc: "Réservez vos terrains de padel et tennis en quelques clics. Confirmation instantanée par QR code.",
    link: "/reservation",
  },
  {
    icon: Trophy,
    title: "Gestion des Compétitions",
    desc: "Organisez et participez à des tournois avec classements et brackets en temps réel.",
    link: "/competitions",
  },
  {
    icon: Activity,
    title: "Scores en Temps Réel",
    desc: "Suivez les scores en direct via le système SUMMA avec mise à jour WebSocket.",
    link: "/live-scores",
  },
  {
    icon: Brain,
    title: "SmartPlay AI",
    desc: "Analyse intelligente des performances via IA : tracking, heatmaps et recommandations.",
    link: "/smartplay-ai",
  },
];

const Index = () => (
  <Layout>
    {/* Hero — full-screen with background image like PlaySight */}
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <img
        src={heroBg}
        alt="Padel court"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 hero-overlay" />
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-primary/60 rounded-full animate-float" />
        <div className="absolute bottom-1/4 right-1/2 w-1.5 h-1.5 bg-primary/40 rounded-full animate-float" style={{ animationDelay: "2s" }} />
      </div>
      <div className="container relative z-10">
        <div className="max-w-2xl animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 backdrop-blur-sm">
            <Zap size={16} className="animate-pulse" /> Propulsé par l'Intelligence Artificielle
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.95] mb-6">
            <span className="text-gradient">WE CONNECT</span>
            <br />
            <span className="text-foreground">YOUR SPORT</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
            Plateforme intelligente de gestion sportive et d'analyse de performance pour le padel et le tennis.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/signup">
              <Button size="lg" className="glow-yellow text-base px-8 h-14 text-lg">
                Commencer <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link to="/smartplay-ai">
              <Button variant="outline" size="lg" className="text-base px-8 h-14 text-lg border-primary/30 text-primary hover:bg-primary/10 backdrop-blur-sm">
                <Play size={18} className="mr-2" /> Découvrir
              </Button>
            </Link>
          </div>
        </div>
      </div>
      {/* Diagonal bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-background" style={{ clipPath: "polygon(0 100%, 100% 60%, 100% 100%, 0 100%)" }} />
    </section>

    {/* CTA bar like PlaySight */}
    <section className="relative z-10 -mt-8">
      <div className="container">
        <ScrollSection direction="scale">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center py-8">
            <Link to="/reservation">
              <Button variant="outline" size="lg" className="min-w-[240px] h-14 text-base border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                <Calendar className="mr-2" size={20} /> Réserver un Terrain
              </Button>
            </Link>
            <Link to="/smartplay-ai">
              <Button size="lg" className="min-w-[240px] h-14 text-base glow-yellow">
                <Brain className="mr-2" size={20} /> Essayer SmartPlay AI
              </Button>
            </Link>
          </div>
        </ScrollSection>
      </div>
    </section>

    {/* Solutions — two-column image+text sections like PlaySight */}
    <section className="py-24">
      <div className="container">
        <ScrollSection>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-center mb-4">
            TECHNOLOGIE <span className="text-gradient">SMARTCOURT</span> AI
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-20">
            Des solutions connectées pour transformer chaque terrain en centre d'analyse intelligent.
          </p>
        </ScrollSection>

        {/* Solution 1: SmartCourt */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
          <ScrollSection direction="left">
            <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
              <img
                src={smartcourt}
                alt="SmartCourt Technology"
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700"
                loading="lazy"
                width={1280}
                height={720}
              />
            </div>
          </ScrollSection>
          <ScrollSection direction="right">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Monitor className="text-primary" size={24} />
              </div>
              <h3 className="font-display text-2xl font-bold">Solution Fixe</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Transformez vos terrains en SmartCourt avec notre plateforme connectée. Capturez chaque action avec des caméras intelligentes, profitez du streaming en direct, du replay instantané et des outils d'analyse de performance avancés.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Streaming Live", "Replay Instantané", "Analyse IA", "Multi-terrains"].map((tag) => (
                <span key={tag} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                  {tag}
                </span>
              ))}
            </div>
          </ScrollSection>
        </div>

        {/* Solution 2: SmartPlay AI */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <ScrollSection direction="left" className="md:order-2">
            <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
              <img
                src={aiAnalysis}
                alt="AI Analysis Dashboard"
                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700"
                loading="lazy"
                width={1280}
                height={720}
              />
            </div>
          </ScrollSection>
          <ScrollSection direction="right" className="md:order-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Brain className="text-primary" size={24} />
              </div>
              <h3 className="font-display text-2xl font-bold">SmartPlay AI</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Notre IA analyse vos matchs en profondeur. Heatmaps de positionnement, statistiques de frappe, vitesse de balle et recommandations personnalisées pour améliorer votre jeu.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Heatmaps", "Stats Avancées", "Recommandations", "Vidéo Highlights"].map((tag) => (
                <span key={tag} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                  {tag}
                </span>
              ))}
            </div>
          </ScrollSection>
        </div>
      </div>
    </section>

    {/* Features grid */}
    <section className="py-24 bg-card/30 border-y border-border">
      <div className="container">
        <ScrollSection>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-center mb-4">
            Une plateforme <span className="text-gradient">complète</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-center mb-16">
            Tout ce dont vous avez besoin pour gérer vos terrains, compétitions et performances sportives.
          </p>
        </ScrollSection>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <ScrollSection key={f.title} direction="up" className={`delay-${i}`} >
              <Link
                to={f.link}
                className="group gradient-card rounded-xl p-6 border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-2 block h-full"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <f.icon className="text-primary" size={26} />
                </div>
                <h3 className="font-display text-lg font-semibold mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                <div className="mt-4 flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  En savoir plus <ArrowRight size={14} className="ml-1" />
                </div>
              </Link>
            </ScrollSection>
          ))}
        </div>
      </div>
    </section>

    {/* Tech highlights with animated icons */}
    <section className="py-24">
      <div className="container">
        <ScrollSection>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-center mb-16">
            Technologie de <span className="text-gradient">pointe</span>
          </h2>
        </ScrollSection>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            { icon: Zap, title: "Temps Réel", desc: "WebSocket pour les scores et disponibilités en direct. Chaque action capturée instantanément." },
            { icon: Shield, title: "Sécurisé", desc: "Authentification JWT et chiffrement bcrypt. Vos données sont protégées à chaque niveau." },
            { icon: BarChart3, title: "Analytics IA", desc: "Analyse vidéo automatique, heatmaps et recommandations personnalisées par intelligence artificielle." },
          ].map((item, i) => (
            <ScrollSection key={item.title} direction="up">
              <div className="text-center group">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-500">
                  <item.icon className="text-primary" size={32} />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </ScrollSection>
          ))}
        </div>
      </div>
    </section>

    {/* App download / mobile section */}
    <section className="py-24 bg-card/30 border-y border-border">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <ScrollSection direction="left">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
              Disponible sur <span className="text-gradient">tous vos appareils</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
              Accédez à ULTIMA depuis votre navigateur, tablette ou smartphone. Réservez vos terrains, suivez les scores en direct et analysez vos performances où que vous soyez.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-muted border border-border">
                <Monitor size={24} className="text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Disponible sur</div>
                  <div className="font-semibold text-sm">Desktop</div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-muted border border-border">
                <Smartphone size={24} className="text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Disponible sur</div>
                  <div className="font-semibold text-sm">Mobile</div>
                </div>
              </div>
            </div>
          </ScrollSection>
          <ScrollSection direction="right">
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl" />
              <div className="relative gradient-card rounded-2xl border border-border p-8 space-y-4">
                {[
                  { icon: Calendar, label: "Réservation instantanée", sub: "Confirmez en un clic" },
                  { icon: Activity, label: "Scores en direct", sub: "Mise à jour WebSocket" },
                  { icon: Brain, label: "Analyse IA", sub: "Heatmaps & statistiques" },
                  { icon: Trophy, label: "Compétitions", sub: "Brackets en temps réel" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="text-primary" size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollSection>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-24">
      <div className="container">
        <ScrollSection direction="scale">
          <div className="gradient-card rounded-2xl p-12 md:p-16 border border-primary/20 text-center glow-yellow relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-float" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                Prêt à <span className="text-gradient">transformer</span> votre jeu ?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-10 text-lg">
                Rejoignez ULTIMA et découvrez la puissance de l'analyse sportive par intelligence artificielle.
              </p>
              <Link to="/signup">
                <Button size="lg" className="glow-yellow text-lg px-10 h-14">
                  Créer un compte gratuit <ArrowRight className="ml-2" size={20} />
                </Button>
              </Link>
            </div>
          </div>
        </ScrollSection>
      </div>
    </section>
  </Layout>
);

export default Index;
