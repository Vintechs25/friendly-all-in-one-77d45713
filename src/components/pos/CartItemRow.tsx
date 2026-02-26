import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, Percent, DollarSign, Edit3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CartItem, getEffectivePrice, getItemTotal } from "./types";

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
    const parsed = parseInt(qtyInput);
    if (!isNaN(parsed) && parsed >= 1) {
      onUpdateQty(item.id, parsed);
    } else {
      setQtyInput(String(item.qty));
    }
    setEditingQty(false);
  };

  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            KSh {effectivePrice.toFixed(2)} each
            {item.priceOverride !== null && (
              <span className="text-yellow-600 ml-1">(overridden)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateQty(item.id, Math.max(1, item.qty - 1))}
            className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-background"
          >
            <Minus className="h-3 w-3" />
          </button>
          {editingQty ? (
            <Input
              className="w-14 h-7 text-center text-sm p-0"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={commitQty}
              onKeyDown={(e) => e.key === "Enter" && commitQty()}
              autoFocus
            />
          ) : (
            <button
              className="w-10 text-center text-sm font-semibold hover:bg-background rounded-md py-1"
              onClick={() => {
                setQtyInput(String(item.qty));
                setEditingQty(true);
              }}
            >
              {item.qty}
            </button>
          )}
          <button
            onClick={() => onUpdateQty(item.id, item.qty + 1)}
            className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-background"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <span className="text-sm font-semibold w-16 text-right">
          ${lineTotal.toFixed(2)}
        </span>
        <button
          onClick={() => onRemove(item.id)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Discount & price override controls */}
      <div className="flex gap-1.5">
        <ItemDiscountPopover item={item} onApply={onUpdateDiscount} />
        {canOverridePrice && (
          <PriceOverridePopover item={item} onApply={onPriceOverride} />
        )}
      </div>

      {item.itemDiscount > 0 && (
        <p className="text-xs text-green-600">
          Discount: {item.itemDiscountType === "percent" ? `${item.itemDiscount}%` : `$${item.itemDiscount.toFixed(2)}`}
        </p>
      )}
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
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1">
          <Percent className="h-3 w-3" /> Discount
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-2" side="left">
        <Label className="text-xs">Item Discount</Label>
        <div className="flex gap-1">
          <Button
            variant={type === "fixed" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => setType("fixed")}
          >
            <DollarSign className="h-3 w-3 mr-1" /> Fixed
          </Button>
          <Button
            variant={type === "percent" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => setType("percent")}
          >
            <Percent className="h-3 w-3 mr-1" /> %
          </Button>
        </div>
        <Input
          type="number"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          placeholder="0"
          className="h-8"
          min="0"
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => {
              onApply(item.id, parseFloat(discount) || 0, type);
              setOpen(false);
            }}
          >
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              onApply(item.id, 0, "fixed");
              setDiscount("");
              setOpen(false);
            }}
          >
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
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1">
          <Edit3 className="h-3 w-3" /> Price
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3 space-y-2" side="left">
        <Label className="text-xs">Override Price</Label>
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-8"
          min="0"
          step="0.01"
        />
        <Button
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => {
            onApply(item.id, parseFloat(price) || item.price);
            setOpen(false);
          }}
        >
          Set Price
        </Button>
      </PopoverContent>
    </Popover>
  );
}
