import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, Percent, DollarSign, Edit3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CartItem, getEffectivePrice, getItemTotal } from "./types";
import { cn } from "@/lib/utils";

interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onUpdateDiscount: (id: string, discount: number, type: "fixed" | "percent") => void;
  onPriceOverride: (id: string, price: number) => void;
  canOverridePrice: boolean;
}

export default function CartItemRow({
  item,
  onUpdateQty,
  onRemove,
  onUpdateDiscount,
  onPriceOverride,
  canOverridePrice,
}: CartItemRowProps) {
  const [editingQty, setEditingQty] = useState(false);
  const [qtyInput, setQtyInput] = useState(String(item.qty));
  const effectivePrice = getEffectivePrice(item);
  const lineTotal = getItemTotal(item);

  const commitQty = () => {
    const parsed = parseFloat(qtyInput);
    if (!isNaN(parsed) && parsed >= 0.001) {
      onUpdateQty(item.id, parsed);
    } else {
      setQtyInput(String(item.qty));
    }
    setEditingQty(false);
  };

  return (
    <div className="rounded-lg border border-border bg-background p-2.5 space-y-1 touch-manipulation">
      {/* Main row */}
      <div className="flex items-center gap-2">
        {/* Product info */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate leading-tight">{item.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            KSh {effectivePrice.toFixed(2)}
            {item.priceOverride !== null && (
              <span className="text-warning ml-1 font-medium">(edited)</span>
            )}
          </p>
        </div>

        {/* Quantity controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onUpdateQty(item.id, Math.max(0.001, item.qty - 1))}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-manipulation"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          {editingQty ? (
            <Input
              className="w-14 h-8 text-center text-sm font-bold p-0"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={commitQty}
              onKeyDown={(e) => e.key === "Enter" && commitQty()}
              autoFocus
            />
          ) : (
            <button
              className="w-12 h-8 text-center text-sm font-bold bg-muted rounded-lg hover:bg-muted/80 transition-colors touch-manipulation"
              onClick={() => {
                setQtyInput(String(item.qty));
                setEditingQty(true);
              }}
            >
              {item.qty % 1 !== 0 ? item.qty.toFixed(3) : item.qty}
            </button>
          )}
          <button
            onClick={() => onUpdateQty(item.id, item.qty + 1)}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-manipulation"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Line total */}
        <span className="text-sm font-bold w-[72px] text-right tabular-nums">
          {lineTotal.toFixed(2)}
        </span>

        {/* Delete */}
        <button
          onClick={() => onRemove(item.id)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1">
        <ItemDiscountPopover item={item} onApply={onUpdateDiscount} />
        {canOverridePrice && (
          <PriceOverridePopover item={item} onApply={onPriceOverride} />
        )}
        {item.itemDiscount > 0 && (
          <span className="text-[10px] text-success font-medium ml-auto">
            -{item.itemDiscountType === "percent" ? `${item.itemDiscount}%` : `KSh ${item.itemDiscount.toFixed(0)}`}
          </span>
        )}
      </div>
    </div>
  );
}

function ItemDiscountPopover({
  item,
  onApply,
}: {
  item: CartItem;
  onApply: (id: string, discount: number, type: "fixed" | "percent") => void;
}) {
  const [discount, setDiscount] = useState(String(item.itemDiscount || ""));
  const [type, setType] = useState<"fixed" | "percent">(item.itemDiscountType);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors touch-manipulation",
          item.itemDiscount > 0
            ? "bg-success/10 text-success"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}>
          <Percent className="h-3 w-3" /> Discount
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-2" side="left">
        <Label className="text-xs font-semibold">Item Discount</Label>
        <div className="flex gap-1">
          <Button variant={type === "fixed" ? "default" : "outline"} size="sm" className="h-8 text-xs flex-1" onClick={() => setType("fixed")}>
            <DollarSign className="h-3 w-3 mr-1" /> Fixed
          </Button>
          <Button variant={type === "percent" ? "default" : "outline"} size="sm" className="h-8 text-xs flex-1" onClick={() => setType("percent")}>
            <Percent className="h-3 w-3 mr-1" /> %
          </Button>
        </div>
        <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-9" min="0" />
        <div className="flex gap-1">
          <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => { onApply(item.id, parseFloat(discount) || 0, type); setOpen(false); }}>
            Apply
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { onApply(item.id, 0, "fixed"); setDiscount(""); setOpen(false); }}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PriceOverridePopover({
  item,
  onApply,
}: {
  item: CartItem;
  onApply: (id: string, price: number) => void;
}) {
  const [price, setPrice] = useState(String(item.priceOverride ?? item.price));
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors touch-manipulation",
          item.priceOverride !== null
            ? "bg-warning/10 text-warning"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}>
          <Edit3 className="h-3 w-3" /> Price
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3 space-y-2" side="left">
        <Label className="text-xs font-semibold">Override Price</Label>
        <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="h-9" min="0" step="0.01" />
        <Button size="sm" className="w-full h-8 text-xs" onClick={() => { onApply(item.id, parseFloat(price) || item.price); setOpen(false); }}>
          Set Price
        </Button>
      </PopoverContent>
    </Popover>
  );
}
