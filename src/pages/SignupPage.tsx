import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Self-registration is disabled. Users can only log in with credentials
  // provided by the Platform Owner or their Business Owner.

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-primary-foreground">SwiftPOS</span>
          </div>
          <h2 className="font-display text-3xl font-bold text-primary-foreground mb-4">
            Enterprise POS Platform
          </h2>
          <p className="text-primary-foreground/60 text-lg">
            Businesses are provisioned by the platform administrator. Contact your administrator to get started.
          </p>
          <div className="mt-8 space-y-4">
            {["Multi-tenant architecture", "Role-based access control", "Branch-level isolation", "Enterprise-grade security"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-primary-foreground/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">SwiftPOS</span>
          </div>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
              <ShieldAlert className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Registration Restricted</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Self-registration is not available. Businesses are created by the platform administrator. 
              If you already have credentials, please sign in below.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email || !password) {
                toast.error("Please enter your credentials");
                return;
              }
              setLoading(true);
              try {
                const { error } = await signIn(email, password);
                if (error) {
                  toast.error(error.message);
                } else {
                  navigate("/dashboard");
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
          <p className="mt-4 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
