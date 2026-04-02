import Layout from "@/components/Layout";
import { Brain, Upload, Video, BarChart3, Target, Cpu, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const aiFeatures = [
  { icon: Video, title: "Analyse Vidéo", desc: "Ingestion et prétraitement des vidéos de matchs pour extraction de données.", status: "placeholder" },
  { icon: Target, title: "Tracking Joueurs & Balle", desc: "Détection et suivi en temps réel via OpenCV et modèles deep learning.", status: "placeholder" },
  { icon: BarChart3, title: "Heatmaps de Déplacement", desc: "Visualisation des zones de jeu et des patterns de mouvement sur le terrain.", status: "placeholder" },
  { icon: Cpu, title: "Prédiction de Coups", desc: "Modèles ML pour prédire les schémas de jeu et anticiper les stratégies.", status: "placeholder" },
  { icon: Zap, title: "Recommandations IA", desc: "Suggestions d'entraînement personnalisées basées sur l'analyse des performances.", status: "placeholder" },
  { icon: Brain, title: "Analyse de Match Complète", desc: "Rapport détaillé post-match avec statistiques avancées et insights.", status: "placeholder" },
];

const SmartPlayAI = () => (
  <Layout>
    <div className="container py-12">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-display font-bold">SmartPlay AI</h1>
        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">Module IA</span>
      </div>
      <p className="text-muted-foreground mb-10">Analyse intelligente des performances sportives par intelligence artificielle</p>

      {/* Info banner */}
      <div className="gradient-card rounded-xl border border-primary/20 p-6 mb-10 flex items-start gap-4">
        <AlertCircle className="text-primary shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold mb-1">Module IA - Mode Démonstration</h3>
          <p className="text-sm text-muted-foreground">
            Ce module sera connecté aux modèles d'IA (TensorFlow, PyTorch, OpenCV) via le microservice Flask. 
            Les fonctionnalités ci-dessous montrent les capacités prévues du système SmartPlay AI.
            L'intégration avec le backend Python est en cours de développement.
          </p>
        </div>
      </div>

      {/* Upload section */}
      <div className="gradient-card rounded-xl border border-border p-8 mb-10 text-center">
        <Upload className="text-primary mx-auto mb-4" size={48} />
        <h2 className="font-display text-xl font-bold mb-2">Importer une Vidéo de Match</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Téléchargez votre vidéo de match pour lancer l'analyse IA automatique. Formats supportés : MP4, AVI, MOV.
        </p>
        <Button className="glow-yellow" onClick={() => toast.info("Fonctionnalité IA en mode démo - Import non disponible")}>
          <Upload size={16} className="mr-2" /> Sélectionner une vidéo
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Taille max : 500 Mo • Analyse en ~5 minutes
        </p>
      </div>

      {/* AI Features grid */}
      <h2 className="font-display text-xl font-semibold mb-6">Capacités du Module IA</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {aiFeatures.map((f) => (
          <div key={f.title} className="gradient-card rounded-xl border border-border p-6 hover:border-primary/30 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <f.icon className="text-primary" size={20} />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                À intégrer
              </span>
            </div>
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div className="gradient-card rounded-xl border border-border p-8">
        <h2 className="font-display text-xl font-bold mb-6 text-center">Stack Technique IA</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { name: "TensorFlow", desc: "Deep Learning" },
            { name: "PyTorch", desc: "Modèles ML" },
            { name: "OpenCV", desc: "Vision par ordinateur" },
            { name: "Flask", desc: "Microservice API" },
            { name: "Pandas", desc: "Traitement données" },
            { name: "scikit-learn", desc: "Machine Learning" },
            { name: "Plotly", desc: "Visualisation" },
            { name: "NumPy", desc: "Calcul numérique" },
          ].map((tech) => (
            <div key={tech.name} className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="font-display text-sm font-semibold text-primary">{tech.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{tech.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Layout>
);

export default SmartPlayAI;
