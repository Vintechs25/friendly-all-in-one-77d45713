import { Button } from "@/components/ui/button";
import { PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { HeldSale } from "./types";

interface HeldSalesPanelProps {
  heldSales: HeldSale[];
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function HeldSalesPanel({ heldSales, onResume, onDelete }: HeldSalesPanelProps) {
  if (heldSales.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
        <PauseCircle className="h-3.5 w-3.5" />
        Held Sales ({heldSales.length})
      </p>
      {heldSales.map((hs) => (
        <div
          key={hs.id}
          className="flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-3 py-2"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{hs.label || "Parked Sale"}</p>
            <p className="text-[10px] text-muted-foreground">
              {hs.itemCount} items · ${hs.total.toFixed(2)}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onResume(hs.id)}>
            <PlayCircle className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => onDelete(hs.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
