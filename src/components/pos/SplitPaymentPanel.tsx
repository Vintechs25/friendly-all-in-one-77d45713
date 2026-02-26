import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, CreditCard, Smartphone, Plus, Trash2, Calculator } from "lucide-react";
import { PaymentEntry, PaymentMethod } from "./types";

const methodIcons: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  mobile_money: <Smartphone className="h-4 w-4" />,
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile",
};

interface SplitPaymentPanelProps {
  total: number;
  payments: PaymentEntry[];
  onPaymentsChange: (payments: PaymentEntry[]) => void;
  splitMode: boolean;
  onToggleSplit: () => void;
  cashTendered: number;
  onCashTenderedChange: (v: number) => void;
}

export default function SplitPaymentPanel({
  total,
  payments,
  onPaymentsChange,
  splitMode,
  onToggleSplit,
  cashTendered,
  onCashTenderedChange,
}: SplitPaymentPanelProps) {
  const allocated = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - allocated);
  const hasCash = payments.some((p) => p.method === "cash");
  const cashEntry = payments.find((p) => p.method === "cash");
  const changeAmount = hasCash && cashTendered > 0
    ? Math.max(0, cashTendered - (cashEntry?.amount ?? 0))
    : 0;

  if (!splitMode) {
    // Single payment mode
    const selectedMethod = payments[0]?.method ?? "cash";
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {(["cash", "card", "mobile_money"] as PaymentMethod[]).map((m) => (
            <Button
              key={m}
              variant={selectedMethod === m ? "default" : "outline"}
              size="sm"
              className="flex-col h-auto py-2.5 gap-1"
              onClick={() => onPaymentsChange([{ method: m, amount: total }])}
            >
              {methodIcons[m]}
              <span className="text-[10px]">{methodLabels[m]}</span>
            </Button>
          ))}
        </div>

        {selectedMethod === "cash" && (
          <div className="space-y-1">
            <Label className="text-xs">Cash Tendered</Label>
            <Input
              type="number"
              value={cashTendered || ""}
              onChange={(e) => onCashTenderedChange(parseFloat(e.target.value) || 0)}
              placeholder={total.toFixed(2)}
              className="h-8"
              min="0"
              step="0.01"
            />
            {cashTendered >= total && cashTendered > 0 && (
              <p className="text-sm font-semibold text-green-600">
                Change: ${(cashTendered - total).toFixed(2)}
              </p>
            )}
          </div>
        )}

        <Button variant="ghost" size="sm" className="w-full h-7 text-xs gap-1" onClick={onToggleSplit}>
          <Calculator className="h-3 w-3" /> Split Payment
        </Button>
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
        <div key={i} className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {(["cash", "card", "mobile_money"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  const updated = [...payments];
                  updated[i] = { ...updated[i], method: m };
                  onPaymentsChange(updated);
                }}
                className={`h-7 w-7 rounded flex items-center justify-center text-xs ${
                  entry.method === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {methodIcons[m]}
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
        <p className="text-xs text-destructive">Remaining: ${remaining.toFixed(2)}</p>
      )}
      {remaining <= 0 && allocated >= total && (
        <p className="text-xs text-green-600">Fully allocated ✓</p>
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
        <div className="space-y-1">
          <Label className="text-xs">Cash Tendered</Label>
          <Input
            type="number"
            value={cashTendered || ""}
            onChange={(e) => onCashTenderedChange(parseFloat(e.target.value) || 0)}
            className="h-7"
            min="0"
            step="0.01"
          />
          {changeAmount > 0 && (
            <p className="text-xs font-semibold text-green-600">
              Change: ${changeAmount.toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
