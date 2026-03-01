import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";

/* ─── Data Interfaces ─── */

export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  taxAmount: number;
  total: number;
  discount?: number;
  discountType?: "fixed" | "percent";
  taxIndicator?: string; // e.g. "V" for VAT, "E" for exempt
}

export interface ReceiptPayment {
  method: string;
  amount: number;
  reference?: string;
}

export interface ReceiptConfig {
  charsPerLine?: number; // 32 for 58mm, 42 for 80mm
  showQR?: boolean;
  showLogo?: boolean;
  logoUrl?: string;
  taxLabel?: string; // "VAT", "Tax", etc.
  taxId?: string;
  returnPolicy?: string;
  thankYouMessage?: string;
  visitAgainMessage?: string;
  loyaltyPointsEarned?: number;
  terminalId?: string;
  currency?: string;
}

export type ReceiptVariant = "sale" | "refund" | "void" | "credit_note" | "copy";

export interface ReceiptData {
  receiptNumber: string;
  businessName: string;
  branchName?: string;
  address?: string;
  phone?: string;
  email?: string;
  cashierName?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  payments?: ReceiptPayment[];
  cashTendered?: number;
  changeAmount?: number;
  date: Date;
  variant?: ReceiptVariant;
  config?: ReceiptConfig;
  // Refund-specific
  originalReceiptNumber?: string;
  refundReason?: string;
  // Void-specific
  voidReason?: string;
  // Rounding
  roundingAdjustment?: number;
  // Customer
  customerName?: string;
  loyaltyPointsEarned?: number;
  // Offline
  isPendingSync?: boolean;
}

interface ThermalReceiptProps {
  data: ReceiptData;
  width?: "58mm" | "80mm";
}

/* ─── Helpers ─── */

