import { Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  category_id: string | null;
  stock_quantity: number;
}

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Package className="h-10 w-10 mb-3 opacity-20" />
        <p className="text-sm font-medium">No products found</p>
        <p className="text-xs mt-1">Try a different category or search</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAddToCart(product)}
          className="group flex flex-col rounded-lg border border-border bg-card p-3 text-left hover:border-primary/40 hover:shadow-sm transition-all active:scale-[0.97]"
        >
          {product.image_url ? (
            <div className="w-full aspect-square rounded-md bg-muted mb-2 overflow-hidden">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-md bg-muted/50 mb-2 flex items-center justify-center">
              <span className="text-lg font-bold text-muted-foreground/30">
                {product.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <p className="text-xs font-medium leading-tight line-clamp-2 min-h-[2rem]">
            {product.name}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs font-bold text-primary">
              KSh {product.price.toFixed(0)}
            </span>
            {product.stock_quantity <= 0 && (
              <span className="text-[9px] font-medium text-destructive">Out</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
