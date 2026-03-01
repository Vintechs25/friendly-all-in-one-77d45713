import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import {
  Store, ArrowLeft, Clock, Wifi, WifiOff, CloudOff, RefreshCw, Loader2,
  Scan, Volume2, VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScanMode } from "@/hooks/use-scanner";

interface POSLayoutProps {
  children: React.ReactNode;
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  onSync: () => void;
  scannerActive: boolean;
  scanCount: number;
  showFlash: boolean;
  scanMode: ScanMode;
  soundEnabled: boolean;
  onToggleSound: () => void;
  lastBarcode?: string;
}

export default function POSLayout({
  children,
  isOnline,
  pendingCount,
  syncing,
  onSync,
  scannerActive,
  scanCount,
  showFlash,
  scanMode,
  soundEnabled,
  onToggleSound,
  lastBarcode,
}: POSLayoutProps) {
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { branding } = useBranding();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const modeLabels: Record<ScanMode, string> = {
    checkout: "Checkout",
    search: "Search",
    quantity: "Count",
    discount: "Discount",
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ═══ POS STATUS BAR ═══ */}
      <header className="flex items-center justify-between h-11 px-3 bg-sidebar text-sidebar-foreground shrink-0 border-b border-sidebar-border">
        {/* Left: Back + Business */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-sidebar-accent/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="h-6 w-6 rounded object-cover" />
            ) : (
              <div className="h-6 w-6 rounded bg-sidebar-primary flex items-center justify-center">
                <Store className="h-3 w-3 text-sidebar-primary-foreground" />
              </div>
            )}
            <span className="text-xs font-semibold text-sidebar-accent-foreground hidden sm:inline">
              {branding.businessName}
            </span>
          </div>
        </div>

        {/* Center: Scanner status */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
              showFlash
                ? "bg-success/20 text-success"
                : scannerActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "bg-sidebar-accent/50 text-sidebar-foreground/50"
            )}
          >
            <Scan className={cn("h-3 w-3", showFlash && "text-success")} />
            <span>{modeLabels[scanMode]}</span>
            {scanCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {scanCount}
              </span>
            )}
          </div>
          {lastBarcode && (
            <span className="text-[10px] font-mono text-sidebar-foreground/50 hidden md:inline truncate max-w-32">
              {lastBarcode}
            </span>
          )}
          <button
            onClick={onToggleSound}
            className="p-1 rounded hover:bg-sidebar-accent/50 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-sidebar-foreground/60" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-sidebar-foreground/40" />
            )}
          </button>
        </div>

        {/* Right: Status + Cashier + Clock */}
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5 text-success" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
            )}
            {pendingCount > 0 && (
              <button
                onClick={onSync}
                disabled={syncing || !isOnline}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning/20 text-warning hover:bg-warning/30 transition-colors"
              >
                {syncing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CloudOff className="h-3 w-3" />
                )}
                {pendingCount}
              </button>
            )}
          </div>

          {/* Cashier */}
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-[10px] font-bold text-sidebar-primary">
              {profile?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
            </div>
            <span className="text-[11px] text-sidebar-accent-foreground font-medium">
              {profile?.full_name?.split(" ")[0] || "Cashier"}
            </span>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-1 text-[11px] text-sidebar-foreground/70 font-mono">
            <Clock className="h-3 w-3" />
            {time.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: true })}
          </div>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
