import { Package, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  category_id: string | null;
  stock_quantity: number;
  [key: string]: any;
}

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: any) => void;
}

export default function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-15" />
        <p className="text-sm font-semibold">No products found</p>
        <p className="text-xs mt-1 text-muted-foreground/70">Try a different category or search</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
      {products.map((product) => {
        const outOfStock = product.stock_quantity <= 0;
        return (
          <button
            key={product.id}
            onClick={() => onAddToCart(product)}
            disabled={outOfStock}
            className={cn(
              "group relative flex flex-col rounded-xl border-2 p-2.5 text-left transition-all touch-manipulation select-none",
              outOfStock
                ? "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
                : "border-border bg-card hover:border-primary/50 hover:shadow-md active:scale-[0.96] active:shadow-none"
            )}
          >
            {/* Image / Placeholder */}
            {product.image_url ? (
              <div className="w-full aspect-[4/3] rounded-lg bg-muted overflow-hidden mb-2">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-full aspect-[4/3] rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 mb-2 flex items-center justify-center">
                <span className="text-xl font-black text-primary/20">
                  {product.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}

            {/* Name */}
            <p className="text-[13px] font-semibold leading-tight line-clamp-2 min-h-[2.25rem] text-foreground">
              {product.name}
            </p>

            {/* Price row */}
            <div className="flex items-center justify-between mt-auto pt-1.5">
              <span className="text-sm font-bold text-primary">
                KSh {product.price.toLocaleString("en-KE", { minimumFractionDigits: 0 })}
              </span>
              {outOfStock ? (
                <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                  OUT
                </span>
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ShoppingCart className="h-3 w-3 text-primary" />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
