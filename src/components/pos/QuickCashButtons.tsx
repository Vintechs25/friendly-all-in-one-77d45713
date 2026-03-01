import { Button } from "@/components/ui/button";

interface QuickCashButtonsProps {
  total: number;
  onSelect: (amount: number) => void;
}

const DENOMINATIONS = [50, 100, 200, 500, 1000, 2000, 5000];

export default function QuickCashButtons({ total, onSelect }: QuickCashButtonsProps) {
  // Only show denominations >= total, plus exact and a few above
  const relevant = DENOMINATIONS.filter((d) => d >= total);
  const suggestions = [
    Math.ceil(total), // exact
    ...relevant.slice(0, 4),
  ].filter((v, i, arr) => arr.indexOf(v) === i && v > 0);

  return (
    <div className="flex flex-wrap gap-1">
      {suggestions.map((amount) => (
        <Button
          key={amount}
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-semibold touch-manipulation"
          onClick={() => onSelect(amount)}
        >
          {amount.toLocaleString()}
        </Button>
      ))}
    </div>
  );
}
