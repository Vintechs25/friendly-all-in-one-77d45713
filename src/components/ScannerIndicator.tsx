import { cn } from "@/lib/utils";
import { Scan, Wifi, WifiOff, Volume2, VolumeX } from "lucide-react";
import type { ScanMode } from "@/hooks/use-scanner";

interface ScannerIndicatorProps {
  isActive: boolean;
  scanCount: number;
  showFlash: boolean;
  mode: ScanMode;
  soundEnabled: boolean;
  onToggleSound: () => void;
  lastBarcode?: string;
  offline?: boolean;
}

const modeLabels: Record<ScanMode, string> = {
  checkout: "Scan to Add",
  search: "Scan to Search",
  quantity: "Scan to Count",
  discount: "Scan for Discount",
};

export default function ScannerIndicator({
  isActive,
  scanCount,
  showFlash,
  mode,
  soundEnabled,
  onToggleSound,
  lastBarcode,
  offline,
}: ScannerIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all duration-200",
        showFlash
          ? "border-green-500 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
          : isActive
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-muted/50 opacity-60"
      )}
    >
      <Scan
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          showFlash ? "text-green-500" : isActive ? "text-primary animate-pulse" : "text-muted-foreground"
        )}
      />
      <div className="flex flex-col min-w-0">
        <span className="font-medium truncate">
          {isActive ? modeLabels[mode] : "Scanner Inactive"}
        </span>
        {lastBarcode && (
          <span className="text-muted-foreground font-mono truncate max-w-[120px]">
            {lastBarcode}
          </span>
        )}
      </div>
      {scanCount > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {scanCount}
        </span>
      )}
      <div className="flex items-center gap-1 ml-auto">
        {offline ? (
          <WifiOff className="h-3 w-3 text-yellow-500" />
        ) : (
          <Wifi className="h-3 w-3 text-green-500" />
        )}
        <button
          onClick={onToggleSound}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          title={soundEnabled ? "Mute scan sounds" : "Enable scan sounds"}
        >
          {soundEnabled ? (
            <Volume2 className="h-3 w-3 text-muted-foreground" />
          ) : (
            <VolumeX className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
