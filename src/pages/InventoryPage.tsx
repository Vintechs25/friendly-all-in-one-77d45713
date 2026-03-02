import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, Plus, AlertTriangle, Loader2, Package, Pencil, Trash2, Upload } from "lucide-react";
import BulkImportDialog from "@/components/inventory/BulkImportDialog";
import { autoFillProductFields } from "@/lib/product-auto-gen";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories">;

interface ProductWithStock extends Product {
  stock: number;
  reorder_level: number;
}

const statusStyles: Record<string, string> = {
  "in-stock": "bg-success/10 text-success",
  "low-stock": "bg-warning/10 text-warning",
  "out-of-stock": "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  "in-stock": "In Stock",
  "low-stock": "Low Stock",
  "out-of-stock": "Out of Stock",
};

function getStatus(stock: number, reorder: number) {
  if (stock <= 0) return "out-of-stock";
  if (stock <= reorder) return "low-stock";
  return "in-stock";
}

const emptyForm = {
  name: "", sku: "", barcode: "", price: "", cost: "", tax_rate: "0",
  category_id: "", description: "", unit: "piece", min_stock_level: "10",
  track_inventory: true, initial_stock: "0",
  expiry_date: "", batch_number: "", serial_number: "", minimum_price: "0",
};

export default function InventoryPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const businessId = profile?.business_id;

  const loadData = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);

    // Load branch, products, inventory, categories in parallel
    const [branchRes, prodRes, catRes] = await Promise.all([
      supabase.from("branches").select("id").eq("business_id", businessId).eq("is_active", true).limit(1),
      supabase.from("products").select("*").eq("business_id", businessId).order("name"),
      supabase.from("categories").select("*").eq("business_id", businessId).order("name"),
    ]);

    const bid = branchRes.data?.[0]?.id ?? null;
    setBranchId(bid);
    setCategories(catRes.data ?? []);

    if (!bid || !prodRes.data) {
      setProducts((prodRes.data ?? []).map(p => ({ ...p, stock: 0, reorder_level: p.min_stock_level ?? 10 })));
      setLoading(false);
      return;
    }

    // Load inventory for this branch
    const { data: invData } = await supabase
      .from("inventory")
      .select("product_id, quantity, reorder_level")
      .eq("branch_id", bid);

    const invMap = new Map((invData ?? []).map(i => [i.product_id, i]));

    setProducts(prodRes.data.map(p => {
      const inv = invMap.get(p.id);
      return { ...p, stock: inv?.quantity ?? 0, reorder_level: inv?.reorder_level ?? p.min_stock_level ?? 10 };
    }));
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    loadData();
    if (businessId) {
      const channel = supabase
        .channel('inventory-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => { loadData(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { loadData(); })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [loadData, businessId]);

  const lowStockCount = products.filter(p => getStatus(p.stock, p.reorder_level) !== "in-stock").length;

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const status = getStatus(p.stock, p.reorder_level);
    const matchesFilter = filterStatus === "all" || status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const openAddDialog = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (p: ProductWithStock) => {
    setEditingProduct(p);
    setForm({
      name: p.name, sku: p.sku ?? "", barcode: p.barcode ?? "",
      price: String(p.price), cost: String(p.cost), tax_rate: String(p.tax_rate),
      category_id: p.category_id ?? "", description: p.description ?? "",
      unit: p.unit ?? "piece", min_stock_level: String(p.min_stock_level ?? 10),
      track_inventory: p.track_inventory, initial_stock: String(p.stock),
      expiry_date: (p as any).expiry_date ?? "", batch_number: (p as any).batch_number ?? "",
      serial_number: (p as any).serial_number ?? "", minimum_price: String((p as any).minimum_price ?? 0),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!businessId || !form.name) {
      toast.error("Product name is required");
      return;
    }
    setSaving(true);
    try {
      let productData: any;

      if (editingProduct) {
        productData = {
          business_id: businessId,
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim() || null,
          price: parseFloat(form.price) || 0,
          cost: parseFloat(form.cost) || 0,
          tax_rate: parseFloat(form.tax_rate) || 0,
          category_id: form.category_id || null,
          description: form.description.trim() || null,
          unit: form.unit || "piece",
          min_stock_level: parseInt(form.min_stock_level) || 10,
          track_inventory: form.track_inventory,
          expiry_date: form.expiry_date || null,
          batch_number: form.batch_number.trim() || null,
          serial_number: form.serial_number.trim() || null,
          minimum_price: parseFloat(form.minimum_price) || 0,
        };
      } else {
        // Auto-fill missing fields for new products
        const autoFilled = await autoFillProductFields(
          {
            name: form.name.trim(),
            price: parseFloat(form.price) || 0,
            sku: form.sku.trim() || null,
            barcode: form.barcode.trim() || null,
            category_id: form.category_id || null,
            unit: form.unit || null,
            cost: parseFloat(form.cost) || 0,
            tax_rate: parseFloat(form.tax_rate) || 0,
            min_stock_level: parseInt(form.min_stock_level) || 10,
            initial_stock: parseInt(form.initial_stock) || 0,
          },
          businessId
        );
        productData = {
          ...autoFilled,
          description: form.description.trim() || null,
          expiry_date: form.expiry_date || null,
          batch_number: form.batch_number.trim() || null,
          serial_number: form.serial_number.trim() || null,
          minimum_price: parseFloat(form.minimum_price) || 0,
        };
      }

      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
        if (error) { toast.error(error.message); return; }

        // Also sync stock_quantity on the product itself
        const newQty = parseInt(form.initial_stock) || 0;
        await supabase.from("products").update({ stock_quantity: newQty }).eq("id", editingProduct.id);

        // Update inventory stock if changed
        if (branchId) {
          const { data: inv } = await supabase
            .from("inventory").select("id").eq("product_id", editingProduct.id).eq("branch_id", branchId).maybeSingle();
          if (inv) {
            const { error: invErr } = await supabase.from("inventory").update({ quantity: newQty, reorder_level: productData.min_stock_level }).eq("id", inv.id);
            if (invErr) console.error("Inventory update error:", invErr);
          } else {
            const { error: invErr } = await supabase.from("inventory").insert({ product_id: editingProduct.id, branch_id: branchId, quantity: newQty, reorder_level: productData.min_stock_level });
            if (invErr) console.error("Inventory insert error:", invErr);
          }
        }
        toast.success("Product updated");
      } else {
        const { data: newProduct, error } = await supabase.from("products").insert(productData).select().single();
        if (error) { toast.error(error.message); return; }

        // Create inventory record
        if (branchId && form.track_inventory) {
          await supabase.from("inventory").insert({
            product_id: newProduct.id, branch_id: branchId,
            quantity: parseInt(form.initial_stock) || 0,
            reorder_level: productData.min_stock_level,
          });
        }
        toast.success("Product added");
      }
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product removed");
    loadData();
  };

  const updateField = (field: string, value: string | boolean) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Inventory</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your products and stock levels</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Import CSV
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {lowStockCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium">{lowStockCount} product{lowStockCount > 1 ? "s" : ""} running low or out of stock</p>
              <p className="text-xs text-muted-foreground">Review and reorder to avoid stockouts</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setFilterStatus("low-stock")}>
              View
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">{products.length === 0 ? "No products yet" : "No matching products"}</p>
            {products.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" /> Add your first product
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-medium p-4">Product</th>
                    <th className="text-left font-medium p-4 hidden md:table-cell">SKU</th>
                    <th className="text-left font-medium p-4 hidden sm:table-cell">Category</th>
                    <th className="text-right font-medium p-4">Stock</th>
                    <th className="text-right font-medium p-4 hidden md:table-cell">Price</th>
                    <th className="text-right font-medium p-4 hidden md:table-cell">Cost</th>
                    <th className="text-center font-medium p-4">Status</th>
                    <th className="text-center font-medium p-4 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const status = getStatus(product.stock, product.reorder_level);
                    const cat = categories.find(c => c.id === product.category_id);
                    return (
                      <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium">{product.name}</td>
                        <td className="p-4 text-muted-foreground hidden md:table-cell">{product.sku ?? "—"}</td>
                        <td className="p-4 hidden sm:table-cell">{cat?.name ?? "—"}</td>
                        <td className="p-4 text-right font-semibold">{product.stock}</td>
                        <td className="p-4 text-right hidden md:table-cell">KSh {product.price.toFixed(2)}</td>
                        <td className="p-4 text-right hidden md:table-cell text-muted-foreground">KSh {product.cost.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
                            {statusLabels[status]}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditDialog(product)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(product.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={e => updateField("name", e.target.value)} placeholder="e.g. Coca-Cola 500ml" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={e => updateField("sku", e.target.value)} placeholder="Auto-generated if empty" />
              </div>
              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input value={form.barcode} onChange={e => updateField("barcode", e.target.value)} placeholder="Auto-generated if empty" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Price (KSh)</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={e => updateField("price", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cost (KSh)</Label>
                <Input type="number" step="0.01" min="0" value={form.cost} onChange={e => updateField("cost", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tax %</Label>
                <Input type="number" step="0.01" min="0" value={form.tax_rate} onChange={e => updateField("tax_rate", e.target.value)} />
              </div>
            </div>
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={v => updateField("category_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => updateField("unit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="liter">Liter</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                    <SelectItem value="meter">Meter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input type="number" min="0" value={form.min_stock_level} onChange={e => updateField("min_stock_level", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{editingProduct ? "Current Stock" : "Initial Stock"}</Label>
              <Input type="number" min="0" value={form.initial_stock} onChange={e => updateField("initial_stock", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => updateField("description", e.target.value)} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiry_date} onChange={e => updateField("expiry_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Batch Number</Label>
                <Input value={form.batch_number} onChange={e => updateField("batch_number", e.target.value)} placeholder="e.g. BATCH-001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input value={form.serial_number} onChange={e => updateField("serial_number", e.target.value)} placeholder="For electronics" />
              </div>
              <div className="space-y-2">
                <Label>Minimum Price (KSh)</Label>
                <Input type="number" step="0.01" min="0" value={form.minimum_price} onChange={e => updateField("minimum_price", e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : editingProduct ? "Update Product" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        businessId={businessId ?? ""}
        branchId={branchId}
        onImported={loadData}
      />
    </DashboardLayout>
  );
}
