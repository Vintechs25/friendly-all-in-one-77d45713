import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import POSPage from "./pages/POSPage";
import InventoryPage from "./pages/InventoryPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminBusinessesPage from "./pages/admin/AdminBusinessesPage";
import AdminPlansPage from "./pages/admin/AdminPlansPage";
import AdminFeaturesPage from "./pages/admin/AdminFeaturesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/dashboard/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
            <Route path="/dashboard/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="super_admin"><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/businesses" element={<ProtectedRoute requiredRole="super_admin"><AdminBusinessesPage /></ProtectedRoute>} />
            <Route path="/admin/plans" element={<ProtectedRoute requiredRole="super_admin"><AdminPlansPage /></ProtectedRoute>} />
            <Route path="/admin/features" element={<ProtectedRoute requiredRole="super_admin"><AdminFeaturesPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
