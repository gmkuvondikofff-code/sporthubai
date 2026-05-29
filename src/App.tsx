import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AdminVerifyPin from "./pages/AdminVerifyPin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProtected from "./components/admin/AdminProtected";
import SportPage from "./pages/SportPage";
import TableTennisHub from "./pages/TableTennisHub";
import TTCompetitions from "./pages/TTCompetitions";
import TTSection from "./pages/TTSection";
import TTGame3D from "./pages/TTGame3D";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <LanguageProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Navbar />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sport/:sportId" element={<SportPage />} />
                <Route path="/tt-hub" element={<TableTennisHub />} />
                <Route path="/tt-hub/competitions" element={<TTCompetitions />} />
                <Route path="/tt-hub/section/:section" element={<TTSection />} />
                <Route path="/tt-hub/game" element={<TTGame3D />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/verify-pin" element={<AdminVerifyPin />} />
                <Route
                  path="/admin-dashboard/*"
                  element={
                    <AdminProtected>
                      <AdminDashboard />
                    </AdminProtected>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </LanguageProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
