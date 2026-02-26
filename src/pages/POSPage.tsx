import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Barcode, Minus, Trash2, CreditCard, Banknote, Smartphone } from "lucide-react";
import { useState } from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const sampleProducts = [
  { id: "1", name: "Coca-Cola 500ml", price: 1.50, sku: "BEV-001" },
  { id: "2", name: "White Bread", price: 1.50, sku: "BAK-001" },
  { id: "3", name: "Cooking Oil 1L", price: 4.00, sku: "GRO-001" },
  { id: "4", name: "Sugar 1kg", price: 1.40, sku: "GRO-002" },
  { id: "5", name: "Milk 500ml", price: 1.20, sku: "DAI-001" },
  { id: "6", name: "Rice 2kg", price: 3.50, sku: "GRO-003" },
  { id: "7", name: "Eggs (Tray)", price: 4.50, sku: "DAI-002" },
  { id: "8", name: "Butter 250g", price: 2.80, sku: "DAI-003" },
];

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const addToCart = (product: typeof sampleProducts[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const filtered = sampleProducts.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)]">
        {/* Products */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products or scan barcode..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Barcode className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto flex-1">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all text-center"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-xs font-bold text-primary">{product.sku.slice(0, 3)}</span>
                </div>
                <p className="text-sm font-medium leading-tight">{product.name}</p>
                <p className="text-primary font-display font-bold mt-1">${product.price.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="w-full lg:w-96 flex flex-col rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-semibold">Current Sale</h2>
            <p className="text-xs text-muted-foreground">{cart.length} item(s)</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Plus className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Add products to start</p>
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
              <span className="text-muted-foreground">Tax (16%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-display text-lg font-bold pt-2 border-t border-border">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-col h-auto py-2.5 gap-1">
                <Banknote className="h-4 w-4" />
                <span className="text-[10px]">Cash</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-col h-auto py-2.5 gap-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-[10px]">Card</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-col h-auto py-2.5 gap-1">
                <Smartphone className="h-4 w-4" />
                <span className="text-[10px]">Mobile</span>
              </Button>
            </div>
            <Button className="w-full" disabled={cart.length === 0}>Complete Sale</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
