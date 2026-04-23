import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type Locale = "en" | "fr";

type Dictionary = Record<string, Record<Locale, string>>;

const dictionary: Dictionary = {
  "nav.home": { en: "Home", fr: "Accueil" },
  "nav.reservation": { en: "Reservation", fr: "Reservation" },
  "nav.competitions": { en: "Competitions", fr: "Competitions" },
  "nav.live": { en: "Live Scores", fr: "Scores Live" },
  "nav.performance": { en: "Performance", fr: "Performance" },
  "nav.smartplay": { en: "SmartPlay AI", fr: "SmartPlay AI" },
  "nav.coach": { en: "Coach", fr: "Coach" },
  "nav.connections": { en: "Connections", fr: "Relations" },
  "nav.login": { en: "Login", fr: "Connexion" },
  "nav.signup": { en: "Sign Up", fr: "S'inscrire" },
  "nav.profile": { en: "Profile", fr: "Profil" },
  "nav.logout": { en: "Logout", fr: "Deconnexion" },
  "nav.theme": { en: "Toggle theme", fr: "Changer le theme" },
  "nav.lang": { en: "Language", fr: "Langue" },

  "footer.about": { en: "ULTIMA helps players, coaches, and arena owners manage bookings, track performance, and run daily operations in one connected platform.", fr: "ULTIMA aide les joueurs, les coachs et les proprietaires d'arena a gerer les reservations, suivre la performance et piloter leurs operations sur une seule plateforme connectee." },
  "footer.aboutLink": { en: "About Us", fr: "A Propos" },
  "footer.platform": { en: "Platform", fr: "Plateforme" },
  "footer.ai": { en: "SmartPlay AI", fr: "SmartPlay AI" },
  "footer.analysis": { en: "AI Analysis", fr: "Analyse IA" },
  "footer.reco": { en: "Recommendations", fr: "Recommandations" },
  "footer.contact": { en: "Contact", fr: "Contact" },
  "footer.rights": { en: "All rights reserved.", fr: "Tous droits reserves." },

  "auth.login.title": { en: "Login", fr: "Connexion" },
  "auth.login.subtitle": { en: "Access your ULTIMA space", fr: "Accedez a votre espace ULTIMA" },
  "auth.email": { en: "Email", fr: "Email" },
  "auth.password": { en: "Password", fr: "Mot de passe" },
  "auth.placeholder.email": { en: "you@email.com", fr: "vous@email.com" },
  "auth.placeholder.password": { en: "********", fr: "********" },
  "auth.login.submit": { en: "Sign In", fr: "Se connecter" },
  "auth.login.loading": { en: "Signing in...", fr: "Connexion..." },
  "auth.login.noAccount": { en: "No account yet?", fr: "Pas encore de compte?" },
  "auth.signup.link": { en: "Sign up", fr: "S'inscrire" },

  "auth.signup.title": { en: "Sign Up", fr: "Inscription" },
  "auth.signup.subtitle": { en: "Create your ULTIMA account", fr: "Creez votre compte ULTIMA" },
  "auth.lastName": { en: "Last Name", fr: "Nom" },
  "auth.firstName": { en: "First Name", fr: "Prenom" },
  "auth.placeholder.lastName": { en: "Doe", fr: "Dupont" },
  "auth.placeholder.firstName": { en: "Jane", fr: "Lea" },
  "auth.role": { en: "Role", fr: "Role" },
  "auth.role.player": { en: "Player", fr: "Joueur" },
  "auth.role.coach": { en: "Coach", fr: "Entraineur" },
  "auth.arena": { en: "Arena", fr: "Arena" },
  "auth.chooseArena": { en: "Choose your arena", fr: "Choisissez votre arena" },
  "auth.allArenas": { en: "All arenas", fr: "Toutes les arenas" },
  "auth.signup.submit": { en: "Create Account", fr: "S'inscrire" },
  "auth.signup.loading": { en: "Creating account...", fr: "Inscription..." },
  "auth.signup.haveAccount": { en: "Already have an account?", fr: "Deja un compte?" },
  "auth.login.link": { en: "Sign in", fr: "Se connecter" },

  "coach.placeholder.sessionTitle": { en: "Session title", fr: "Titre de session" },
  "coach.option.individual": { en: "Individual coaching", fr: "Coaching individuel" },
  "coach.option.group": { en: "Group clinic", fr: "Clinique de groupe" },
  "coach.option.matchPractice": { en: "Match practice", fr: "Match practice" },
  "coach.placeholder.focusAreas": { en: "Focus areas (serve, return, tactics...)", fr: "Focus areas (service, retour, tactique...)" },
  "coach.placeholder.notes": { en: "Coach notes", fr: "Notes coach" },

  "reservation.chooseDate": { en: "Choose a date", fr: "Choisir une date" },
  "reservation.playersSuffix": { en: "players", fr: "joueurs" },
  "reservation.placeholder.participantEmail": { en: "player@email.com", fr: "email@joueur.com" },

  "home.hero.badge": { en: "Powered by Artificial Intelligence", fr: "Propulse par l'Intelligence Artificielle" },
  "home.hero.welcome": { en: "Welcome back,", fr: "Bon retour," },
  "home.hero.userText": { en: "Ready for a new match? Discover your stats and book your usual court.", fr: "Pret pour un nouveau match ? Decouvrez vos statistiques et reserves votre terrain habituel." },
  "home.hero.bookCourt": { en: "Book a Court", fr: "Reserver un terrain" },
  "home.hero.myStats": { en: "My Stats", fr: "Mes Stats" },
  "home.hero.guestText": { en: "Smart sports management and performance analytics platform.", fr: "Plateforme intelligente de gestion sportive et d'analyse de performance." },
  "home.hero.start": { en: "Get Started", fr: "Commencer" },
  "home.hero.login": { en: "Sign In", fr: "Se connecter" },
  "home.stats.matches": { en: "Matches", fr: "Matchs" },
  "home.stats.booked": { en: "Booked", fr: "Reserves" },
  "home.explore": { en: "Explore", fr: "Explorer" },
  "home.features.booking.title": { en: "Court Booking", fr: "Reservation de Terrains" },
  "home.features.booking.desc": { en: "Book padel and tennis courts in a few clicks.", fr: "Reservez vos terrains de padel et tennis en quelques clics." },
  "home.features.competitions.title": { en: "Competitions", fr: "Competitions" },
  "home.features.competitions.desc": { en: "Join tournaments with live rankings and updates.", fr: "Participez a des tournois avec classements en temps reel." },
  "home.features.live.title": { en: "Live Scores", fr: "Scores en Direct" },
  "home.features.live.desc": { en: "Track match scores through the SUMMA system.", fr: "Suivez les scores via le systeme SUMMA." },
  "home.features.ai.title": { en: "SmartPlay AI", fr: "SmartPlay AI" },
  "home.features.ai.desc": { en: "Intelligent performance analysis powered by AI.", fr: "Analyse intelligente des performances via IA." },
  "home.tech.title": { en: "The Future of Connected Sport", fr: "L'avenir du Sport Connecte" },
  "home.tech.title.prefix": { en: "The Future of", fr: "L'avenir du" },
  "home.tech.title.highlight": { en: "Connected Sport", fr: "Sport Connecte" },
  "home.tech.item1.t": { en: "AI Tracking", fr: "Tracking par IA" },
  "home.tech.item1.d": { en: "Automatic game stats capture through computer vision.", fr: "Capture automatique des statistiques de jeu via vision par ordinateur." },
  "home.tech.item2.t": { en: "SUMMA Kiosk", fr: "Kiosque SUMMA" },
  "home.tech.item2.d": { en: "Simplified score management directly on court.", fr: "Gestion simplifiee des scores sur le terrain." },
  "home.tech.item3.t": { en: "PersonaVision", fr: "PersonaVision" },
  "home.tech.item3.d": { en: "Auto-generated video clips of your best moments.", fr: "Generation automatique de clips video de vos meilleurs moments." },
};

type LocaleContextShape = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextShape | null>(null);

const STORAGE_KEY = "ultima-locale";

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "fr") return saved;
    return "en";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextShape>(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale((prev) => (prev === "en" ? "fr" : "en")),
      t: (key) => dictionary[key]?.[locale] ?? key,
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return context;
};
