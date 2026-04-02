import { Link } from "react-router-dom";
import ultimaLogo from "@/assets/ultima_logo.jpg";

const Footer = () => (
  <footer className="border-t border-border bg-card/50">
    <div className="container py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <img src={ultimaLogo} alt="ULTIMA" className="h-10 rounded mb-4" />
          <p className="text-sm text-muted-foreground">
            Innovation, Creation & Development. Plateforme intelligente de gestion sportive.
          </p>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold mb-3 text-primary">Plateforme</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/reservation" className="hover:text-foreground transition-colors">Réservation</Link>
            <Link to="/competitions" className="hover:text-foreground transition-colors">Compétitions</Link>
            <Link to="/live-scores" className="hover:text-foreground transition-colors">Scores Live</Link>
            <Link to="/performance" className="hover:text-foreground transition-colors">Performance</Link>
          </div>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold mb-3 text-primary">SmartPlay AI</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link to="/smartplay-ai" className="hover:text-foreground transition-colors">Analyse IA</Link>
            <span>Heatmaps</span>
            <span>Recommandations</span>
          </div>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold mb-3 text-primary">Contact</h4>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span>ultima.contactus@gmail.com</span>
            <span>Tunis - La Marsa</span>
            <span>+216 96 094 772</span>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
        © 2025 ULTIMA - Innovation, Creation & Development. Tous droits réservés.
      </div>
    </div>
  </footer>
);

export default Footer;
