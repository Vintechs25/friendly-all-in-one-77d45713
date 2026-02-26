import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Search, Barcode, Loader2, Package, Printer, PauseCircle,
  Percent, DollarSign, XCircle,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLicense, LicenseBanner } from "@/contexts/LicenseContext";
import { useScanner, ScanMode } from "@/hooks/use-scanner";
import ScannerIndicator from "@/components/ScannerIndicator";
import ReceiptPreviewDialog from "@/components/ReceiptPreviewDialog";
import type { ReceiptData } from "@/components/ThermalReceipt";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { BarcodeResult } from "@/lib/scan-engine";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

import CategoryFilter from "@/components/pos/CategoryFilter";
import CartItemRow from "@/components/pos/CartItemRow";
import SplitPaymentPanel from "@/components/pos/SplitPaymentPanel";
import HeldSalesPanel from "@/components/pos/HeldSalesPanel";
import {
  CartItem, PaymentEntry, PaymentMethod, HeldSale,
  createCartItem, getItemTotal, getItemTax,
} from "@/components/pos/types";

type Product = Tables<"products">;

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("checkout");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Cart discount
  const [cartDiscount, setCartDiscount] = useState(0);
  const [cartDiscountType, setCartDiscountType] = useState<"fixed" | "percent">("fixed");

  // Payments
  const [payments, setPayments] = useState<PaymentEntry[]>([{ method: "cash", amount: 0 }]);
  const [splitMode, setSplitMode] = useState(false);
  const [cashTendered, setCashTendered] = useState(0);

  // Held sales
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);

  const { user, profile, hasRole } = useAuth();
  const { canUsePOS } = useLicense();

  const canOverridePrice = hasRole("business_owner") || hasRole("manager") || hasRole("super_admin");

  // Barcode index
  const barcodeIndex = useMemo(() => {
    const idx = new Map<string, Product>();
    for (const p of products) {
      if (p.barcode) idx.set(p.barcode.toLowerCase(), p);
      if (p.sku) idx.set(p.sku.toLowerCase(), p);
    }
    return idx;
  }, [products]);

  // Scanner handler
  const handleScan = useCallback(
    (result: BarcodeResult) => {
      const code = result.sanitized.toLowerCase();
      if (scanMode === "search") {
        setSearchTerm(result.sanitized);
        return;
      }
      const product = barcodeIndex.get(code);
      if (!product) {
        const nameMatch = products.find(
          (p) => p.name.toLowerCase() === code || p.sku?.toLowerCase() === code
        );
        if (nameMatch) { addToCart(nameMatch); toast.success(`Added: ${nameMatch.name}`); return; }
        toast.error(`Product not found: ${result.sanitized}`);
        return;
      }
      if (scanMode === "quantity") {
        setCart((prev) => {
          const existing = prev.find((i) => i.id === product.id);
          if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
          return [...prev, createCartItem(product)];
        });
        toast.success(`${product.name} × ${(cart.find((i) => i.id === product.id)?.qty ?? 0) + 1}`);
        return;
      }
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    },
    [barcodeIndex, products, scanMode, cart]
  );

  const handleScanError = useCallback((error: string) => { toast.error(error); }, []);

  const scanner = useScanner({
    enabled: true,
    mode: scanMode,
    config: { enableSound: soundEnabled },
    onScan: handleScan,
    onError: handleScanError,
  });

  // Load products & categories
  useEffect(() => {
    if (!profile?.business_id) return;

    const loadProducts = async () => {
      setLoadingProducts(true);
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", profile.business_id!)
        .eq("is_active", true)
        .order("name");
      setProducts(data ?? []);
      setLoadingProducts(false);
    };

    const loadCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("business_id", profile.business_id!)
        .eq("is_active", true)
        .order("name");
      setCategories(data ?? []);
    };

    loadProducts();
    loadCategories();
    loadHeldSales();

    const channel = supabase
      .channel("pos-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => loadProducts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.business_id]);

  // Load held sales
  const loadHeldSales = async () => {
    if (!profile?.business_id) return;
    const { data } = await supabase
      .from("held_sales")
      .select("id, label, created_at, total, held_sale_items(id)")
      .eq("business_id", profile.business_id)
      .order("created_at", { ascending: false });

    setHeldSales(
      (data ?? []).map((hs: any) => ({
        id: hs.id,
        label: hs.label,
        created_at: hs.created_at,
        total: hs.total,
        itemCount: hs.held_sale_items?.length ?? 0,
      }))
    );
  };

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, createCartItem(product)];
    });
  };

  const updateQty = (id: string, qty: number) => {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, qty) } : i));
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const updateItemDiscount = (id: string, discount: number, type: "fixed" | "percent") => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, itemDiscount: discount, itemDiscountType: type } : i)
    );
  };

  const overridePrice = (id: string, price: number) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, priceOverride: price, overrideBy: user?.id ?? null } : i)
    );
  };

  // Calculations
  const itemsSubtotal = cart.reduce((s, i) => s + getItemTotal(i), 0);
  const cartDiscountAmount =
    cartDiscountType === "percent"
      ? itemsSubtotal * (cartDiscount / 100)
      : cartDiscount;
  const subtotalAfterDiscount = Math.max(0, itemsSubtotal - cartDiscountAmount);
  const taxAmount = cart.reduce((s, i) => s + getItemTax(i), 0);
  const total = subtotalAfterDiscount + taxAmount;

  // Update payment amount when total changes (single mode)
  useEffect(() => {
    if (!splitMode) {
      setPayments((prev) => [{ method: prev[0]?.method ?? "cash", amount: total }]);
    }
  }, [total, splitMode]);

  // Filter products
  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Hold transaction
  const holdTransaction = async () => {
    if (!user || !profile?.business_id || cart.length === 0) return;
    const { data: branches } = await supabase
      .from("branches").select("id").eq("business_id", profile.business_id).eq("is_active", true).limit(1);
    const branchId = branches?.[0]?.id;
    if (!branchId) { toast.error("No active branch"); return; }

    const label = `Sale parked at ${new Date().toLocaleTimeString()}`;
    const { data: held, error } = await supabase
      .from("held_sales")
      .insert({
        business_id: profile.business_id,
        branch_id: branchId,
        cashier_id: user.id,
        label,
        subtotal: itemsSubtotal,
        tax_amount: taxAmount,
        discount_amount: cartDiscountAmount,
        total,
        cart_discount: cartDiscount,
        cart_discount_type: cartDiscountType,
      })
      .select()
      .single();

    if (error || !held) { toast.error("Failed to hold sale"); return; }

    await supabase.from("held_sale_items").insert(
      cart.map((item) => ({
        held_sale_id: held.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
        item_discount: item.itemDiscount,
        item_discount_type: item.itemDiscountType,
        price_override: item.priceOverride,
        tax_rate: item.tax_rate,
      }))
    );

    setCart([]);
    setCartDiscount(0);
    toast.success("Sale parked");
    loadHeldSales();
  };

  // Resume held sale
  const resumeHeldSale = async (id: string) => {
    const { data: held } = await supabase
      .from("held_sales")
      .select("*, held_sale_items(*)")
      .eq("id", id)
      .single();

    if (!held) { toast.error("Could not load held sale"); return; }

    setCart(
      (held.held_sale_items as any[]).map((item: any) => ({
        id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        cost: 0,
        tax_rate: item.tax_rate,
        qty: item.quantity,
        track_inventory: true,
        itemDiscount: item.item_discount,
        itemDiscountType: item.item_discount_type as "fixed" | "percent",
        priceOverride: item.price_override,
        overrideBy: null,
      }))
    );
    setCartDiscount(held.cart_discount);
    setCartDiscountType(held.cart_discount_type as "fixed" | "percent");

    await supabase.from("held_sales").delete().eq("id", id);
    loadHeldSales();
    toast.success("Sale resumed");
  };

  const deleteHeldSale = async (id: string) => {
    await supabase.from("held_sales").delete().eq("id", id);
    loadHeldSales();
    toast.success("Held sale deleted");
  };

  // Void sale (for completed sales from SalesPage — here we handle voiding current cart)
  const voidCurrentSale = () => {
    if (cart.length === 0) return;
    setCart([]);
    setCartDiscount(0);
    setCashTendered(0);
    setSplitMode(false);
    toast.info("Sale voided");
  };

  // Complete sale
  const completeSale = async () => {
    if (!user || !profile?.business_id || cart.length === 0) return;

    // Validate split payments
    if (splitMode) {
      const allocated = payments.reduce((s, p) => s + p.amount, 0);
      if (allocated < total - 0.01) {
        toast.error(`Payment short by KSh ${(total - allocated).toFixed(2)}`);
        return;
      }
    }

    setProcessing(true);
    try {
      const { data: branches } = await supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", profile.business_id)
        .eq("is_active", true)
        .limit(1);
      const branch = branches?.[0];
      if (!branch) { toast.error("No active branch found"); return; }

      const { data: business } = await supabase
        .from("businesses")
        .select("name, address, phone, email")
        .eq("id", profile.business_id)
        .single();

      const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;

      const primaryMethod = splitMode ? "split" as any : payments[0]?.method ?? "cash";

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          business_id: profile.business_id,
          branch_id: branch.id,
          cashier_id: user.id,
          receipt_number: receiptNumber,
          subtotal: itemsSubtotal,
          tax_amount: taxAmount,
          discount_amount: cartDiscountAmount,
          total,
          payment_method: primaryMethod,
          status: "completed",
        })
        .select()
        .single();

      if (saleError) { toast.error("Failed to create sale: " + saleError.message); return; }

      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.priceOverride ?? item.price,
        discount: item.itemDiscount,
        tax_amount: getItemTax(item),
        total: getItemTotal(item) + getItemTax(item),
        price_override: item.priceOverride,
        override_by: item.overrideBy,
        item_discount: item.itemDiscount,
        item_discount_type: item.itemDiscountType,
      }));

      await supabase.from("sale_items").insert(saleItems);

      // Insert payment entries
      const paymentInserts = splitMode
        ? payments.filter((p) => p.amount > 0).map((p) => ({
            sale_id: sale.id,
            method: p.method,
            amount: p.amount,
            reference: p.reference || null,
            payment_status: p.method === "mobile_money" && p.reference ? "pending" : "confirmed",
            mpesa_checkout_request_id: p.method === "mobile_money" ? p.reference || null : null,
          }))
        : [{
            sale_id: sale.id,
            method: (payments[0]?.method ?? "cash") as PaymentMethod,
            amount: total,
            reference: payments[0]?.reference || null,
            payment_status: payments[0]?.method === "mobile_money" && payments[0]?.reference ? "pending" : "confirmed",
            mpesa_checkout_request_id: payments[0]?.method === "mobile_money" ? payments[0]?.reference || null : null,
          }];

      await supabase.from("payments").insert(paymentInserts);

      // Deduct gift card balances
      for (const p of payments) {
        if (p.method === "gift_card" && p.reference && p.amount > 0 && profile?.business_id) {
          const { data: gc } = await supabase
            .from("gift_cards")
            .select("id, balance")
            .eq("business_id", profile.business_id)
            .eq("code", p.reference)
            .single();
          if (gc) {
            await supabase.from("gift_cards").update({ balance: Math.max(0, gc.balance - p.amount) }).eq("id", gc.id);
          }
        }
        // Deduct store credit
        if (p.method === "store_credit" && p.amount > 0) {
          // store credit deduction would require customer_id — future enhancement
        }
      }

      // Decrement inventory
      for (const item of cart) {
        if (!item.track_inventory) continue;
        const { data: inv } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("product_id", item.id)
          .eq("branch_id", branch.id)
          .single();
        if (inv) {
          await supabase.from("inventory").update({ quantity: Math.max(0, inv.quantity - item.qty) }).eq("id", inv.id);
        } else {
          await supabase.from("inventory").insert({ product_id: item.id, branch_id: branch.id, quantity: 0 });
        }
      }

      // Build receipt
      const receiptPayments = splitMode
        ? payments.filter((p) => p.amount > 0).map((p) => ({
            method: p.method,
            amount: p.amount,
            reference: p.reference,
          }))
        : [{ method: payments[0]?.method ?? "cash", amount: total }];

      const cashPayment = receiptPayments.find((p) => p.method === "cash");
      const changeAmt = cashPayment ? Math.max(0, cashTendered - total) : 0;

      const receipt: ReceiptData = {
        receiptNumber,
        businessName: business?.name || "Business",
        branchName: branch.name,
        address: business?.address || undefined,
        phone: business?.phone || undefined,
        email: business?.email || undefined,
        cashierName: profile.full_name || undefined,
        items: cart.map((item) => ({
          name: item.name,
          qty: item.qty,
          unitPrice: item.priceOverride ?? item.price,
          taxAmount: getItemTax(item),
          total: getItemTotal(item) + getItemTax(item),
          discount: item.itemDiscount > 0 ? item.itemDiscount : undefined,
          discountType: item.itemDiscount > 0 ? item.itemDiscountType : undefined,
          taxIndicator: item.tax_rate > 0 ? "V" : undefined,
        })),
        subtotal: itemsSubtotal,
        taxAmount,
        discountAmount: cartDiscountAmount,
        total,
        paymentMethod: splitMode ? "split" : (payments[0]?.method ?? "cash"),
        payments: receiptPayments,
        cashTendered: cashPayment ? cashTendered : undefined,
        changeAmount: changeAmt > 0 ? changeAmt : undefined,
        date: new Date(),
        config: {
          taxLabel: "VAT",
          currency: "KSh",
          showQR: true,
        },
      };
      setReceiptData(receipt);
      setShowReceipt(true);

      toast.success(`Sale completed! Receipt: ${receiptNumber}`);
      setCart([]);
      setCartDiscount(0);
      setCashTendered(0);
      setSplitMode(false);
      scanner.resetCount();
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <LicenseBanner />
      <ReceiptPreviewDialog open={showReceipt} onOpenChange={setShowReceipt} data={receiptData} />

      <div className="flex flex-col h-[calc(100vh-6rem)]">
        {/* Search bar with autocomplete */}
        <div className="relative mb-3 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search product name, SKU, or barcode..."
                className="pl-9 h-11 text-base"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(e.target.value.length > 0);
                }}
                onFocus={() => { if (searchTerm.length > 0) setShowSuggestions(true); }}
                onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
              />
            </div>
            <ScannerIndicator
              isActive={scanner.isActive}
              scanCount={scanner.scanCount}
              showFlash={scanner.showFlash}
              mode={scanMode}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled((p) => !p)}
              lastBarcode={scanner.lastScan?.sanitized}
            />
          </div>

          {/* Autocomplete dropdown */}
          {showSuggestions && filtered.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg max-h-72 overflow-y-auto">
              {filtered.slice(0, 10).map((product) => (
                <button
                  key={product.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    addToCart(product);
                    toast.success(`Added: ${product.name}`);
                    setSearchTerm("");
                    setShowSuggestions(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-b-0"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">
                      {(product.sku ?? product.name.slice(0, 3)).slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {product.sku && <span className="mr-2">SKU: {product.sku}</span>}
                      {product.barcode && <span>BC: {product.barcode}</span>}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary whitespace-nowrap">KSh {product.price.toFixed(2)}</span>
                </button>
              ))}
              {filtered.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{filtered.length - 10} more — keep typing to narrow down
                </p>
              )}
            </div>
          )}
          {showSuggestions && searchTerm.length > 0 && filtered.length === 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg p-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-1 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No products found</p>
            </div>
          )}
        </div>

        {/* Main content: Cart items + Payment side-by-side on desktop */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Cart items list */}
          <div className="flex-1 flex flex-col rounded-xl border border-border bg-card min-h-0">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold">Current Sale</h2>
                <p className="text-xs text-muted-foreground">
                  {cart.length} item(s) · {cart.reduce((s, i) => s + i.qty, 0)} units
                </p>
              </div>
              <div className="flex gap-1">
                {cart.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={holdTransaction}>
                      <PauseCircle className="h-3.5 w-3.5" /> Hold
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={voidCurrentSale}>
                      <XCircle className="h-3.5 w-3.5" /> Void
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Held sales */}
            {heldSales.length > 0 && (
              <div className="px-4 pt-2">
                <HeldSalesPanel heldSales={heldSales} onResume={resumeHeldSale} onDelete={deleteHeldSale} />
              </div>
            )}

            {/* Cart items or empty state */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 min-h-0">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Barcode className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No items yet</p>
                  <p className="text-xs mt-1">Search for a product or scan a barcode</p>
                </div>
              ) : (
                cart.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onUpdateQty={updateQty}
                    onRemove={removeItem}
                    onUpdateDiscount={updateItemDiscount}
                    onPriceOverride={overridePrice}
                    canOverridePrice={canOverridePrice}
                  />
                ))
              )}
            </div>
          </div>

          {/* Totals & Payment panel */}
          <div className="w-full lg:w-80 xl:w-96 flex flex-col rounded-xl border border-border bg-card shrink-0">
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-end">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-medium">KSh {itemsSubtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1">
                      <Percent className="h-3 w-3" /> Cart Discount
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3 space-y-2" side="top">
                    <Label className="text-xs">Cart Discount</Label>
                    <div className="flex gap-1">
                      <Button variant={cartDiscountType === "fixed" ? "default" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => setCartDiscountType("fixed")}>
                        <DollarSign className="h-3 w-3 mr-1" /> Fixed
                      </Button>
                      <Button variant={cartDiscountType === "percent" ? "default" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => setCartDiscountType("percent")}>
                        <Percent className="h-3 w-3 mr-1" /> %
                      </Button>
                    </div>
                    <Input
                      type="number"
                      value={cartDiscount || ""}
                      onChange={(e) => setCartDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8"
                      min="0"
                    />
                  </PopoverContent>
                </Popover>
                {cartDiscountAmount > 0 && (
                  <span className="text-xs text-destructive ml-auto">-KSh {cartDiscountAmount.toFixed(2)}</span>
                )}
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">KSh {taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-display text-xl font-bold pt-3 border-t border-border">
                <span>Total</span>
                <span>KSh {total.toFixed(2)}</span>
              </div>

              <SplitPaymentPanel
                total={total}
                payments={payments}
                onPaymentsChange={setPayments}
                splitMode={splitMode}
                onToggleSplit={() => {
                  setSplitMode(!splitMode);
                  if (!splitMode) {
                    setPayments([{ method: "cash", amount: total }]);
                  }
                }}
                cashTendered={cashTendered}
                onCashTenderedChange={setCashTendered}
                businessId={profile?.business_id ?? null}
              />

              <Button className="w-full h-12 text-base font-semibold" disabled={cart.length === 0 || processing || !canUsePOS} onClick={completeSale}>
                {!canUsePOS ? "License Required" : processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : "Complete Sale"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
