import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user
    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action } = body;

    if (action === "add_member") {
      const { email, password, full_name, role, business_id } = body;

      if (!email || !password || !full_name || !role || !business_id) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify calling user belongs to this business and has permission
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("business_id")
        .eq("user_id", callingUser.id)
        .single();

      if (callerProfile?.business_id !== business_id) {
        // Also check if super_admin
        const { data: isSuperAdmin } = await adminClient.rpc("has_role", {
          _user_id: callingUser.id,
          _role: "super_admin",
        });
        if (!isSuperAdmin) {
          return new Response(JSON.stringify({ error: "Business not found or unauthorized" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Verify the business exists
      const { data: business, error: bizError } = await adminClient
        .from("businesses")
        .select("id")
        .eq("id", business_id)
        .single();

      if (bizError || !business) {
        return new Response(JSON.stringify({ error: "Business not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create the user with admin API (won't affect calling user's session)
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newUserId = newUser.user.id;

      // Update profile with business_id
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ business_id, full_name })
        .eq("user_id", newUserId);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // Assign role
      const ROLE_HIERARCHY: Record<string, number> = {
        super_admin: 0,
        business_owner: 1,
        manager: 2,
        cashier: 3,
        waiter: 4,
        inventory_officer: 3,
      };

      const { error: roleError } = await adminClient.from("user_roles").insert({
        user_id: newUserId,
        role,
        business_id,
        hierarchy_level: ROLE_HIERARCHY[role] ?? 5,
      });

      if (roleError) {
        console.error("Role insert error:", roleError);
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Audit log
      await adminClient.from("audit_logs").insert({
        action: "user_created",
        table_name: "profiles",
        record_id: newUserId,
        business_id,
        user_id: callingUser.id,
        new_data: { email, role, name: full_name },
      });

      return new Response(
        JSON.stringify({ success: true, user_id: newUserId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-team error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
