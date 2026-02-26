import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLicense } from "@/contexts/LicenseContext";
import LicenseGate from "@/components/LicenseGate";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, loading, hasRole } = useAuth();
  const { isLoading: licenseLoading, needsLicense, canLogin } = useLicense();

  if (loading || licenseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole as any)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Super admins always bypass license gate
  if (!hasRole("super_admin" as any)) {
    if (!canLogin) {
      return <LicenseGate />;
    }
    if (needsLicense) {
      return <LicenseGate />;
    }
  }

  return <>{children}</>;
}