const fmtMoney = (n: number, currency = "KSh") =>
  `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pad = (left: string, right: string, w: number) => {
  const gap = Math.max(1, w - left.length - right.length);
  return left + " ".repeat(gap) + right;
};

const center = (s: string, w: number) => {
  const leftPad = Math.max(0, Math.floor((w - s.length) / 2));
  return " ".repeat(leftPad) + s;
};

const truncate = (s: string, max: number) =>
  s.length > max ? s.slice(0, max - 1) + "…" : s;

/* ─── Variant labels & styling ─── */
const variantLabels: Record<ReceiptVariant, string> = {
  sale: "SALES RECEIPT",
  refund: "REFUND RECEIPT",
  void: "VOID RECEIPT",
  credit_note: "CREDIT NOTE",
  copy: "SALES RECEIPT",
};

const paymentLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "M-Pesa",
  bank_transfer: "Bank Transfer",
  credit: "Credit",
  split: "Split Payment",
  store_credit: "Store Credit",
  gift_card: "Gift Card",
};

/* ─── Main Component ─── */

const ThermalReceipt = forwardRef<HTMLDivElement, ThermalReceiptProps>(
  ({ data, width = "80mm" }, ref) => {
    const w = width === "58mm" ? "58mm" : "80mm";
    const chars = data.config?.charsPerLine ?? (width === "58mm" ? 32 : 42);
    const currency = data.config?.currency ?? "KSh";
    const variant = data.variant ?? "sale";
    const taxLabel = data.config?.taxLabel ?? "VAT";
    const isCopy = variant === "copy";
    const isRefund = variant === "refund";
    const isVoid = variant === "void";

    const qrValue = JSON.stringify({
      r: data.receiptNumber,
      t: data.total,
      d: data.date.toISOString(),
      b: data.businessName,
    });

    const totalItemCount = data.items.reduce((s, i) => s + i.qty, 0);

    // Payment display
    const paymentList: ReceiptPayment[] =
      data.payments && data.payments.length > 0
        ? data.payments
        : [{ method: data.paymentMethod, amount: data.total }];

    const totalPaid = paymentList.reduce((s, p) => s + p.amount, 0);
    const change = data.changeAmount ?? Math.max(0, totalPaid - data.total);

    const s: React.CSSProperties = {
      width: w,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: "12px",
      lineHeight: "1.5",
      color: "#000",
      background: "#fff",
      padding: "10px 8px",
      boxSizing: "border-box",
      position: "relative",
      overflow: "hidden",
    };

    return (
      <div ref={ref} className="thermal-receipt" style={s}>
        {/* COPY watermark */}
        {isCopy && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-35deg)",
              fontSize: "48px",
              fontWeight: "bold",
              color: "rgba(0,0,0,0.06)",
              letterSpacing: "12px",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 1,
            }}
          >
            COPY
          </div>
        )}

        {/* VOID overlay */}
        {isVoid && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-35deg)",
              fontSize: "48px",
              fontWeight: "bold",
              color: "rgba(0,0,0,0.08)",
              letterSpacing: "12px",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 1,
            }}
          >
            VOIDED
          </div>
        )}

        {/* ═══ 1. HEADER ═══ */}
        <div style={{ textAlign: "center", marginBottom: "6px", position: "relative", zIndex: 2 }}>
          {/* Optional logo placeholder */}
          {data.config?.showLogo && data.config.logoUrl && (
            <div style={{ marginBottom: "4px" }}>
              <img
                src={data.config.logoUrl}
                alt="Logo"
                style={{ maxWidth: "120px", maxHeight: "50px", margin: "0 auto", display: "block" }}
              />
            </div>
          )}

          <Pre bold size="16px">{data.businessName}</Pre>
          {data.branchName && <Pre size="11px">{data.branchName}</Pre>}
          {data.address && <Pre size="10px" muted>{data.address}</Pre>}
          {data.phone && <Pre size="10px" muted>Tel: {data.phone}</Pre>}
          {data.email && <Pre size="10px" muted>{data.email}</Pre>}
          {data.config?.taxId && (
            <Pre size="10px" muted>{taxLabel} ID: {data.config.taxId}</Pre>
          )}
        </div>

        <Divider char="=" />

        {/* Receipt title */}
        <div style={{ textAlign: "center", padding: "2px 0" }}>
          <Pre bold size="13px">{variantLabels[variant]}</Pre>
        </div>

        <Divider />

        {/* ═══ Meta info (left-aligned) ═══ */}
        <div style={{ marginBottom: "2px", position: "relative", zIndex: 2 }}>
          <Row left="Invoice #" right={data.receiptNumber} />
          <Row
            left="Date"
            right={data.date.toLocaleDateString("en-KE", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          />
          <Row
            left="Time"
            right={data.date.toLocaleTimeString("en-KE", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          />
          {data.cashierName && <Row left="Cashier" right={data.cashierName} />}
          {data.config?.terminalId && <Row left="Terminal" right={data.config.terminalId} />}
        </div>

        {/* Refund reference */}
        {isRefund && data.originalReceiptNumber && (
          <>
            <Divider />
            <Row left="Orig. Receipt" right={data.originalReceiptNumber} />
            {data.refundReason && (
              <div style={{ fontSize: "10px", padding: "2px 0" }}>
                Reason: {data.refundReason}
              </div>
            )}
          </>
        )}

        {/* Void reason */}
        {isVoid && data.voidReason && (
          <>
            <Divider />
            <div style={{ fontSize: "10px", padding: "2px 0" }}>
              Void Reason: {data.voidReason}
            </div>
          </>
        )}

        <Divider />

        {/* ═══ 2. ITEMS SECTION ═══ */}
        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Column headers */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
              fontSize: "10px",
              padding: "2px 0",
              borderBottom: "1px solid #000",
              marginBottom: "2px",
              letterSpacing: "0.5px",
            }}
          >
            <span style={{ flex: 1 }}>ITEM</span>
            <span style={{ width: "28px", textAlign: "right" }}>QTY</span>
            <span style={{ width: "52px", textAlign: "right" }}>PRICE</span>
            <span style={{ width: "58px", textAlign: "right" }}>TOTAL</span>
          </div>

          {/* Item rows */}
          {data.items.map((item, i) => {
            const effectivePrice = item.unitPrice;
            const lineTotal = item.total;
            const hasDiscount = (item.discount ?? 0) > 0;
            const discountDisplay = hasDiscount
              ? item.discountType === "percent"
                ? `-${item.discount}%`
                : `-${fmtMoney(item.discount!, currency)}`
              : null;

            return (
              <div key={i} style={{ padding: "1px 0" }}>
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
                    {truncate(item.name, width === "58mm" ? 14 : 20)}
                    {item.taxIndicator && (
                      <span style={{ fontSize: "8px", verticalAlign: "super" }}>
                        {" "}{item.taxIndicator}
                      </span>
                    )}
                  </span>
                  <span style={{ width: "28px", textAlign: "right" }}>{item.qty}</span>
                  <span style={{ width: "52px", textAlign: "right" }}>
                    {effectivePrice.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                  <span style={{ width: "58px", textAlign: "right", fontWeight: 600 }}>
                    {lineTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Discount line */}
                {hasDiscount && (
                  <div style={{ fontSize: "9px", color: "#555", paddingLeft: "6px" }}>
                    Disc: {discountDisplay}
                  </div>
                )}

                {/* Tax line */}
                {item.taxAmount > 0 && (
                  <div style={{ fontSize: "9px", color: "#555", paddingLeft: "6px" }}>
                    incl. {taxLabel}: {item.taxAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Divider />

        {/* ═══ 3. TOTALS SECTION ═══ */}
        <div style={{ marginBottom: "2px", position: "relative", zIndex: 2 }}>
          <Row left="Subtotal" right={fmtMoney(data.subtotal, currency)} />
          {data.discountAmount > 0 && (
            <Row left="Discount" right={`-${fmtMoney(data.discountAmount, currency)}`} />
          )}
          {data.taxAmount > 0 && (
            <Row left={`${taxLabel} (16%)`} right={fmtMoney(data.taxAmount, currency)} />
          )}
          {(data.roundingAdjustment ?? 0) !== 0 && (
            <Row left="Rounding" right={fmtMoney(data.roundingAdjustment!, currency)} />
          )}

          <div style={{ borderTop: "2px solid #000", margin: "4px 0" }} />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: "bold",
              fontSize: "16px",
              padding: "2px 0",
              letterSpacing: "0.5px",
            }}
          >
            <span>TOTAL</span>
            <span>{fmtMoney(data.total, currency)}</span>
          </div>

          <div style={{ fontSize: "10px", color: "#555", textAlign: "right" }}>
            ({totalItemCount} item{totalItemCount !== 1 ? "s" : ""})
          </div>
        </div>

        <Divider />

        {/* ═══ 4. PAYMENT BREAKDOWN ═══ */}
        <div style={{ position: "relative", zIndex: 2, marginBottom: "2px" }}>
          <Pre bold size="10px" style={{ letterSpacing: "0.5px", marginBottom: "2px" }}>
            PAYMENT
          </Pre>

          {paymentList.map((p, i) => (
            <div key={i}>
              <Row
                left={paymentLabels[p.method] || p.method}
                right={fmtMoney(p.amount, currency)}
              />
              {p.reference && (
                <div style={{ fontSize: "9px", color: "#555", paddingLeft: "6px" }}>
                  Ref: {p.reference}
                </div>
              )}
            </div>
          ))}

          {paymentList.length > 1 && (
            <>
              <DividerThin />
              <Row left="Total Paid" right={fmtMoney(totalPaid, currency)} bold />
            </>
          )}

          {change > 0 && (
            <Row left="Change" right={fmtMoney(change, currency)} bold />
          )}
        </div>

        <Divider />

        {/* ═══ 5. QR CODE ═══ */}
        {(data.config?.showQR !== false) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "6px 0",
              position: "relative",
              zIndex: 2,
            }}
          >
            <QRCodeSVG
              value={qrValue}
              size={width === "58mm" ? 90 : 110}
              level="M"
              includeMargin={false}
            />
            <div style={{ fontSize: "8px", color: "#999", marginTop: "3px" }}>
              Scan for digital receipt
            </div>
          </div>
        )}

        <Divider />

        {/* ═══ 6. FOOTER ═══ */}
        <div
          style={{
            textAlign: "center",
            fontSize: "10px",
            color: "#555",
            padding: "4px 0 2px",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Loyalty */}
          {(data.config?.loyaltyPointsEarned ?? 0) > 0 && (
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
              ★ You earned {data.config!.loyaltyPointsEarned} loyalty points!
            </div>
          )}

          <div style={{ fontWeight: "bold" }}>
            {data.config?.thankYouMessage ?? "Thank you for shopping with us!"}
          </div>
          <div style={{ marginTop: "2px" }}>
            {data.config?.returnPolicy ?? "Items returnable within 7 days with receipt."}
          </div>
          <div style={{ marginTop: "2px" }}>
            {data.config?.visitAgainMessage ?? "Visit again!"}
          </div>

          {/* Pending sync indicator */}
          {data.isPendingSync && (
            <div
              style={{
                marginTop: "6px",
                padding: "2px 4px",
                border: "1px dashed #999",
                fontSize: "9px",
                fontWeight: "bold",
              }}
            >
              ⏳ PENDING SYNC — Invoice will update on reprint
            </div>
          )}
        </div>

        <Divider char="=" />

        {/* Reference line */}
        <div
          style={{
            textAlign: "center",
            fontSize: "8px",
            color: "#999",
            padding: "2px 0 4px",
          }}
        >
          Ref: {data.receiptNumber} | {data.date.toISOString().slice(0, 19).replace("T", " ")}
        </div>
      </div>
    );
  }
);

ThermalReceipt.displayName = "ThermalReceipt";

/* ─── Sub-Components ─── */

function Divider({ char = "-" }: { char?: string }) {
  return (
    <div
      style={{
        borderTop: char === "=" ? "2px double #aaa" : "1px dashed #bbb",
        margin: "4px 0",
      }}
    />
  );
}

function DividerThin() {
  return <div style={{ borderTop: "1px dotted #ccc", margin: "2px 0" }} />;
}

function Row({ left, right, bold }: { left: string; right: string; bold?: boolean }) {
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

function Pre({
  children,
  bold,
  size,
  muted,
  style,
}: {
  children: React.ReactNode;
  bold?: boolean;
  size?: string;
  muted?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontWeight: bold ? "bold" : "normal",
        fontSize: size ?? "12px",
        color: muted ? "#666" : "#000",
        letterSpacing: bold ? "0.5px" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default ThermalReceipt;
