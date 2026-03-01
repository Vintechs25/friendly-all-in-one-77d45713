import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DeviceStatuses } from "@/components/hardware/DeviceStatusIndicators";

export interface TerminalHardwareConfig {
  id: string;
  business_id: string;
  branch_id: string | null;
  terminal_name: string;
  printer_enabled: boolean;
  printer_connection_type: string;
  drawer_enabled: boolean;
  scanner_enabled: boolean;
  scale_enabled: boolean;
  printer_status: string;
  drawer_status: string;
  scanner_status: string;
  scale_status: string;
  created_at: string;
  updated_at: string;
}

export function useHardwareConfig(branchId?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const businessId = profile?.business_id;

  const { data: configs = [], isLoading } = useQuery<TerminalHardwareConfig[]>({
    queryKey: ["terminal-hardware", businessId, branchId],
    enabled: !!businessId,
    staleTime: 15_000,
    queryFn: async () => {
      let q = supabase
        .from("terminal_hardware_configs")
        .select("*")
        .eq("business_id", businessId!);
      if (branchId) q = q.eq("branch_id", branchId);
      const { data, error } = await q.order("terminal_name");
      if (error) { console.error("Hardware config error:", error); return []; }
      return (data ?? []) as TerminalHardwareConfig[];
    },
  });

  const upsertConfig = useMutation({
    mutationFn: async (config: Partial<TerminalHardwareConfig> & { id?: string }) => {
      if (config.id) {
        const { error } = await supabase
          .from("terminal_hardware_configs")
          .update(config)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("terminal_hardware_configs")
          .insert({ ...config, business_id: businessId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terminal-hardware"] });
      toast.success("Hardware configuration saved");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save config"),
  });

  // Derive device statuses for POS header indicators
  const activeConfig = configs[0]; // Use first/default terminal
  const deviceStatuses: DeviceStatuses = {
    printer: activeConfig?.printer_enabled
      ? (activeConfig.printer_status as "connected" | "disconnected" | "error") ?? "disconnected"
      : "disconnected",
    drawer: activeConfig?.drawer_enabled
      ? (activeConfig.drawer_status as "connected" | "disconnected" | "error") ?? "disconnected"
      : "disconnected",
    scanner: activeConfig?.scanner_enabled
      ? (activeConfig.scanner_status as "connected" | "disconnected" | "waiting") ?? "waiting"
      : "disconnected",
    internet: "online", // Will be overridden by online status hook
  };

  return { configs, isLoading, upsertConfig, deviceStatuses, activeConfig };
}
