import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Banknote, CreditCard, Smartphone, Plus, Trash2, Calculator,
  Wallet, Gift, Search, Loader2,
} from "lucide-react";
import NumericKeypad from "./NumericKeypad";
import { PaymentEntry, PaymentMethod } from "./types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const methodIcons: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  mobile_money: <Smartphone className="h-4 w-4" />,
  store_credit: <Wallet className="h-4 w-4" />,
  gift_card: <Gift className="h-4 w-4" />,
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "M-Pesa",
  store_credit: "Credit",
  gift_card: "Gift Card",
};

interface SplitPaymentPanelProps {
  total: number;
  payments: PaymentEntry[];
  onPaymentsChange: (payments: PaymentEntry[]) => void;
  splitMode: boolean;
  onToggleSplit: () => void;
  cashTendered: number;
  onCashTenderedChange: (v: number) => void;
  businessId: string | null;
  customerId?: string | null;
  customerCreditBalance?: number;
}

export default function SplitPaymentPanel({
  total,
  payments,
  onPaymentsChange,
  splitMode,
  onToggleSplit,
  cashTendered,
  onCashTenderedChange,
  businessId,
  customerId,
  customerCreditBalance = 0,
}: SplitPaymentPanelProps) {
  const [showMpesaDialog, setShowMpesaDialog] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [showGiftCardDialog, setShowGiftCardDialog] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardId, setGiftCardId] = useState<string | null>(null);
  const [giftCardLoading, setGiftCardLoading] = useState(false);

  const allocated = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - allocated);
  const hasCash = payments.some((p) => p.method === "cash");
  const cashEntry = payments.find((p) => p.method === "cash");
  const changeAmount = hasCash && cashTendered > 0
    ? Math.max(0, cashTendered - (cashEntry?.amount ?? 0))
    : 0;

  const handleMpesaSTK = async () => {
    if (!mpesaPhone) { toast.error("Enter phone number"); return; }
    setMpesaLoading(true);
    try {
      const mpesaAmount = splitMode
        ? payments.find((p) => p.method === "mobile_money")?.amount ?? total
        : total;

      const { data, error } = await supabase.functions.invoke("mpesa-stk", {
        body: {
          action: "stk_push",
          phone: mpesaPhone,
          amount: mpesaAmount,
          account_reference: "POS Sale",
        },
      });

      if (error) throw error;
      if (data?.success) {
        toast.success("STK Push sent! Check your phone to complete payment.");
        setShowMpesaDialog(false);
        // Store checkout_request_id as reference
        if (!splitMode) {
          onPaymentsChange([{ method: "mobile_money", amount: total, reference: data.checkout_request_id }]);
        } else {
          const updated = payments.map((p) =>
            p.method === "mobile_money" ? { ...p, reference: data.checkout_request_id } : p
          );
          onPaymentsChange(updated);
        }
      } else {
        toast.error(data?.error || "STK Push failed");
      }
    } catch (err: any) {
      toast.error(err.message || "M-Pesa error");
    } finally {
      setMpesaLoading(false);
    }
  };

  const lookupGiftCard = async () => {
    if (!giftCardCode || !businessId) return;
    setGiftCardLoading(true);
    const { data, error } = await supabase
      .from("gift_cards")
      .select("id, balance, is_active, expires_at")
      .eq("business_id", businessId)
      .eq("code", giftCardCode.toUpperCase())
      .single();

    if (error || !data) {
      toast.error("Gift card not found");
      setGiftCardBalance(null);
      setGiftCardId(null);
    } else if (!data.is_active) {
      toast.error("Gift card is inactive");
      setGiftCardBalance(null);
    } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error("Gift card has expired");
      setGiftCardBalance(null);
    } else {
      setGiftCardBalance(data.balance);
      setGiftCardId(data.id);
    }
    setGiftCardLoading(false);
  };

  const applyGiftCard = () => {
    if (giftCardBalance === null || giftCardBalance <= 0) return;
    const useAmount = Math.min(giftCardBalance, splitMode ? remaining : total);
    if (splitMode) {
      onPaymentsChange([...payments, { method: "gift_card", amount: useAmount, reference: giftCardCode.toUpperCase() }]);
    } else {
      onPaymentsChange([{ method: "gift_card", amount: useAmount, reference: giftCardCode.toUpperCase() }]);
    }
    setShowGiftCardDialog(false);
    setGiftCardCode("");
    setGiftCardBalance(null);
    toast.success(`Gift card applied: KSh ${useAmount.toFixed(2)}`);
  };

  const applyStoreCredit = () => {
    if (!customerId || customerCreditBalance <= 0) {
      toast.error("No store credit available for this customer");
      return;
    }
    const useAmount = Math.min(customerCreditBalance, splitMode ? remaining : total);
    if (splitMode) {
      onPaymentsChange([...payments, { method: "store_credit", amount: useAmount }]);
    } else {
      onPaymentsChange([{ method: "store_credit", amount: useAmount }]);
    }
    toast.success(`Store credit applied: KSh ${useAmount.toFixed(2)}`);
  };

  const selectMethod = (m: PaymentMethod) => {
    if (m === "mobile_money") {
      if (!splitMode) onPaymentsChange([{ method: m, amount: total }]);
      setShowMpesaDialog(true);
      return;
    }
    if (m === "gift_card") {
      setShowGiftCardDialog(true);
      return;
    }
    if (m === "store_credit") {
      applyStoreCredit();
      return;
    }
    onPaymentsChange([{ method: m, amount: total }]);
  };

  const allMethods: PaymentMethod[] = ["cash", "card", "mobile_money", "store_credit", "gift_card"];

  if (!splitMode) {
    const selectedMethod = payments[0]?.method ?? "cash";
    return (
      <div className="space-y-2.5">
        <div className="grid grid-cols-5 gap-1.5">
          {allMethods.map((m) => (
            <Button
              key={m}
              variant={selectedMethod === m ? "default" : "outline"}
              size="sm"
              className="flex-col h-auto py-2.5 gap-1 px-1 rounded-xl touch-manipulation active:scale-95 transition-all"
              onClick={() => selectMethod(m)}
            >
              {methodIcons[m]}
              <span className="text-[9px] leading-tight font-semibold">{methodLabels[m]}</span>
            </Button>
          ))}
        </div>

        {selectedMethod === "cash" && (
          <NumericKeypad
            value={cashTendered}
            onChange={onCashTenderedChange}
            total={total}
          />
        )}

        {selectedMethod === "mobile_money" && payments[0]?.reference && (
          <p className="text-xs text-muted-foreground">
            STK Push sent. Till confirmation pending...
          </p>
        )}

        <Button variant="ghost" size="sm" className="w-full h-8 text-xs gap-1.5 rounded-lg" onClick={onToggleSplit}>
          <Calculator className="h-3.5 w-3.5" /> Split Payment
        </Button>

        {/* M-Pesa Dialog */}
        <MpesaDialog
          open={showMpesaDialog}
          onOpenChange={setShowMpesaDialog}
          phone={mpesaPhone}
          onPhoneChange={setMpesaPhone}
          loading={mpesaLoading}
          onSubmit={handleMpesaSTK}
          amount={total}
        />

        {/* Gift Card Dialog */}
        <GiftCardDialog
          open={showGiftCardDialog}
          onOpenChange={setShowGiftCardDialog}
          code={giftCardCode}
          onCodeChange={setGiftCardCode}
          balance={giftCardBalance}
          loading={giftCardLoading}
          onLookup={lookupGiftCard}
          onApply={applyGiftCard}
        />
      </div>
    );
  }

  // Split payment mode
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Split Payment</Label>
        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={onToggleSplit}>
          Cancel Split
        </Button>
      </div>

      {payments.map((entry, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex gap-0.5 shrink-0">
            {allMethods.map((m) => (
              <button
                key={m}
                onClick={() => {
                  if (m === "mobile_money") { setShowMpesaDialog(true); }
                  if (m === "gift_card") { setShowGiftCardDialog(true); return; }
                  if (m === "store_credit") { applyStoreCredit(); return; }
                  const updated = [...payments];
                  updated[i] = { ...updated[i], method: m };
                  onPaymentsChange(updated);
                }}
                className={`h-6 w-6 rounded flex items-center justify-center ${
                  entry.method === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span className="scale-75">{methodIcons[m]}</span>
              </button>
            ))}
          </div>
          <Input
            type="number"
            value={entry.amount || ""}
            onChange={(e) => {
              const updated = [...payments];
              updated[i] = { ...updated[i], amount: parseFloat(e.target.value) || 0 };
              onPaymentsChange(updated);
            }}
            className="h-7 text-sm flex-1"
            min="0"
            step="0.01"
          />
          <span className="text-[9px] text-muted-foreground w-10 truncate">{methodLabels[entry.method]}</span>
          {payments.length > 1 && (
            <button
              onClick={() => onPaymentsChange(payments.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      {remaining > 0 && (
        <p className="text-xs text-destructive">Remaining: KSh {remaining.toFixed(2)}</p>
      )}
      {remaining <= 0 && allocated >= total && (
        <p className="text-xs text-success">Fully allocated ✓</p>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-xs gap-1"
        onClick={() =>
          onPaymentsChange([...payments, { method: "cash", amount: remaining }])
        }
      >
        <Plus className="h-3 w-3" /> Add Payment Method
      </Button>

      {hasCash && (
        <NumericKeypad
          value={cashTendered}
          onChange={onCashTenderedChange}
          total={cashEntry?.amount ?? total}
        />
      )}

      {/* M-Pesa Dialog */}
      <MpesaDialog
        open={showMpesaDialog}
        onOpenChange={setShowMpesaDialog}
        phone={mpesaPhone}
        onPhoneChange={setMpesaPhone}
        loading={mpesaLoading}
        onSubmit={handleMpesaSTK}
        amount={payments.find((p) => p.method === "mobile_money")?.amount ?? remaining}
      />

      {/* Gift Card Dialog */}
      <GiftCardDialog
        open={showGiftCardDialog}
        onOpenChange={setShowGiftCardDialog}
        code={giftCardCode}
        onCodeChange={setGiftCardCode}
        balance={giftCardBalance}
        loading={giftCardLoading}
        onLookup={lookupGiftCard}
        onApply={applyGiftCard}
      />
    </div>
  );
}

// M-Pesa STK Push Dialog
function MpesaDialog({
  open, onOpenChange, phone, onPhoneChange, loading, onSubmit, amount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  amount: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> M-Pesa Payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-center">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">KSh {amount.toFixed(2)}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Customer Phone Number</Label>
            <Input
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="0712345678 or 254712345678"
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground">An STK Push will be sent to this number</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Smartphone className="h-4 w-4 mr-2" />}
            Send STK Push
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Gift Card Dialog
function GiftCardDialog({
  open, onOpenChange, code, onCodeChange, balance, loading, onLookup, onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  code: string;
  onCodeChange: (v: string) => void;
  balance: number | null;
  loading: boolean;
  onLookup: () => void;
  onApply: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" /> Gift Card Payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
              placeholder="Enter gift card code"
              className="h-9 flex-1 font-mono"
            />
            <Button onClick={onLookup} disabled={loading || !code} size="sm" className="h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {balance !== null && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
              <p className="text-xs text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-primary">KSh {balance.toFixed(2)}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onApply} disabled={balance === null || balance <= 0}>
            Apply Gift Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
