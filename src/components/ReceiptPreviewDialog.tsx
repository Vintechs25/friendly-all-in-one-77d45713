import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";
import ThermalReceipt, { ReceiptData } from "@/components/ThermalReceipt";

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

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const html = receiptRef.current.innerHTML;
    const styles = receiptRef.current.querySelector("style")?.innerHTML || "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${data?.receiptNumber}</title>
        <style>
          ${styles}
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            display: flex;
            justify-content: center;
            padding: 0;
            margin: 0;
            background: #fff;
          }
          .thermal-receipt {
            width: ${paperWidth};
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 8px;
          }
          @media print {
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="thermal-receipt">${html}</div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadText = () => {
    if (!data) return;

    const lines: string[] = [];
    const w = 40;
    const hr = "-".repeat(w);
    const center = (s: string) => {
      const pad = Math.max(0, Math.floor((w - s.length) / 2));
      return " ".repeat(pad) + s;
    };
    const row = (l: string, r: string) =>
      l + " ".repeat(Math.max(1, w - l.length - r.length)) + r;

    lines.push(center(data.businessName));
    if (data.branchName) lines.push(center(data.branchName));
    if (data.address) lines.push(center(data.address));
    if (data.phone) lines.push(center(`Tel: ${data.phone}`));
    lines.push(hr);
    lines.push(row("Receipt #", data.receiptNumber));
    lines.push(
      row(
        "Date",
        data.date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      )
    );
    lines.push(
      row(
        "Time",
        data.date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    );
    if (data.cashierName) lines.push(row("Cashier", data.cashierName));
    lines.push(hr);

    for (const item of data.items) {
      lines.push(
        row(`${item.qty}x ${item.name}`, `$${item.total.toFixed(2)}`)
      );
    }

    lines.push(hr);
    lines.push(row("Subtotal", `$${data.subtotal.toFixed(2)}`));
    if (data.taxAmount > 0)
      lines.push(row("Tax", `$${data.taxAmount.toFixed(2)}`));
    if (data.discountAmount > 0)
      lines.push(row("Discount", `-$${data.discountAmount.toFixed(2)}`));
    lines.push(hr);
    lines.push(row("TOTAL", `$${data.total.toFixed(2)}`));
    lines.push(hr);
    lines.push(center("Thank you for your purchase!"));

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${data.receiptNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Receipt Preview</span>
            <div className="flex items-center gap-1">
              {(["58mm", "80mm"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setPaperWidth(w)}
                  className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                    paperWidth === w
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {w}
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
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
          <Button variant="outline" onClick={handleDownloadText}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
