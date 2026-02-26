import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BusinessBranding {
  businessId: string;
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  invoicePrefix: string;
  receiptFooterText: string;
  receiptHeaderText: string | null;
  currencyCode: string;
  currencySymbol: string;
  defaultTaxLabel: string;
  defaultTaxRate: number;
  themeMode: "light" | "dark" | "system";
  allowBrandingEdit: boolean;
  allowNameEdit: boolean;
  platformWatermark: boolean;
}

const DEFAULT_BRANDING: BusinessBranding = {
  businessId: "",
  businessName: "SwiftPOS",
  logoUrl: null,
  primaryColor: "160 84% 39%",
  secondaryColor: "220 60% 50%",
  invoicePrefix: "INV",
  receiptFooterText: "Thank you for shopping with us!",
  receiptHeaderText: null,
  currencyCode: "KES",
  currencySymbol: "KSh",
  defaultTaxLabel: "VAT",
  defaultTaxRate: 16,
  themeMode: "light",
  allowBrandingEdit: false,
  allowNameEdit: false,
  platformWatermark: true,
};

interface BrandingContextType {
  branding: BusinessBranding;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  loading: true,
  refreshBranding: async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [branding, setBranding] = useState<BusinessBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    if (!profile?.business_id) {
      setBranding(DEFAULT_BRANDING);
      setLoading(false);
      return;
    }

    try {
      // Fetch business name
      const { data: business } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", profile.business_id)
        .single();

      // Fetch settings
      const { data: settings } = await supabase
        .from("business_settings")
        .select("*")
        .eq("business_id", profile.business_id)
        .single();

      if (settings) {
        const newBranding: BusinessBranding = {
          businessId: profile.business_id,
          businessName: business?.name || "SwiftPOS",
          logoUrl: settings.logo_url,
          primaryColor: settings.primary_color || DEFAULT_BRANDING.primaryColor,
          secondaryColor: settings.secondary_color || DEFAULT_BRANDING.secondaryColor,
          invoicePrefix: settings.invoice_prefix || "INV",
          receiptFooterText: settings.receipt_footer_text || DEFAULT_BRANDING.receiptFooterText,
          receiptHeaderText: settings.receipt_header_text,
          currencyCode: settings.currency_code || "KES",
          currencySymbol: settings.currency_symbol || "KSh",
          defaultTaxLabel: settings.default_tax_label || "VAT",
          defaultTaxRate: Number(settings.default_tax_rate) || 16,
          themeMode: (settings.theme_mode as any) || "light",
          allowBrandingEdit: settings.allow_branding_edit ?? false,
          allowNameEdit: settings.allow_name_edit ?? false,
          platformWatermark: settings.platform_watermark ?? true,
        };
        setBranding(newBranding);
        applyThemeColors(newBranding);
      } else {
        setBranding({
          ...DEFAULT_BRANDING,
          businessId: profile.business_id,
          businessName: business?.name || "SwiftPOS",
        });
      }
    } catch (err) {
      console.error("Failed to fetch branding:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, [profile?.business_id]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

/** Apply business theme colors to CSS custom properties */
function applyThemeColors(branding: BusinessBranding) {
  const root = document.documentElement;
  if (branding.primaryColor) {
    root.style.setProperty("--primary", branding.primaryColor);
    root.style.setProperty("--ring", branding.primaryColor);
    root.style.setProperty("--sidebar-primary", branding.primaryColor);
    root.style.setProperty("--sidebar-ring", branding.primaryColor);
    // Derive a lighter version for success token
    root.style.setProperty("--success", branding.primaryColor);
  }
  if (branding.secondaryColor) {
    root.style.setProperty("--accent", branding.secondaryColor);
    root.style.setProperty("--info", branding.secondaryColor);
  }
}
