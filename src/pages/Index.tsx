import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { Calendar, Trophy, Activity, Brain, ArrowRight, Zap, Shield, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Réservation de Terrains",
    desc: "Réservez vos terrains de padel et tennis en quelques clics. Confirmation par QR code.",
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

const stats = [
  { value: "500+", label: "Joueurs actifs" },
  { value: "12", label: "Terrains connectés" },
  { value: "150+", label: "Matchs analysés" },
  { value: "98%", label: "Satisfaction" },
];

const Index = () => (
  <Layout>
    {/* Hero */}
    <section className="relative overflow-hidden gradient-hero min-h-[90vh] flex items-center">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>
      <div className="container relative z-10 py-20">
        <div className="max-w-3xl animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Zap size={16} /> Propulsé par l'Intelligence Artificielle
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6">
            <span className="text-gradient">ULTIMA</span>
            <br />
            <span className="text-foreground/90">& SmartPlay AI</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 leading-relaxed">
            Plateforme web intelligente de gestion sportive et d'analyse de performance pour le padel et le tennis. Réservez, compétitionnez, analysez.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/signup">
              <Button size="lg" className="glow-yellow text-base px-8">
                Commencer <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
            <Link to="/smartplay-ai">
              <Button variant="outline" size="lg" className="text-base px-8 border-primary/30 text-primary hover:bg-primary/10">
                Découvrir l'IA
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* Stats */}
    <section className="border-y border-border bg-card/30">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-display font-bold text-primary">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Une plateforme <span className="text-gradient">complète</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tout ce dont vous avez besoin pour gérer vos terrains, compétitions et performances sportives.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Link
              key={f.title}
              to={f.link}
              className="group gradient-card rounded-xl p-6 border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="text-primary" size={24} />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* Tech highlights */}
    <section className="py-20 bg-card/30 border-y border-border">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Zap, title: "Temps Réel", desc: "WebSocket pour les scores et disponibilités en direct." },
            { icon: Shield, title: "Sécurisé", desc: "Authentification JWT et chiffrement bcrypt." },
            { icon: BarChart3, title: "Analytics IA", desc: "Analyse vidéo, heatmaps et recommandations personnalisées." },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="text-primary" size={20} />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20">
      <div className="container">
        <div className="gradient-card rounded-2xl p-12 border border-primary/20 text-center glow-yellow">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Prêt à <span className="text-gradient">transformer</span> votre jeu ?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Rejoignez ULTIMA et découvrez la puissance de l'analyse sportive par intelligence artificielle.
          </p>
          <Link to="/signup">
            <Button size="lg" className="glow-yellow text-base px-10">
              Créer un compte gratuit <ArrowRight className="ml-2" size={18} />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  </Layout>
);

export default Index;
