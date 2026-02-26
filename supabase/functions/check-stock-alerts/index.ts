import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Low stock alerts — products where inventory <= min_stock_level
    const { data: lowStock } = await supabase.rpc("get_low_stock_products");

    // Fallback: query directly if RPC doesn't exist
    const { data: products } = await supabase
      .from("products")
      .select("id, name, business_id, min_stock_level")
      .eq("is_active", true)
      .eq("track_inventory", true);

    if (products) {
      for (const product of products) {
        // Get total inventory for this product
        const { data: inv } = await supabase
          .from("inventory")
          .select("quantity")
          .eq("product_id", product.id);

        const totalQty = inv?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
        const threshold = product.min_stock_level ?? 10;

        if (totalQty <= threshold) {
          // Check if we already sent this alert today
          const today = new Date().toISOString().split("T")[0];
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("business_id", product.business_id)
            .eq("category", "low_stock")
            .eq("reference_id", product.id)
            .gte("created_at", today + "T00:00:00Z")
            .limit(1);

          if (!existing || existing.length === 0) {
            const notifType = totalQty === 0 ? "critical" : "warning";
            const title =
              totalQty === 0
                ? `Out of Stock: ${product.name}`
                : `Low Stock: ${product.name}`;
            const message =
              totalQty === 0
                ? `${product.name} is completely out of stock. Reorder immediately.`
                : `${product.name} has only ${totalQty} units left (threshold: ${threshold}).`;

            await supabase.from("notifications").insert({
              business_id: product.business_id,
              title,
              message,
              type: notifType,
              category: "low_stock",
              reference_id: product.id,
              reference_type: "product",
            });
          }
        }
      }
    }

    // 2. Expiry warnings — products expiring within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiryDate = thirtyDaysFromNow.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];

    const { data: expiringProducts } = await supabase
      .from("products")
      .select("id, name, business_id, expiry_date")
      .eq("is_active", true)
      .not("expiry_date", "is", null)
      .lte("expiry_date", expiryDate);

    if (expiringProducts) {
      for (const product of expiringProducts) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("business_id", product.business_id)
          .eq("category", "expiry")
          .eq("reference_id", product.id)
          .gte("created_at", todayStr + "T00:00:00Z")
          .limit(1);

        if (!existing || existing.length === 0) {
          const expiryD = new Date(product.expiry_date!);
          const now = new Date();
          const daysLeft = Math.ceil(
            (expiryD.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          const isExpired = daysLeft <= 0;
          const notifType = isExpired ? "critical" : "warning";
          const title = isExpired
            ? `Expired: ${product.name}`
            : `Expiring Soon: ${product.name}`;
          const message = isExpired
            ? `${product.name} expired on ${product.expiry_date}. Remove from inventory.`
            : `${product.name} expires in ${daysLeft} day(s) on ${product.expiry_date}.`;

          await supabase.from("notifications").insert({
            business_id: product.business_id,
            title,
            message,
            type: notifType,
            category: "expiry",
            reference_id: product.id,
            reference_type: "product",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Stock alerts checked" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
