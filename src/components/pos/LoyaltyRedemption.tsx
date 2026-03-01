import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Gift } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LoyaltyRedemptionProps {
  customerName: string;
  availablePoints: number;
  pointValue: number; // KSh value per point (e.g. 1 point = KSh 1)
  maxRedeemable: number; // max KSh that can be redeemed (usually the total)
  onRedeem: (points: number) => void;
  redeemedPoints: number;
}

export default function LoyaltyRedemption({
  customerName,
  availablePoints,
  pointValue,
  maxRedeemable,
  onRedeem,
  redeemedPoints,
}: LoyaltyRedemptionProps) {
  const [pointsInput, setPointsInput] = useState("");
  const [open, setOpen] = useState(false);

  const maxPoints = Math.min(
    availablePoints,
    Math.floor(maxRedeemable / pointValue)
  );
  const maxValue = maxPoints * pointValue;

  if (availablePoints <= 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
        <span>{availablePoints} pts</span>
      </div>
      {redeemedPoints > 0 ? (
        <div className="flex items-center gap-1 text-xs text-primary font-medium">
          <Gift className="h-3 w-3" />
          -{(redeemedPoints * pointValue).toFixed(0)} KSh
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1 text-[10px] text-destructive"
            onClick={() => onRedeem(0)}
          >
            ✕
          </Button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] gap-1"
            >
              <Gift className="h-3 w-3" /> Redeem
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 space-y-2" side="top">
            <Label className="text-xs">Redeem Loyalty Points</Label>
            <p className="text-[10px] text-muted-foreground">
              {availablePoints} pts available (max {maxPoints} pts = KSh {maxValue.toFixed(0)})
            </p>
            <Input
              type="number"
              value={pointsInput}
              onChange={(e) => setPointsInput(e.target.value)}
              placeholder={`Max: ${maxPoints}`}
              className="h-8"
              min="0"
              max={maxPoints}
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => {
                  const pts = Math.min(parseInt(pointsInput) || 0, maxPoints);
                  if (pts > 0) onRedeem(pts);
                  setOpen(false);
                }}
              >
                Apply
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  onRedeem(maxPoints);
                  setOpen(false);
                }}
              >
                Use All
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
