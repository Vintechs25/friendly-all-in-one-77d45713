import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ManagerPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  onAuthorized: () => void;
}

export default function ManagerPinDialog({ open, onOpenChange, actionLabel, onAuthorized }: ManagerPinDialogProps) {
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { profile } = useAuth();

  const handleVerify = async () => {
    if (!pin || pin.length < 4) {
      toast.error("Enter a valid PIN");
      return;
    }
    setVerifying(true);
    try {
      // Look up a manager/owner profile with this PIN in the same business
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name")
        .eq("business_id", profile?.business_id ?? "")
        .eq("pin_code", pin)
        .limit(1)
        .single();

      if (error || !data) {
        toast.error("Invalid PIN");
        setPin("");
        setVerifying(false);
        return;
      }

      // Verify the user has manager+ role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user_id);

      const authorizedRoles = ["business_owner", "manager", "branch_manager", "super_admin"];
      const hasAuth = roles?.some((r) => authorizedRoles.includes(r.role));

      if (!hasAuth) {
        toast.error("This PIN does not belong to an authorized manager");
        setPin("");
        setVerifying(false);
        return;
      }

      toast.success(`Authorized by ${data.full_name}`);
      setPin("");
      onOpenChange(false);
      onAuthorized();
    } catch {
      toast.error("Authorization failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Manager Authorization
          </DialogTitle>
          <DialogDescription>
            Enter a manager PIN to authorize: <strong>{actionLabel}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Manager PIN</Label>
          <Input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            maxLength={8}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setPin(""); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={verifying || !pin}>
            {verifying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</> : "Authorize"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
