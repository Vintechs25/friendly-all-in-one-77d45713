import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Barcode, Minus, Trash2, CreditCard, Banknote, Smartphone, Loader2, Package, Printer } from "lucide-react";
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

type Product = Tables<"products">;
type PaymentMethod = "cash" | "card" | "mobile_money";

interface CartItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  tax_rate: number;
  qty: number;
  track_inventory: boolean;
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [scanMode, setScanMode] = useState<ScanMode>("checkout");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const { user, profile } = useAuth();
  const { canUsePOS } = useLicense();

  // Build barcode → product index for O(1) lookups
  const barcodeIndex = useMemo(() => {
    const idx = new Map<string, Product>();
    for (const p of products) {
      if (p.barcode) idx.set(p.barcode.toLowerCase(), p);
      if (p.sku) idx.set(p.sku.toLowerCase(), p);
    }
    return idx;
  }, [products]);

  // Scanner scan handler
  const handleScan = useCallback(
    (result: BarcodeResult) => {
      const code = result.sanitized.toLowerCase();

      if (scanMode === "search") {
        setSearchTerm(result.sanitized);
        return;
      }

      // Lookup by barcode or SKU
      const product = barcodeIndex.get(code);

      if (!product) {
        // Try partial match on name (for internal codes)
        const nameMatch = products.find(
          (p) => p.name.toLowerCase() === code || p.sku?.toLowerCase() === code
        );
        if (nameMatch) {
          addToCart(nameMatch);
          toast.success(`Added: ${nameMatch.name}`);
          return;
        }
        toast.error(`Product not found: ${result.sanitized}`);
        return;
      }

      if (scanMode === "quantity") {
        // Quantity mode: increment if already in cart
        setCart((prev) => {
          const existing = prev.find((i) => i.id === product.id);
          if (existing) {
            return prev.map((i) =>
              i.id === product.id ? { ...i, qty: i.qty + 1 } : i
            );
          }
          return [
            ...prev,
            {
              id: product.id,
              name: product.name,
              price: product.price,
              cost: product.cost,
              tax_rate: product.tax_rate,
              qty: 1,
              track_inventory: product.track_inventory,
            },
          ];
        });
        const currentQty = cart.find((i) => i.id === product.id)?.qty ?? 0;
        toast.success(`${product.name} × ${currentQty + 1}`);
        return;
      }

      // Default checkout mode
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    },
    [barcodeIndex, products, scanMode, cart]
  );

  const handleScanError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  const scanner = useScanner({
    enabled: true,
    mode: scanMode,
    config: { enableSound: soundEnabled },
    onScan: handleScan,
    onError: handleScanError,
  });

  // Load products from database
  useEffect(() => {
    const loadProducts = async () => {
      if (!profile?.business_id) return;
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", profile.business_id)
        .eq("is_active", true)
        .order("name");

      if (error) {
        toast.error("Failed to load products");
      } else {
        setProducts(data ?? []);
      }
      setLoadingProducts(false);
    };
    loadProducts();
  }, [profile?.business_id]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        cost: product.cost,
        tax_rate: product.tax_rate,
        qty: 1,
        track_inventory: product.track_inventory,
      }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxAmount = cart.reduce((s, i) => s + (i.price * i.qty * i.tax_rate / 100), 0);
  const total = subtotal + taxAmount;

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const completeSale = async () => {
    if (!user || !profile?.business_id || cart.length === 0) return;

    setProcessing(true);
    try {
      const { data: branches } = await supabase
        .from("branches")
        .select("id, name")
        .eq("business_id", profile.business_id)
        .eq("is_active", true)
        .limit(1);

      const branch = branches?.[0];
      if (!branch) {
        toast.error("No active branch found");
        return;
      }

      // Fetch business info for receipt
      const { data: business } = await supabase
        .from("businesses")
        .select("name, address, phone")
        .eq("id", profile.business_id)
        .single();

      const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          business_id: profile.business_id,
          branch_id: branch.id,
          cashier_id: user.id,
          receipt_number: receiptNumber,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: 0,
          total,
          payment_method: paymentMethod,
          status: "completed",
        })
        .select()
        .single();

      if (saleError) {
        toast.error("Failed to create sale: " + saleError.message);
        return;
      }

      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
        discount: 0,
        tax_amount: item.price * item.qty * item.tax_rate / 100,
        total: item.price * item.qty + (item.price * item.qty * item.tax_rate / 100),
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) {
        toast.error("Failed to save sale items: " + itemsError.message);
        return;
      }

      await supabase
        .from("payments")
        .insert({
          sale_id: sale.id,
          method: paymentMethod,
          amount: total,
        });

      for (const item of cart) {
        if (!item.track_inventory) continue;
        const { data: inv } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("product_id", item.id)
          .eq("branch_id", branch.id)
          .single();

        if (inv) {
          await supabase
            .from("inventory")
            .update({ quantity: Math.max(0, inv.quantity - item.qty) })
            .eq("id", inv.id);
        } else {
          await supabase
            .from("inventory")
            .insert({
              product_id: item.id,
              branch_id: branch.id,
              quantity: 0,
            });
        }
      }

      // Build receipt data and show preview
      const receipt: ReceiptData = {
        receiptNumber,
        businessName: business?.name || "Business",
        branchName: branch.name,
        address: business?.address || undefined,
        phone: business?.phone || undefined,
        cashierName: profile.full_name || undefined,
        items: cart.map((item) => ({
          name: item.name,
          qty: item.qty,
          unitPrice: item.price,
          taxAmount: item.price * item.qty * item.tax_rate / 100,
          total: item.price * item.qty + (item.price * item.qty * item.tax_rate / 100),
        })),
        subtotal,
        taxAmount,
        discountAmount: 0,
        total,
        paymentMethod,
        date: new Date(),
      };
      setReceiptData(receipt);
      setShowReceipt(true);

      toast.success(`Sale completed! Receipt: ${receiptNumber}`);
      setCart([]);
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
      <ReceiptPreviewDialog
        open={showReceipt}
        onOpenChange={setShowReceipt}
        data={receiptData}
      />
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8.5rem)]">
        {/* Products */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products or scan barcode..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Scan mode selector */}
            <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
              {(["checkout", "search", "quantity"] as ScanMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setScanMode(m)}
                  className={`px-3 py-2 text-[10px] font-medium capitalize transition-colors ${
                    scanMode === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Scanner indicator */}
          <div className="mb-3">
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

          {loadingProducts ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {products.length === 0 ? "No products yet" : "No matching products"}
              </p>
              <p className="text-xs mt-1">
                {products.length === 0 ? "Add products in the Inventory module first" : "Try a different search term"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto flex-1">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  onClick={() => { addToCart(product); toast.success(`Added: ${product.name}`); }}
                  className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all text-center"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <span className="text-xs font-bold text-primary">
                      {(product.sku ?? product.name.slice(0, 3)).slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-tight">{product.name}</p>
                  <p className="text-primary font-display font-bold mt-1">${product.price.toFixed(2)}</p>
                  {product.barcode && (
                    <div className="flex items-center gap-1 mt-1">
                      <Barcode className="h-3 w-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground font-mono">{product.barcode}</p>
                    </div>
                  )}
                  {product.tax_rate > 0 && (
                    <p className="text-[10px] text-muted-foreground">+{product.tax_rate}% tax</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="w-full lg:w-96 flex flex-col rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-semibold">Current Sale</h2>
            <p className="text-xs text-muted-foreground">{cart.length} item(s) · {cart.reduce((s, i) => s + i.qty, 0)} units</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Barcode className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Scan a barcode or tap a product</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.id, -1)} className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-background">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="h-7 w-7 rounded-md border border-border flex items-center justify-center hover:bg-background">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold w-16 text-right">${(item.price * item.qty).toFixed(2)}</span>
                  <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-border p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-display text-lg font-bold pt-2 border-t border-border">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                size="sm"
                className="flex-col h-auto py-2.5 gap-1"
                onClick={() => setPaymentMethod("cash")}
              >
                <Banknote className="h-4 w-4" />
                <span className="text-[10px]">Cash</span>
              </Button>
              <Button
                variant={paymentMethod === "card" ? "default" : "outline"}
                size="sm"
                className="flex-col h-auto py-2.5 gap-1"
                onClick={() => setPaymentMethod("card")}
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-[10px]">Card</span>
              </Button>
              <Button
                variant={paymentMethod === "mobile_money" ? "default" : "outline"}
                size="sm"
                className="flex-col h-auto py-2.5 gap-1"
                onClick={() => setPaymentMethod("mobile_money")}
              >
                <Smartphone className="h-4 w-4" />
                <span className="text-[10px]">Mobile</span>
              </Button>
            </div>
            <Button className="w-full" disabled={cart.length === 0 || processing || !canUsePOS} onClick={completeSale}>
              {!canUsePOS ? "License Required" : processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : "Complete Sale"}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
