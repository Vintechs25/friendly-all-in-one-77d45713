import { Printer, BoxSelect, ScanLine, Scale, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface DeviceStatuses {
  printer: "connected" | "disconnected" | "error";
  drawer: "connected" | "disconnected" | "error";
  scanner: "connected" | "disconnected" | "waiting";
  internet: "online" | "offline";
}

interface DeviceStatusIndicatorsProps {
  statuses: DeviceStatuses;
  compact?: boolean;
}

const statusColor = (s: string) => {
  switch (s) {
    case "connected":
    case "online":
      return "text-emerald-500";
    case "waiting":
      return "text-amber-500";
    case "disconnected":
    case "offline":
      return "text-muted-foreground/40";
    case "error":
      return "text-destructive";
    default:
      return "text-muted-foreground/40";
  }
};

const statusDot = (s: string) => {
  switch (s) {
    case "connected":
    case "online":
      return "bg-emerald-500";
    case "waiting":
      return "bg-amber-500 animate-pulse";
    case "disconnected":
    case "offline":
      return "bg-muted-foreground/30";
    case "error":
      return "bg-destructive animate-pulse";
    default:
      return "bg-muted-foreground/30";
  }
};

const devices = [
  { key: "printer" as const, icon: Printer, label: "Printer" },
  { key: "drawer" as const, icon: BoxSelect, label: "Drawer" },
  { key: "scanner" as const, icon: ScanLine, label: "Scanner" },
  { key: "internet" as const, icon: Wifi, label: "Internet" },
] as const;

export default function DeviceStatusIndicators({ statuses, compact }: DeviceStatusIndicatorsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {devices.map(({ key, icon: Icon, label }) => {
        const status = statuses[key];
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors",
                compact ? "gap-0.5" : "gap-1"
              )}>
                <Icon className={cn("h-3 w-3", statusColor(status))} />
                <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(status))} />
                {!compact && (
                  <span className={cn("text-[10px] font-medium", statusColor(status))}>
                    {label}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}: {status}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
