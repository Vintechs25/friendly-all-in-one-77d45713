import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Clock, Play, Square, Loader2, DollarSign, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Shift {
  id: string;
  cashier_id: string;
  branch_id: string;
  started_at: string;
  ended_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_variance: number | null;
  total_sales: number;
  total_transactions: number;
  notes: string | null;
  status: string;
}

export default function ShiftsPage() {
  const { user, profile } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [openShift, setOpenShift] = useState<Shift | null>(null);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("0");
  const [closeNotes, setCloseNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const businessId = profile?.business_id;

  const loadShifts = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data } = await supabase
      .from("cashier_shifts")
      .select("*")
      .eq("business_id", businessId)
      .order("started_at", { ascending: false })
      .limit(50);

    const all = (data ?? []) as Shift[];
    setShifts(all);
    // Find current user's open shift
    const myOpen = all.find(s => s.cashier_id === user?.id && s.status === "open");
    setOpenShift(myOpen ?? null);
    setLoading(false);
  }, [businessId, user?.id]);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const handleOpenShift = async () => {
    if (!user || !businessId) return;
    setSaving(true);
    try {
      const { data: branches } = await supabase
        .from("branches").select("id").eq("business_id", businessId).eq("is_active", true).limit(1);
      const branchId = branches?.[0]?.id;
      if (!branchId) { toast.error("No active branch"); return; }

      const { error } = await supabase.from("cashier_shifts").insert({
        business_id: businessId,
        branch_id: branchId,
        cashier_id: user.id,
        opening_cash: parseFloat(openingCash) || 0,
        status: "open",
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Shift opened!");
      setShowOpenDialog(false);
      setOpeningCash("0");
      loadShifts();
    } finally { setSaving(false); }
  };

  const handleCloseShift = async () => {
    if (!openShift) return;
    setSaving(true);
    try {
      // Calculate expected cash: opening + cash sales during shift
      const { data: sales } = await supabase
        .from("sales")
        .select("total, payment_method")
        .eq("business_id", businessId!)
        .eq("cashier_id", user!.id)
        .eq("status", "completed")
        .eq("payment_method", "cash")
        .gte("created_at", openShift.started_at);

      const cashSales = (sales ?? []).reduce((s, r) => s + Number(r.total), 0);
      const totalSalesRes = await supabase
        .from("sales")
        .select("total")
        .eq("business_id", businessId!)
        .eq("cashier_id", user!.id)
        .eq("status", "completed")
        .gte("created_at", openShift.started_at);

      const totalSales = (totalSalesRes.data ?? []).reduce((s, r) => s + Number(r.total), 0);
      const totalTx = totalSalesRes.data?.length ?? 0;
      const closing = parseFloat(closingCash) || 0;
      const expected = openShift.opening_cash + cashSales;
      const variance = closing - expected;

      const { error } = await supabase.from("cashier_shifts").update({
        ended_at: new Date().toISOString(),
        closing_cash: closing,
        expected_cash: expected,
        cash_variance: variance,
        total_sales: totalSales,
        total_transactions: totalTx,
        notes: closeNotes || null,
        status: "closed",
      }).eq("id", openShift.id);

      if (error) { toast.error(error.message); return; }
      toast.success("Shift closed!");
      setShowCloseDialog(false);
      setClosingCash("0");
      setCloseNotes("");
      loadShifts();
    } finally { setSaving(false); }
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Cashier Shifts</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage shift open/close and cash reconciliation</p>
          </div>
          {openShift ? (
            <Button variant="destructive" onClick={() => setShowCloseDialog(true)}>
              <Square className="h-4 w-4 mr-2" /> Close Current Shift
            </Button>
          ) : (
            <Button onClick={() => setShowOpenDialog(true)}>
              <Play className="h-4 w-4 mr-2" /> Open Shift
            </Button>
          )}
        </div>

        {/* Active shift banner */}
        {openShift && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <Clock className="h-5 w-5 text-primary shrink-0 animate-pulse" />
            <div>
              <p className="text-sm font-medium">Shift active since {fmtTime(openShift.started_at)}</p>
              <p className="text-xs text-muted-foreground">Opening cash: {fmt(openShift.opening_cash)}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Clock className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No shifts recorded yet</p>
            <p className="text-xs mt-1">Open a shift to start tracking</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Started</th>
                    <th className="text-left font-medium p-4 hidden sm:table-cell">Ended</th>
                    <th className="text-right font-medium p-4">Opening</th>
                    <th className="text-right font-medium p-4 hidden md:table-cell">Closing</th>
                    <th className="text-right font-medium p-4 hidden md:table-cell">Expected</th>
                    <th className="text-right font-medium p-4">Variance</th>
                    <th className="text-right font-medium p-4 hidden sm:table-cell">Sales</th>
                    <th className="text-center font-medium p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{fmtTime(s.started_at)}</td>
                      <td className="p-4 hidden sm:table-cell text-muted-foreground">{s.ended_at ? fmtTime(s.ended_at) : "—"}</td>
                      <td className="p-4 text-right">{fmt(s.opening_cash)}</td>
                      <td className="p-4 text-right hidden md:table-cell">{s.closing_cash != null ? fmt(s.closing_cash) : "—"}</td>
                      <td className="p-4 text-right hidden md:table-cell">{s.expected_cash != null ? fmt(s.expected_cash) : "—"}</td>
                      <td className="p-4 text-right">
                        {s.cash_variance != null ? (
                          <span className={s.cash_variance < 0 ? "text-destructive font-semibold" : s.cash_variance > 0 ? "text-green-600 font-semibold" : ""}>
                            {s.cash_variance > 0 ? "+" : ""}{fmt(s.cash_variance)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-4 text-right hidden sm:table-cell font-semibold">{fmt(s.total_sales)}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          s.status === "open" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {s.status === "open" ? "Active" : "Closed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Open Shift Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Open New Shift</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Opening Cash Amount ($)</Label>
              <Input type="number" step="0.01" min="0" value={openingCash} onChange={e => setOpeningCash(e.target.value)} />
              <p className="text-xs text-muted-foreground">Count the cash in your register drawer</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleOpenShift} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Open Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close Current Shift</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs">Count all cash in your register including the opening amount</p>
            </div>
            <div className="space-y-2">
              <Label>Closing Cash Amount ($)</Label>
              <Input type="number" step="0.01" min="0" value={closingCash} onChange={e => setClosingCash(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Any notes about the shift..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleCloseShift} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Square className="h-4 w-4 mr-2" />}
              Close Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
