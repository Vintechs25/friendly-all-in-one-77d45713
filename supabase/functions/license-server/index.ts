import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateLicenseKey(): string {
  const seg = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join("");
  return `LIC-${seg()}-${seg()}-${seg()}-${seg()}`;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const signingSecret = serviceKey.slice(0, 32);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ─── VALIDATE LICENSE ───
    if (action === "validate" && req.method === "POST") {
      const { license_key, device_fingerprint, device_name, server_time_check } = await req.json();

      if (!license_key || !device_fingerprint) {
        return json({ error: "license_key and device_fingerprint required" }, 400);
      }

      const serverNow = Date.now();
      if (server_time_check) {
        const drift = Math.abs(serverNow - server_time_check);
        if (drift > 5 * 60 * 1000) {
          return json({
            valid: false,
            reason: "clock_tamper",
            message: "System clock appears manipulated. Sync your clock and retry.",
            server_time: serverNow,
          });
        }
      }

      const { data: license, error: licErr } = await admin
        .from("licenses")
        .select("*, businesses(name)")
        .eq("license_key", license_key)
        .single();

      if (licErr || !license) {
        return json({ valid: false, reason: "invalid_key", message: "License key not found." });
      }

      if (license.status === "suspended") {
        return json({ valid: false, reason: "suspended", message: "This license has been suspended. Contact support." });
      }
      if (license.status === "terminated") {
        return json({ valid: false, reason: "terminated", message: "This license has been terminated." });
      }

      const expiresAt = new Date(license.expires_at).getTime();
      if (Date.now() > expiresAt) {
        if (license.status !== "expired") {
          await admin.from("licenses").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", license.id);
        }
        return json({
          valid: false, reason: "expired",
          message: "License has expired. Please renew your subscription.",
          expires_at: license.expires_at,
        });
      }

      // Device limit enforcement
      const { data: devices } = await admin.from("device_registrations").select("*").eq("license_id", license.id).eq("is_active", true);
      const existingDevice = devices?.find((d) => d.device_fingerprint === device_fingerprint);

      if (!existingDevice) {
        const activeCount = devices?.length || 0;
        if (activeCount >= license.allowed_device_count) {
          return json({
            valid: false, reason: "device_limit",
            message: `Device limit reached (${license.allowed_device_count}). Deactivate a device first.`,
          });
        }
        await admin.from("device_registrations").upsert({
          license_id: license.id, device_fingerprint, device_name: device_name || "Unknown Device",
          is_active: true, last_seen_at: new Date().toISOString(),
        }, { onConflict: "license_id,device_fingerprint" });
      } else {
        await admin.from("device_registrations").update({ last_seen_at: new Date().toISOString() }).eq("id", existingDevice.id);
      }

      await admin.from("licenses").update({ last_validated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", license.id);

      const payload = JSON.stringify({
        license_id: license.id, business_id: license.business_id, status: license.status,
        expires_at: license.expires_at, grace_period_hours: license.grace_period_hours,
        validated_at: new Date().toISOString(), server_time: serverNow,
      });
      const signature = await sign(payload, signingSecret);

      return json({
        valid: true, status: license.status, business_id: license.business_id,
        business_name: (license as any).businesses?.name, subscription_plan: license.subscription_plan,
        expires_at: license.expires_at, grace_period_hours: license.grace_period_hours,
        allowed_device_count: license.allowed_device_count,
        validation_token: { payload, signature }, server_time: serverNow,
      });
    }

    // ─── ACTIVATE LICENSE (business owner enters key) ───
    if (action === "activate" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authErr } = await admin.auth.getUser(token);
      if (authErr || !user) return json({ error: "Unauthorized" }, 401);

      const { license_key } = await req.json();
      if (!license_key) return json({ error: "license_key required" }, 400);

      // Get user's business
      const { data: prof } = await admin.from("profiles").select("business_id").eq("id", user.id).single();
      if (!prof?.business_id) return json({ error: "No business linked to your account" }, 400);

      // Find the license
      const { data: license } = await admin
        .from("licenses")
        .select("*")
        .eq("license_key", license_key.trim())
        .eq("business_id", prof.business_id)
        .single();

      if (!license) {
        return json({ success: false, error: "Invalid license key for your business." }, 400);
      }

      if (license.status === "suspended" || license.status === "terminated") {
        return json({ success: false, error: `License is ${license.status}.` }, 400);
      }

      // Check expiry
      if (new Date(license.expires_at).getTime() < Date.now()) {
        return json({ success: false, error: "This license has expired." }, 400);
      }

      // Mark license as active if not already
      if (license.status !== "active") {
        await admin.from("licenses").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", license.id);
      }

      // Update the business to mark subscription as the license plan (end trial)
      await admin.from("businesses").update({
        subscription_plan: license.subscription_plan,
        trial_ends_at: null,
        updated_at: new Date().toISOString(),
      }).eq("id", prof.business_id);

      return json({ success: true, message: "License activated successfully.", license_key: license.license_key });
    }

    // ─── END TRIAL (business owner action) ───
    if (action === "end_trial" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authErr } = await admin.auth.getUser(token);
      if (authErr || !user) return json({ error: "Unauthorized" }, 401);

      // Verify business_owner role
      const { data: roleCheck } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "business_owner").single();
      if (!roleCheck) return json({ error: "Only business owners can end trial" }, 403);

      const { data: prof } = await admin.from("profiles").select("business_id").eq("id", user.id).single();
      if (!prof?.business_id) return json({ error: "No business found" }, 400);

      // Set trial_ends_at to now, effectively ending the trial
      await admin.from("businesses").update({
        trial_ends_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", prof.business_id);

      return json({ success: true, message: "Trial ended. A license key is now required." });
    }

    // ─── GENERATE LICENSE (super_admin only) ───
    if (action === "generate" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authErr } = await admin.auth.getUser(token);
      if (authErr || !user) return json({ error: "Unauthorized" }, 401);

      const { data: roleCheck } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").single();
      if (!roleCheck) return json({ error: "Forbidden" }, 403);

      const { business_id, subscription_plan, expires_at, allowed_device_count, grace_period_hours } = await req.json();
      if (!business_id) return json({ error: "business_id required" }, 400);

      const licenseKey = generateLicenseKey();

      const { data: license, error: insErr } = await admin
        .from("licenses")
        .insert({
          business_id, license_key: licenseKey,
          subscription_plan: subscription_plan || "starter",
          expires_at: expires_at || new Date(Date.now() + 365 * 86400000).toISOString(),
          allowed_device_count: allowed_device_count || 2,
          grace_period_hours: grace_period_hours || 72,
          status: "active",
        })
        .select()
        .single();

      if (insErr) return json({ error: insErr.message }, 500);
      return json({ success: true, license });
    }

    // ─── SUSPEND / REACTIVATE (super_admin only) ───
    if ((action === "suspend" || action === "reactivate") && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Unauthorized" }, 401);

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authErr } = await admin.auth.getUser(token);
      if (authErr || !user) return json({ error: "Unauthorized" }, 401);

      const { data: roleCheck } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").single();
      if (!roleCheck) return json({ error: "Forbidden" }, 403);

      const { license_id } = await req.json();
      if (!license_id) return json({ error: "license_id required" }, 400);

      const newStatus = action === "suspend" ? "suspended" : "active";
      const { error: upErr } = await admin.from("licenses").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", license_id);

      if (upErr) return json({ error: upErr.message }, 500);
      return json({ success: true, status: newStatus });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("License server error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
