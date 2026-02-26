export interface CartItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  tax_rate: number;
  qty: number;
  track_inventory: boolean;
  itemDiscount: number;
  itemDiscountType: "fixed" | "percent";
  priceOverride: number | null;
  overrideBy: string | null;
}

export type PaymentMethod = "cash" | "card" | "mobile_money";

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
}

export interface HeldSale {
  id: string;
  label: string | null;
  created_at: string;
  itemCount: number;
  total: number;
}

export function getEffectivePrice(item: CartItem): number {
  return item.priceOverride ?? item.price;
}

export function getItemTotal(item: CartItem): number {
  const basePrice = getEffectivePrice(item);
  const lineTotal = basePrice * item.qty;
  const discount =
    item.itemDiscountType === "percent"
      ? lineTotal * (item.itemDiscount / 100)
      : item.itemDiscount;
  return Math.max(0, lineTotal - discount);
}

export function getItemTax(item: CartItem): number {
  const afterDiscount = getItemTotal(item);
  return afterDiscount * (item.tax_rate / 100);
}

export function createCartItem(product: {
  id: string;
  name: string;
  price: number;
  cost: number;
  tax_rate: number;
  track_inventory: boolean;
}): CartItem {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    cost: product.cost,
    tax_rate: product.tax_rate,
    qty: 1,
    track_inventory: product.track_inventory,
    itemDiscount: 0,
    itemDiscountType: "fixed",
    priceOverride: null,
    overrideBy: null,
  };
}
