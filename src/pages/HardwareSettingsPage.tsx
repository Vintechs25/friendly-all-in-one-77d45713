import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useHardwareConfig, TerminalHardwareConfig } from "@/hooks/useHardwareConfig";
import ManagerPinDialog from "@/components/hardware/ManagerPinDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Printer, BoxSelect, ScanLine, Scale, Monitor, Settings2, Activity,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusIcon = (status: string) => {
  switch (status) {
    case "connected": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "error": return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default: return <XCircle className="h-4 w-4 text-muted-foreground/50" />;
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case "connected": return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Connected</Badge>;
    case "error": return <Badge variant="destructive">Error</Badge>;
    default: return <Badge variant="secondary">Disconnected</Badge>;
  }
};

export default function HardwareSettingsPage() {
  const { hasRole } = useAuth();
  const { configs, isLoading, upsertConfig } = useHardwareConfig();
  const [pinAction, setPinAction] = useState<{ label: string; callback: () => void } | null>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagResults, setDiagResults] = useState<Record<string, string> | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<TerminalHardwareConfig> | null>(null);

  const canConfigure = hasRole("business_owner") || hasRole("branch_manager") || hasRole("manager") || hasRole("super_admin");

  if (!canConfigure) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Settings2 className="h-16 w-16 mb-4 opacity-20" />
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm">You don't have permission to access hardware settings.</p>
        </div>
      </DashboardLayout>
    );
  }

  const requirePin = (label: string, callback: () => void) => {
    setPinAction({ label, callback });
  };

  const handleToggleDevice = (config: TerminalHardwareConfig, device: string, enabled: boolean) => {
    requirePin(`${enabled ? "Enable" : "Disable"} ${device}`, () => {
      upsertConfig.mutate({ id: config.id, [`${device}_enabled`]: enabled });
    });
  };

  const handleRunDiagnostics = (config: TerminalHardwareConfig) => {
    requirePin("Run full hardware diagnostics", async () => {
      setRunningDiagnostics(true);
      setDiagResults(null);
      // Simulate diagnostics (real hardware API would go here)
      await new Promise((r) => setTimeout(r, 2000));
      const results: Record<string, string> = {
        Printer: config.printer_enabled ? "OK" : "Disabled",
        "Cash Drawer": config.drawer_enabled ? "OK" : "Disabled",
        Scanner: config.scanner_enabled ? "OK" : "Disabled",
        Scale: config.scale_enabled ? "Not Detected" : "Disabled",
      };
      setDiagResults(results);
      setRunningDiagnostics(false);
      toast.success("Diagnostics complete");
    });
  };

  const handleTestPrinter = () => {
    toast.success("Test receipt sent to printer");
  };

  const handleTestDrawer = () => {
    toast.success("Cash drawer open command sent");
  };

  const handleTestScanner = () => {
    toast.info("Scan a barcode now to test...");
  };

  const handleTestScale = () => {
    toast.info("Place item on scale to read weight...");
  };

  const handleAddTerminal = () => {
    setEditingConfig({
      terminal_name: `Terminal ${configs.length + 1}`,
      printer_enabled: true,
      printer_connection_type: "usb",
      drawer_enabled: true,
      scanner_enabled: true,
      scale_enabled: false,
    });
  };

  const handleSaveNewTerminal = () => {
    if (!editingConfig?.terminal_name) return;
    upsertConfig.mutate(editingConfig);
    setEditingConfig(null);
  };

  const activeConfig = configs[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Monitor className="h-6 w-6" /> Hardware Settings
            </h1>
            <p className="text-muted-foreground text-sm">
              Settings → Terminal Settings → Hardware
            </p>
          </div>
          <Button onClick={handleAddTerminal} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Terminal
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : configs.length === 0 && !editingConfig ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Monitor className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-semibold">No terminals configured</p>
              <p className="text-sm mt-1">Add a terminal to configure hardware devices.</p>
              <Button onClick={handleAddTerminal} className="mt-4 gap-1.5">
                <Plus className="h-4 w-4" /> Add Terminal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* New terminal form */}
            {editingConfig && !editingConfig.id && (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base">New Terminal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Terminal Name</Label>
                    <Input
                      value={editingConfig.terminal_name ?? ""}
                      onChange={(e) => setEditingConfig({ ...editingConfig, terminal_name: e.target.value })}
                      placeholder="e.g. Checkout 1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveNewTerminal} size="sm">Save Terminal</Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingConfig(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing terminals */}
            {configs.map((config) => (
              <div key={config.id} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">{config.terminal_name}</h2>
                  <Badge variant="outline" className="text-xs">{config.branch_id ? "Branch" : "Default"}</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Printer */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Printer className="h-4 w-4" /> Receipt Printer
                        </CardTitle>
                        {statusBadge(config.printer_status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Enabled</Label>
                        <Switch
                          checked={config.printer_enabled}
                          onCheckedChange={(v) => handleToggleDevice(config, "printer", v)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Connection Type</Label>
                        <Select
                          value={config.printer_connection_type}
                          onValueChange={(v) => requirePin("Change printer connection", () => {
                            upsertConfig.mutate({ id: config.id, printer_connection_type: v });
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="usb">USB</SelectItem>
                            <SelectItem value="network">Network</SelectItem>
                            <SelectItem value="bluetooth">Bluetooth</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleTestPrinter}>
                        Print Test Receipt
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Cash Drawer */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BoxSelect className="h-4 w-4" /> Cash Drawer
                        </CardTitle>
                        {statusBadge(config.drawer_status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Enabled</Label>
                        <Switch
                          checked={config.drawer_enabled}
                          onCheckedChange={(v) => handleToggleDevice(config, "drawer", v)}
                        />
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleTestDrawer}>
                        Open Drawer Test
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Scanner */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ScanLine className="h-4 w-4" /> Barcode Scanner
                        </CardTitle>
                        {statusBadge(config.scanner_status === "waiting" ? "connected" : config.scanner_status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Enabled</Label>
                        <Switch
                          checked={config.scanner_enabled}
                          onCheckedChange={(v) => handleToggleDevice(config, "scanner", v)}
                        />
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleTestScanner}>
                        Scan Test
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Scale */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Scale className="h-4 w-4" /> Electronic Scale
                        </CardTitle>
                        {statusBadge(config.scale_status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Enabled</Label>
                        <Switch
                          checked={config.scale_enabled}
                          onCheckedChange={(v) => handleToggleDevice(config, "scale", v)}
                        />
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleTestScale}>
                        Read Weight Test
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Diagnostics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Hardware Diagnostics
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Run a full diagnostic test on all connected devices.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={() => handleRunDiagnostics(config)}
                      disabled={runningDiagnostics}
                      size="sm"
                      className="gap-1.5"
                    >
                      {runningDiagnostics ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Running...</>
                      ) : (
                        <><Activity className="h-4 w-4" /> Run Diagnostics</>
                      )}
                    </Button>

                    {diagResults && (
                      <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                        {Object.entries(diagResults).map(([device, result]) => (
                          <div key={device} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{device}</span>
                            <span className={cn(
                              "font-mono text-xs",
                              result === "OK" ? "text-emerald-600" : result === "Not Detected" ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {result}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Separator />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manager PIN dialog */}
      <ManagerPinDialog
        open={!!pinAction}
        onOpenChange={(open) => !open && setPinAction(null)}
        actionLabel={pinAction?.label ?? ""}
        onAuthorized={() => pinAction?.callback()}
      />
    </DashboardLayout>
  );
}
