import { useEffect, useRef, useCallback, useState } from "react";
import {
  ScanEngine,
  ScanEngineConfig,
  BarcodeResult,
  cacheOfflineScan,
} from "@/lib/scan-engine";

export type ScanMode = "checkout" | "search" | "quantity" | "discount";

interface UseScannerOptions {
  /** Whether scanner is active */
  enabled?: boolean;
  /** Current scan mode */
  mode?: ScanMode;
  /** Engine config overrides */
  config?: Partial<ScanEngineConfig>;
  /** Called when a valid barcode is scanned */
  onScan: (result: BarcodeResult) => void;
  /** Called on scan error */
  onError?: (error: string, raw: string) => void;
  /** Whether currently offline (will cache scans) */
  offline?: boolean;
}

interface ScannerState {
  lastScan: BarcodeResult | null;
  scanCount: number;
  isActive: boolean;
  showFlash: boolean;
}

export function useScanner({
  enabled = true,
  mode = "checkout",
  config,
  onScan,
  onError,
  offline = false,
}: UseScannerOptions) {
  const engineRef = useRef<ScanEngine | null>(null);
  const [state, setState] = useState<ScannerState>({
    lastScan: null,
    scanCount: 0,
    isActive: false,
    showFlash: false,
  });
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleScan = useCallback(
    (result: BarcodeResult) => {
      // Visual flash
      setState((prev) => ({
        ...prev,
        lastScan: result,
        scanCount: prev.scanCount + 1,
        showFlash: true,
      }));
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setState((prev) => ({ ...prev, showFlash: false }));
      }, 300);

      // Cache if offline
      if (offline) {
        cacheOfflineScan(result);
      }

      onScan(result);
    },
    [onScan, offline]
  );

  const handleError = useCallback(
    (error: string, raw: string) => {
      onError?.(error, raw);
    },
    [onError]
  );

  useEffect(() => {
    if (!enabled) {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
        setState((prev) => ({ ...prev, isActive: false }));
      }
      return;
    }

    const engine = new ScanEngine(config);
    engineRef.current = engine;
    engine.start(handleScan, handleError);
    setState((prev) => ({ ...prev, isActive: true }));

    return () => {
      engine.stop();
      engineRef.current = null;
      setState((prev) => ({ ...prev, isActive: false }));
    };
  }, [enabled, handleScan, handleError]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    engineRef.current?.updateConfig(config || {});
  }, [config]);

  const resetCount = useCallback(() => {
    setState((prev) => ({ ...prev, scanCount: 0 }));
  }, []);

  return {
    ...state,
    mode,
    resetCount,
    engine: engineRef.current,
  };
}
