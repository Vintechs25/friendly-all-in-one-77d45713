import { Button } from "@/components/ui/button";

interface QuickCashButtonsProps {
  total: number;
  onSelect: (amount: number) => void;
}

const DENOMINATIONS = [50, 100, 200, 500, 1000, 2000, 5000];

export default function QuickCashButtons({ total, onSelect }: QuickCashButtonsProps) {
  const exact = Math.ceil(total);
  const relevant = DENOMINATIONS.filter((d) => d >= total);
  const suggestions = [exact, ...relevant.slice(0, 4)]
    .filter((v, i, arr) => arr.indexOf(v) === i && v > 0);

  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map((amount, i) => (
        <Button
          key={amount}
          variant={i === 0 ? "default" : "outline"}
          size="sm"
          className="h-9 px-3 text-xs font-bold touch-manipulation flex-1 min-w-[60px]"
          onClick={() => onSelect(amount)}
        >
          {amount.toLocaleString()}
        </Button>
      ))}
    </div>
  );
}
