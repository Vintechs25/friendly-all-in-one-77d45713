import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";

export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
}

export interface ReceiptData {
  receiptNumber: string;
  businessName: string;
  branchName?: string;
  address?: string;
  phone?: string;
  cashierName?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  date: Date;
}

interface ThermalReceiptProps {
  data: ReceiptData;
  width?: "58mm" | "80mm";
}

const fmt = (n: number) => n.toFixed(2);

const paymentLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank Transfer",
  credit: "Credit",
  split: "Split Payment",
};

const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ data, width = "80mm" }, ref) => {
    const w = width === "58mm" ? "58mm" : "80mm";
    const qrValue = JSON.stringify({
      r: data.receiptNumber,
      t: data.total,
      d: data.date.toISOString(),
      b: data.businessName,
    });

    return (
      <div
        ref={ref}
        className="thermal-receipt"
        style={{
          width: w,
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "12px",
          lineHeight: "1.4",
          color: "#000",
          background: "#fff",
          padding: "8px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <div style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "1px" }}>
            {data.businessName}
          </div>
          {data.branchName && (
            <div style={{ fontSize: "11px" }}>{data.branchName}</div>
          )}
          {data.address && (
            <div style={{ fontSize: "10px", color: "#555" }}>{data.address}</div>
          )}
          {data.phone && (
            <div style={{ fontSize: "10px", color: "#555" }}>Tel: {data.phone}</div>
          )}
        </div>

        <Divider />

        {/* Receipt info */}
        <div style={{ marginBottom: "4px" }}>
          <Row left="Receipt #" right={data.receiptNumber} />
          <Row
            left="Date"
            right={data.date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          />
          <Row
            left="Time"
            right={data.date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
          {data.cashierName && <Row left="Cashier" right={data.cashierName} />}
        </div>

        <Divider />

        {/* Column headers */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            fontSize: "11px",
            padding: "2px 0",
          }}
        >
          <span style={{ flex: 1 }}>Item</span>
          <span style={{ width: "30px", textAlign: "right" }}>Qty</span>
          <span style={{ width: "50px", textAlign: "right" }}>Price</span>
          <span style={{ width: "55px", textAlign: "right" }}>Total</span>
        </div>

        <div
          style={{
            borderTop: "1px dashed #999",
            margin: "2px 0",
          }}
        />

        {/* Items */}
        {data.items.map((item, i) => (
          <div key={i} style={{ padding: "2px 0" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
              }}
            >
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingRight: "4px",
                }}
              >
                {item.name}
              </span>
              <span style={{ width: "30px", textAlign: "right" }}>{item.qty}</span>
              <span style={{ width: "50px", textAlign: "right" }}>
                {fmt(item.unitPrice)}
              </span>
              <span style={{ width: "55px", textAlign: "right", fontWeight: "bold" }}>
                {fmt(item.total)}
              </span>
            </div>
            {item.taxAmount > 0 && (
              <div
                style={{
                  fontSize: "9px",
                  color: "#777",
                  paddingLeft: "4px",
                }}
              >
                incl. tax: {fmt(item.taxAmount)}
              </div>
            )}
          </div>
        ))}

        <Divider />

        {/* Totals */}
        <div style={{ marginBottom: "4px" }}>
          <Row left="Subtotal" right={`$${fmt(data.subtotal)}`} />
          {data.taxAmount > 0 && (
            <Row left="Tax" right={`$${fmt(data.taxAmount)}`} />
          )}
          {data.discountAmount > 0 && (
            <Row left="Discount" right={`-$${fmt(data.discountAmount)}`} />
          )}
          <div
            style={{
              borderTop: "1px dashed #999",
              margin: "4px 0",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
              fontSize: "16px",
              padding: "4px 0",
            }}
          >
            <span>TOTAL</span>
            <span>${fmt(data.total)}</span>
          </div>
        </div>

        <Divider />

        {/* Payment */}
        <Row
          left="Payment"
          right={paymentLabels[data.paymentMethod] || data.paymentMethod}
          bold
        />

        <Divider />

        {/* QR Code */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "8px 0",
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={width === "58mm" ? 100 : 120}
            level="M"
            includeMargin={false}
          />
          <div
            style={{
              fontSize: "9px",
              color: "#888",
              marginTop: "4px",
              textAlign: "center",
            }}
          >
            Scan for digital receipt
          </div>
        </div>

        <Divider />

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            fontSize: "10px",
            color: "#666",
            padding: "4px 0 8px",
          }}
        >
          <div>Thank you for your purchase!</div>
          <div style={{ marginTop: "2px" }}>
            Items: {data.items.reduce((s, i) => s + i.qty, 0)} | Ref:{" "}
            {data.receiptNumber}
          </div>
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = "ThermalReceipt";

// Helper components
function Divider() {
  return (
    <div
      style={{
        borderTop: "1px dashed #ccc",
        margin: "4px 0",
      }}
    />
  );
}

function Row({
  left,
  right,
  bold,
}: {
  left: string;
  right: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "11px",
        fontWeight: bold ? "bold" : "normal",
        padding: "1px 0",
      }}
    >
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

export default ThermalReceipt;
