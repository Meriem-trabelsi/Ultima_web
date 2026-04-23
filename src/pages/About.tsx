import Layout from "@/components/Layout";
import { useLocale } from "@/i18n/locale";

const About = () => {
  const { locale } = useLocale();

  const isFr = locale === "fr";

  return (
    <Layout>
      <section className="py-20">
        <div className="container max-w-5xl">
          <div className="rounded-3xl border border-primary/20 bg-card/70 backdrop-blur-md p-8 md:p-12">
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-bold mb-4">
              {isFr ? "A Propos D'ULTIMA" : "About ULTIMA"}
            </p>
            <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight mb-6">
              {isFr
                ? "Plateforme Web Intelligente de Gestion Sportive et d'Analyse de Performance"
                : "Intelligent Sports Management and Performance Analytics Platform"}
            </h1>
            <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
              {isFr
                ? "ULTIMA unifie la reservation des terrains, la gestion des competitions, les scores en temps reel et l'analyse de performance basee sur l'IA pour les clubs de padel et de tennis."
                : "ULTIMA unifies court booking, competition management, live scoring, and AI-powered performance analysis for padel and tennis clubs."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="rounded-2xl border border-border bg-card/60 p-6">
              <h2 className="text-xl font-bold mb-3">{isFr ? "Probleme a Resoudre" : "Problem We Solve"}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isFr
                  ? "Les clubs utilisent souvent des outils fragmentes qui ne synchronisent pas les disponibilites, les scores ou les donnees de performance. ULTIMA centralise ces flux dans une seule interface."
                  : "Many clubs still rely on fragmented tools that do not synchronize availability, scores, or performance data. ULTIMA centralizes these flows in one platform."}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-6">
              <h2 className="text-xl font-bold mb-3">{isFr ? "Objectif General" : "General Objective"}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isFr
                  ? "Offrir une solution complete pour les joueurs, coachs et administrateurs avec reservation intelligente, suivi des matchs et recommandations d'entrainement personnalisees."
                  : "Deliver a complete solution for players, coaches, and admins with intelligent booking, match tracking, and personalized training recommendations."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-6 mt-6">
            <h2 className="text-xl font-bold mb-4">{isFr ? "Methodologie & Architecture" : "Methodology & Architecture"}</h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>{isFr ? "Architecture modulaire client-serveur." : "Modular client-server architecture."}</li>
              <li>{isFr ? "Flux de reservation multi-etapes avec generation de ticket PDF + QR." : "Multi-step booking flow with PDF + QR ticket generation."}</li>
              <li>{isFr ? "Mise a jour en temps reel des disponibilites et scores via WebSocket." : "Real-time availability and score updates via WebSocket."}</li>
              <li>{isFr ? "Module SmartPlay AI pour analyse video, tracking et recommandations." : "SmartPlay AI module for video analysis, tracking, and recommendations."}</li>
              <li>{isFr ? "Execution du projet en Agile Scrum (sprints iteratifs)." : "Project delivery in Agile Scrum (iterative sprints)."}</li>
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
