import { Wifi, WifiOff, CloudOff, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  onSync: () => void;
}

export default function OfflineIndicator({
  isOnline,
  pendingCount,
  syncing,
  onSync,
}: OfflineIndicatorProps) {
  if (isOnline && pendingCount === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary">
              <Wifi className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium hidden sm:inline">Online</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Connected to server</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            {!isOnline ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/10 text-destructive">
                <WifiOff className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium">Offline</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary">
                <Wifi className="h-3.5 w-3.5" />
              </div>
            )}
            {pendingCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[10px] gap-1"
                onClick={onSync}
                disabled={syncing || !isOnline}
              >
                {syncing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CloudOff className="h-3 w-3" />
                )}
                {pendingCount} pending
                {isOnline && !syncing && <RefreshCw className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {!isOnline
              ? "Working offline. Sales will sync when connection returns."
              : `${pendingCount} sale(s) waiting to sync`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
