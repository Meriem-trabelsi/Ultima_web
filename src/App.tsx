import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { LocaleProvider } from "@/i18n/locale";
import AuthGuard from "./components/AuthGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Reservation from "./pages/Reservation";
import Competitions from "./pages/Competitions";
import LiveScores from "./pages/LiveScores";
import Performance from "./pages/Performance";
import SmartPlayAI from "./pages/SmartPlayAI";
import Admin from "./pages/Admin";
import CompetitionDetails from "./pages/CompetitionDetails";
import Coach from "./pages/Coach";
import Connections from "./pages/Connections";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/about-us" element={<About />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              
              {/* Protected Routes */}
              <Route 
                path="/reservation" 
                element={<AuthGuard><Reservation /></AuthGuard>} 
              />
              <Route 
                path="/competitions" 
                element={<AuthGuard><Competitions /></AuthGuard>} 
              />
              <Route 
                path="/competitions/:id" 
                element={<AuthGuard><CompetitionDetails /></AuthGuard>} 
              />
              <Route 
                path="/live-scores" 
                element={<AuthGuard><LiveScores /></AuthGuard>} 
              />
              <Route 
                path="/performance" 
                element={<AuthGuard><Performance /></AuthGuard>} 
              />
              <Route
                path="/connections"
                element={<AuthGuard><Connections /></AuthGuard>}
              />
              <Route 
                path="/smartplay-ai" 
                element={<AuthGuard><SmartPlayAI /></AuthGuard>} 
              />
              <Route
                path="/coach"
                element={<AuthGuard requireCoach><Coach /></AuthGuard>}
              />
              
              {/* Admin section protected with role requirement */}
              <Route 
                path="/admin" 
                element={<AuthGuard requireAdmin><Admin /></AuthGuard>} 
              />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
