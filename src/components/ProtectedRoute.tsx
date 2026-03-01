import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLicense } from "@/contexts/LicenseContext";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import LicenseGate from "@/components/LicenseGate";
import { canAccessRoute } from "@/lib/role-access";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  skipBusinessCheck?: boolean;
}

function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm">
          You do not have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, requiredRole, skipBusinessCheck }: ProtectedRouteProps) {
  const { session, profile, loading, hasRole, roles } = useAuth();
  const { isLoading: licenseLoading, needsLicense, canLogin } = useLicense();
  const { isRouteAllowedByFeature, isLoading: featureLoading } = useFeatureToggles();
  const location = useLocation();

  if (loading || licenseLoading || featureLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Users without a business_id (except super_admins) see a "no business" message
  if (
    !skipBusinessCheck &&
    !requiredRole &&
    profile &&
    !profile.business_id &&
    !hasRole("super_admin" as any)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h2 className="text-xl font-bold">No Business Assigned</h2>
          <p className="text-muted-foreground text-sm">
            Your account has not been linked to a business yet. Please contact your platform administrator to get set up.
          </p>
          <button
            onClick={() => window.location.href = "/login"}
            className="text-sm text-primary hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole as any)) {
    return <AccessDenied />;
  }

  // Role-based route enforcement
  if (!requiredRole && roles.length > 0 && !canAccessRoute(roles, location.pathname)) {
    return <AccessDenied />;
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

  // Check feature toggles for the current route
  if (!hasRole("super_admin" as any) && !isRouteAllowedByFeature(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
