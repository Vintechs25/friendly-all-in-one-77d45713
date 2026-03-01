import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useLicense, LicenseBanner } from "@/contexts/LicenseContext";
import { usePermissions } from "@/hooks/usePermissions";
import type { Permission } from "@/hooks/usePermissions";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Settings,
  Receipt,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Menu,
  Clock,
  RotateCcw,
  UserCheck,
  Truck,
  ClipboardList,
  ClipboardMinus,
  ArrowRightLeft,
  Shield,
  FileText,
  X,
  Store,
  Monitor,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/NotificationCenter";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
  permission?: Permission;
  group: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", group: "Main" },
  { icon: ShoppingCart, label: "Point of Sale", path: "/dashboard/pos", permission: "manage_pos", group: "Main" },
  { icon: Receipt, label: "Sales", path: "/dashboard/sales", permission: "manage_sales", group: "Sales" },
  { icon: RotateCcw, label: "Refunds", path: "/dashboard/refunds", permission: "manage_refunds", group: "Sales" },
  { icon: UserCheck, label: "Customers", path: "/dashboard/customers", permission: "manage_customers", group: "Sales" },
  { icon: Clock, label: "Shifts", path: "/dashboard/shifts", permission: "manage_pos", group: "Sales" },
  { icon: Package, label: "Inventory", path: "/dashboard/inventory", permission: "manage_inventory", group: "Stock" },
  { icon: Truck, label: "Suppliers", path: "/dashboard/suppliers", permission: "manage_suppliers", group: "Stock" },
  { icon: ClipboardList, label: "Purchase Orders", path: "/dashboard/purchase-orders", permission: "manage_purchase_orders", group: "Stock" },
  { icon: ClipboardMinus, label: "Adjustments", path: "/dashboard/stock-adjustments", permission: "manage_stock", group: "Stock" },
  { icon: ArrowRightLeft, label: "Transfers", path: "/dashboard/stock-transfers", permission: "manage_stock", group: "Stock" },
  { icon: BarChart3, label: "Reports", path: "/dashboard/reports", permission: "view_reports", group: "Admin" },
  { icon: Users, label: "Team", path: "/dashboard/team", permission: "manage_team", group: "Admin" },
  { icon: FileText, label: "Audit Logs", path: "/dashboard/audit-logs", permission: "view_audit_logs", group: "Admin" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings", permission: "manage_settings", group: "Admin" },
  { icon: Monitor, label: "Hardware", path: "/dashboard/hardware", permission: "manage_settings", group: "Admin" },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { can } = usePermissions();
  const { branding } = useBranding();
  const { licenseState } = useLicense();
  const { isPermissionAllowedByFeature, isRouteAllowedByFeature } = useFeatureToggles();

  const visibleNavItems = navItems.filter((item) => {
    // Check RBAC permission
    if (item.permission && !can(item.permission)) return false;
    // Check feature toggle by permission
    if (item.permission && !isPermissionAllowedByFeature(item.permission)) return false;
    // Check feature toggle by route
    if (!isRouteAllowedByFeature(item.path)) return false;
    return true;
  });

  // Group items
  const groups = ["Main", "Sales", "Stock", "Admin"];
  const groupedItems = groups.map((g) => ({
    label: g,
    items: visibleNavItems.filter((i) => i.group === g),
  })).filter((g) => g.items.length > 0);

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
          collapsed ? "w-[68px]" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo / Business Branding */}
        <div className="flex h-14 items-center px-3 gap-2 border-b border-sidebar-border">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.businessName}
              className="h-8 w-8 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
              <Store className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="font-display text-sm font-bold text-sidebar-accent-foreground truncate block leading-tight">
                {branding.businessName}
              </span>
              <span className="text-[10px] text-sidebar-foreground/50 leading-tight">
                {licenseState === "active" ? "Licensed" : licenseState === "grace" ? "Offline" : "Trial"}
              </span>
            </div>
          )}
          <button className="lg:hidden ml-auto text-sidebar-foreground" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
          {groupedItems.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-2 mb-1">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-primary/15 text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border p-2 space-y-0.5">
          {branding.platformWatermark && !collapsed && (
            <p className="text-[9px] text-sidebar-foreground/30 text-center pb-1">
              Powered by SwiftPOS
            </p>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 w-56 h-8 text-sm bg-background" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </div>
          </div>
        </header>

        {/* License Banner */}
        <LicenseBanner />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
