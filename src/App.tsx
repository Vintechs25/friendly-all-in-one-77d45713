import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LicenseProvider } from "@/contexts/LicenseContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import POSPage from "./pages/POSPage";
import InventoryPage from "./pages/InventoryPage";
import SalesPage from "./pages/SalesPage";
import ReportsPage from "./pages/ReportsPage";
import CustomersPage from "./pages/CustomersPage";
import ShiftsPage from "./pages/ShiftsPage";
import RefundsPage from "./pages/RefundsPage";
import SettingsPage from "./pages/SettingsPage";
import SuppliersPage from "./pages/SuppliersPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import StockAdjustmentsPage from "./pages/StockAdjustmentsPage";
import StockTransfersPage from "./pages/StockTransfersPage";
import TeamPage from "./pages/TeamPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminBusinessesPage from "./pages/admin/AdminBusinessesPage";
import AdminPlansPage from "./pages/admin/AdminPlansPage";
import AdminFeaturesPage from "./pages/admin/AdminFeaturesPage";
import AdminLicensesPage from "./pages/admin/AdminLicensesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LicenseProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/dashboard/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
              <Route path="/dashboard/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
              <Route path="/dashboard/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
              <Route path="/dashboard/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
              <Route path="/dashboard/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
              <Route path="/dashboard/shifts" element={<ProtectedRoute><ShiftsPage /></ProtectedRoute>} />
              <Route path="/dashboard/refunds" element={<ProtectedRoute><RefundsPage /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/dashboard/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
              <Route path="/dashboard/purchase-orders" element={<ProtectedRoute><PurchaseOrdersPage /></ProtectedRoute>} />
              <Route path="/dashboard/stock-adjustments" element={<ProtectedRoute><StockAdjustmentsPage /></ProtectedRoute>} />
              <Route path="/dashboard/stock-transfers" element={<ProtectedRoute><StockTransfersPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requiredRole="super_admin"><AdminDashboardPage /></ProtectedRoute>} />
              <Route path="/admin/businesses" element={<ProtectedRoute requiredRole="super_admin"><AdminBusinessesPage /></ProtectedRoute>} />
              <Route path="/admin/plans" element={<ProtectedRoute requiredRole="super_admin"><AdminPlansPage /></ProtectedRoute>} />
              <Route path="/admin/features" element={<ProtectedRoute requiredRole="super_admin"><AdminFeaturesPage /></ProtectedRoute>} />
              <Route path="/admin/licenses" element={<ProtectedRoute requiredRole="super_admin"><AdminLicensesPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LicenseProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
