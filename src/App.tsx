import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import Coaches from "./pages/Coaches";
import CoachProfilePage from "./pages/CoachProfilePage";
import CoachProfileEditor from "./pages/CoachProfileEditor";
import CoachAvailability from "./pages/CoachAvailability";
import CoachRequests from "./pages/CoachRequests";
import CoachingRequests from "./pages/CoachingRequests";
import Connections from "./pages/Connections";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ReservationChoice from "./pages/ReservationChoice";
import CoachBooking from "./pages/CoachBooking";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import LiveSessionPage from "./pages/LiveSessionPage";

const queryClient = new QueryClient();

// Redirect to login when the refresh token expires / is invalid
if (typeof window !== "undefined") {
  window.addEventListener("auth:session-expired", () => {
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  });
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LocaleProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/about-us" element={<About />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/padel" element={<Navigate to="/reservation" replace />} />
              <Route path="/padel/:id" element={<Navigate to="/reservation" replace />} />

              {/* Protected Routes */}
              <Route
                path="/reservation"
                element={<AuthGuard><ReservationChoice /></AuthGuard>}
              />
              <Route
                path="/reservation/court"
                element={<AuthGuard><Reservation /></AuthGuard>}
              />
              <Route
                path="/reservation/coach"
                element={<AuthGuard><CoachBooking /></AuthGuard>}
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
                path="/live-sessions/:id"
                element={<LiveSessionPage />}
              />
              <Route
                path="/coach"
                element={<AuthGuard requireCoach><Coach /></AuthGuard>}
              />
              {/* Coaching system */}
              <Route
                path="/coaches"
                element={<AuthGuard><Coaches /></AuthGuard>}
              />
              <Route
                path="/coaches/:id"
                element={<AuthGuard><CoachProfilePage /></AuthGuard>}
              />
              <Route
                path="/coach/profile"
                element={<AuthGuard requireCoach><CoachProfileEditor /></AuthGuard>}
              />
              <Route
                path="/coach/availability"
                element={<AuthGuard requireCoach><CoachAvailability /></AuthGuard>}
              />
              <Route
                path="/coach/requests"
                element={<AuthGuard requireCoach><CoachRequests /></AuthGuard>}
              />
              <Route
                path="/coaching-requests"
                element={<AuthGuard><CoachingRequests /></AuthGuard>}
              />

              {/* Admin section protected with role requirement */}
              <Route 
                path="/admin" 
                element={<AuthGuard requireAdmin><Admin /></AuthGuard>} 
              />
              
              {/* Stripe payment return pages — no auth guard needed (Stripe redirects here) */}
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancel" element={<PaymentCancel />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </LocaleProvider>
  </QueryClientProvider>
);

export default App;
