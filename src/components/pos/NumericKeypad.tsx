import { useState } from "react";
import { Delete, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumericKeypadProps {
  value: number;
  onChange: (value: number) => void;
  total: number;
}

export default function NumericKeypad({ value, onChange, total }: NumericKeypadProps) {
  const [display, setDisplay] = useState(value > 0 ? String(value) : "");

  const append = (char: string) => {
    setDisplay((prev) => {
      // Prevent multiple dots
      if (char === "." && prev.includes(".")) return prev;
      // Limit decimal places to 2
      const dotIndex = prev.indexOf(".");
      if (dotIndex !== -1 && prev.length - dotIndex > 2) return prev;
      const next = prev + char;
      onChange(parseFloat(next) || 0);
      return next;
    });
  };

  const backspace = () => {
    setDisplay((prev) => {
      const next = prev.slice(0, -1);
      onChange(parseFloat(next) || 0);
      return next;
    });
  };

  const clear = () => {
    setDisplay("");
    onChange(0);
  };

  const setExact = () => {
    const exact = Math.ceil(total).toString();
    setDisplay(exact);
    onChange(parseFloat(exact));
  };

  const changeAmount = (parseFloat(display) || 0) >= total
    ? (parseFloat(display) || 0) - total
    : 0;

  const keys = [
    "7", "8", "9",
    "4", "5", "6",
    "1", "2", "3",
    ".", "0", "backspace",
  ];

  return (
    <div className="space-y-2">
      {/* Display */}
      <div className="rounded-xl bg-muted/60 border border-border p-3">
        <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Cash Tendered</p>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground font-medium">KSh</span>
          <span className={cn(
            "font-display text-3xl font-black tabular-nums tracking-tight transition-colors",
            display ? "text-foreground" : "text-muted-foreground/30"
          )}>
            {display || "0.00"}
          </span>
        </div>
        {(parseFloat(display) || 0) >= total && total > 0 && (
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border">
            <span className="text-[10px] font-medium text-muted-foreground">Change</span>
            <span className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">
              KSh {changeAmount.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {keys.map((key) => {
          if (key === "backspace") {
            return (
              <button
                key={key}
                onClick={backspace}
                onDoubleClick={clear}
                className="h-12 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all touch-manipulation select-none"
              >
                <Delete className="h-5 w-5" />
              </button>
            );
          }
          return (
            <button
              key={key}
              onClick={() => append(key)}
              className="h-12 rounded-xl bg-background border border-border flex items-center justify-center text-lg font-bold hover:bg-muted active:scale-95 transition-all touch-manipulation select-none"
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* Exact amount button */}
      <button
        onClick={setExact}
        className="w-full h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/15 active:scale-[0.98] transition-all touch-manipulation flex items-center justify-center gap-1.5"
      >
        <Check className="h-3.5 w-3.5" />
        Exact — KSh {Math.ceil(total).toLocaleString()}
      </button>
    </div>
  );
}
