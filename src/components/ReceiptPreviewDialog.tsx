import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Copy, X } from "lucide-react";
import ThermalReceipt from "@/components/ThermalReceipt";
import type { ReceiptData, ReceiptVariant } from "@/components/ThermalReceipt";

interface ReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReceiptData | null;
}

export default function ReceiptPreviewDialog({
  open,
  onOpenChange,
  data,
}: ReceiptPreviewDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("80mm");

  const handlePrint = (asCopy = false) => {
    if (!receiptRef.current || !data) return;

    const printData: ReceiptData = asCopy
      ? { ...data, variant: "copy" as ReceiptVariant }
      : data;

    // We need to re-render for copy variant — open print window with inline receipt
    const printWindow = window.open("", "_blank", "width=400,height=700");
    if (!printWindow) return;

    const receiptHtml = receiptRef.current.outerHTML;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${data.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; justify-content: center; margin: 0; background: #fff; }
    .thermal-receipt {
      width: ${paperWidth};
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.5;
      color: #000;
      background: #fff;
      padding: 10px 8px;
    }
    @media print {
      @page { size: ${paperWidth} auto; margin: 0; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${receiptHtml}
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  <\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  const handleDownloadText = () => {
    if (!data) return;
    const w = paperWidth === "58mm" ? 32 : 42;
    const hr = "-".repeat(w);
    const dhr = "=".repeat(w);
    const c = (s: string) => {
      const p = Math.max(0, Math.floor((w - s.length) / 2));
      return " ".repeat(p) + s;
    };
    const row = (l: string, r: string) =>
      l + " ".repeat(Math.max(1, w - l.length - r.length)) + r;
    const fmt = (n: number) =>
      `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const lines: string[] = [];

    // Header
    lines.push(c(data.businessName));
    if (data.branchName) lines.push(c(data.branchName));
    if (data.address) lines.push(c(data.address));
    if (data.phone) lines.push(c(`Tel: ${data.phone}`));
    if (data.email) lines.push(c(data.email));
    lines.push(dhr);
    lines.push(c(data.variant === "refund" ? "REFUND RECEIPT" : data.variant === "void" ? "VOID RECEIPT" : "SALES RECEIPT"));
    lines.push(hr);

    // Meta
    lines.push(row("Invoice #", data.receiptNumber));
    lines.push(row("Date", data.date.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })));
    lines.push(row("Time", data.date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: true })));
    if (data.cashierName) lines.push(row("Cashier", data.cashierName));
    lines.push(hr);

    // Column header
    const itemW = w - 4 - 8 - 10;
    lines.push(
      "ITEM" + " ".repeat(Math.max(1, itemW - 4)) + " QTY" + "   PRICE" + "   TOTAL"
    );
    lines.push(hr);

    // Items
    for (const item of data.items) {
      const name = item.name.length > itemW ? item.name.slice(0, itemW - 1) + "…" : item.name;
      lines.push(
        row(
          `${name}`,
          `${item.qty}  ${item.unitPrice.toFixed(2).padStart(8)}  ${item.total.toFixed(2).padStart(8)}`
        )
      );
    }

    lines.push(hr);
    lines.push(row("Subtotal", fmt(data.subtotal)));
    if (data.discountAmount > 0) lines.push(row("Discount", `-${fmt(data.discountAmount)}`));
    if (data.taxAmount > 0) lines.push(row("VAT (16%)", fmt(data.taxAmount)));
    lines.push(dhr);
    lines.push(row("TOTAL", fmt(data.total)));
    lines.push(hr);

    // Payment
    const payments = data.payments ?? [{ method: data.paymentMethod, amount: data.total }];
    const pmLabels: Record<string, string> = {
      cash: "Cash", card: "Card", mobile_money: "M-Pesa",
      bank_transfer: "Bank Transfer", credit: "Credit", split: "Split",
      store_credit: "Store Credit", gift_card: "Gift Card",
    };
    for (const p of payments) {
      lines.push(row(pmLabels[p.method] || p.method, fmt(p.amount)));
    }
    if ((data.changeAmount ?? 0) > 0) {
      lines.push(row("Change", fmt(data.changeAmount!)));
    }

    lines.push(dhr);
    lines.push(c("Thank you for shopping with us!"));
    lines.push(c("Items returnable within 7 days."));
    lines.push(c("Visit again!"));
    lines.push(hr);
    lines.push(c(`Ref: ${data.receiptNumber}`));

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${data.receiptNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) return null;

  const variantBadge = data.variant && data.variant !== "sale" ? (
    <Badge variant={data.variant === "refund" || data.variant === "void" ? "destructive" : "secondary"} className="ml-2 text-[10px]">
      {data.variant.toUpperCase()}
    </Badge>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center">
              Receipt Preview{variantBadge}
            </span>
            <div className="flex items-center gap-1">
              {(["58mm", "80mm"] as const).map((pw) => (
                <button
                  key={pw}
                  onClick={() => setPaperWidth(pw)}
                  className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                    paperWidth === pw
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {pw}
                </button>
              ))}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Receipt preview area */}
        <div className="flex-1 overflow-y-auto flex justify-center bg-muted/30 rounded-lg p-4">
          <div className="shadow-lg bg-white rounded">
            <ThermalReceipt ref={receiptRef} data={data} width={paperWidth} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" onClick={() => handlePrint(false)}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={() => handlePrint(true)}>
            <Copy className="h-4 w-4 mr-2" />
            Reprint
          </Button>
          <Button variant="outline" onClick={handleDownloadText}>
            <Download className="h-4 w-4 mr-2" />
            TXT
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
