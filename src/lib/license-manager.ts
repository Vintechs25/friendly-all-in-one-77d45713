/**
 * Client-side License Manager
 * Handles device fingerprinting, periodic validation, offline grace, and tamper detection.
 * Enhanced with validation logging and subscription enforcement.
 */

import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "pos_license_state";
const VALIDATION_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export type LicenseState = "active" | "expired" | "suspended" | "terminated" | "grace" | "locked" | "unregistered";

export interface LicenseValidation {
  state: LicenseState;
  message: string;
  businessName?: string;
  subscriptionPlan?: string;
  expiresAt?: string;
  lastValidatedAt?: string;
  gracePeriodHours?: number;
  graceExpiresAt?: string;
  /** When true, block new sales but allow dashboard view */
  salesBlocked?: boolean;
  /** When true, block all logins */
  loginBlocked?: boolean;
}

interface StoredLicenseState {
  licenseKey: string;
  lastValidatedAt: number;
  lastServerTime: number;
  gracePeriodHours: number;
  status: string;
  expiresAt: string;
  businessName?: string;
  businessId?: string;
  subscriptionPlan?: string;
  validationToken?: { payload: string; signature: string };
  monotonicChecks: number[];
}

// Generate a stable device fingerprint from browser characteristics
export function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency?.toString() || "unknown",
    (navigator as any).deviceMemory?.toString() || "unknown",
  ];
  
  const str = components.join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "DFP-" + Math.abs(hash).toString(36).toUpperCase().padStart(12, "0");
}

function getStoredState(): StoredLicenseState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeState(state: StoredLicenseState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearLicenseState() {
  localStorage.removeItem(STORAGE_KEY);
}

// Detect system date manipulation via monotonic clock checks
function detectClockTamper(stored: StoredLicenseState): boolean {
  const now = Date.now();
  if (stored.lastValidatedAt > 0 && now < stored.lastValidatedAt - 120000) return true;
  if (stored.monotonicChecks.length >= 3) {
    const sorted = [...stored.monotonicChecks].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] < sorted[i - 1] - 60000) return true;
    }
  }
  if (stored.lastServerTime > 0) {
    const drift = Math.abs(now - stored.lastServerTime);
    const timeSinceValidation = Math.abs(now - stored.lastValidatedAt);
    if (drift > timeSinceValidation + 300000) return true;
  }
  return false;
}

/** Log a validation attempt to the database */
async function logValidation(
  businessId: string,
  deviceFingerprint: string,
  deviceName: string,
  status: string,
  failureReason?: string
) {
  try {
    await supabase.from("license_validations").insert({
      business_id: businessId,
      device_fingerprint: deviceFingerprint,
      device_name: deviceName,
      validation_status: status,
      failure_reason: failureReason || null,
    } as any);
  } catch {
    // Silent fail — don't block POS for logging issues
  }
}

export async function validateLicense(
  licenseKey: string,
  projectId: string
): Promise<LicenseValidation> {
  const fingerprint = generateDeviceFingerprint();
  const deviceName = `${navigator.platform} - ${navigator.userAgent.split("(")[1]?.split(")")[0] || "Browser"}`;
  const functionUrl = `https://${projectId}.supabase.co/functions/v1/license-server?action=validate`;

  const stored = getStoredState();
  
  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        license_key: licenseKey,
        device_fingerprint: fingerprint,
        device_name: deviceName,
        server_time_check: Date.now(),
      }),
    });

    const result = await response.json();

    if (result.valid) {
      const newStored: StoredLicenseState = {
        licenseKey,
        lastValidatedAt: Date.now(),
        lastServerTime: result.server_time,
        gracePeriodHours: result.grace_period_hours || 168, // 7 days default
        status: result.status,
        expiresAt: result.expires_at,
        businessName: result.business_name,
        businessId: result.business_id,
        subscriptionPlan: result.subscription_plan,
        validationToken: result.validation_token,
        monotonicChecks: [...(stored?.monotonicChecks || []).slice(-9), Date.now()],
      };
      storeState(newStored);

      // Log successful validation
      if (result.business_id) {
        logValidation(result.business_id, fingerprint, deviceName, "success");
      }

      return {
        state: "active",
        message: "License validated successfully.",
        businessName: result.business_name,
        subscriptionPlan: result.subscription_plan,
        expiresAt: result.expires_at,
        lastValidatedAt: new Date().toISOString(),
        gracePeriodHours: result.grace_period_hours,
        salesBlocked: false,
        loginBlocked: false,
      };
    }

    const reason = result.reason as string;
    const businessId = result.business_id || stored?.businessId;

    if (businessId) {
      logValidation(businessId, fingerprint, deviceName, "failed", reason);
    }
    
    if (reason === "suspended") {
      if (stored) storeState({ ...stored, status: "suspended" });
      return {
        state: "suspended",
        message: "This business has been suspended by the platform administrator. Contact support.",
        loginBlocked: true,
        salesBlocked: true,
      };
    }
    if (reason === "terminated") {
      clearLicenseState();
      return {
        state: "terminated",
        message: result.message,
        loginBlocked: true,
        salesBlocked: true,
      };
    }
    if (reason === "expired") {
      if (stored) storeState({ ...stored, status: "expired" });
      return {
        state: "expired",
        message: "Your subscription has expired. New sales are disabled. Please renew to continue.",
        expiresAt: result.expires_at,
        salesBlocked: true,
        loginBlocked: false, // Allow limited dashboard access
      };
    }
    if (reason === "clock_tamper") {
      return {
        state: "locked",
        message: "System clock manipulation detected. Connect to the internet to re-validate.",
        salesBlocked: true,
        loginBlocked: true,
      };
    }
    if (reason === "device_limit") {
      return {
        state: "locked",
        message: "Maximum device limit reached. Deactivate another device or upgrade your plan.",
        salesBlocked: true,
        loginBlocked: true,
      };
    }

    return {
      state: "locked",
      message: result.message || "License validation failed.",
      salesBlocked: true,
      loginBlocked: true,
    };
  } catch {
    // ─── OFFLINE MODE ───
    if (!stored || stored.licenseKey !== licenseKey) {
      return {
        state: "unregistered",
        message: "Cannot validate license offline. Connect to the internet.",
        salesBlocked: true,
        loginBlocked: true,
      };
    }

    if (detectClockTamper(stored)) {
      return {
        state: "locked",
        message: "System clock manipulation detected. Connect to the internet to re-validate.",
        salesBlocked: true,
        loginBlocked: true,
      };
    }

    if (stored.status === "suspended") {
      return {
        state: "suspended",
        message: "Business is suspended. Connect to internet to check for updates.",
        loginBlocked: true,
        salesBlocked: true,
      };
    }
    if (stored.status === "terminated") {
      return { state: "terminated", message: "License terminated.", loginBlocked: true, salesBlocked: true };
    }
    if (stored.status === "expired") {
      return {
        state: "expired",
        message: "Subscription expired. Connect to renew.",
        salesBlocked: true,
        loginBlocked: false,
      };
    }

    // Grace period check
    const hoursSinceValidation = (Date.now() - stored.lastValidatedAt) / 3600000;
    const graceHours = stored.gracePeriodHours || 168;

    if (hoursSinceValidation > graceHours) {
      return {
        state: "locked",
        message: `Offline grace period (${Math.round(graceHours / 24)} days) exceeded. Connect to the internet.`,
        salesBlocked: true,
        loginBlocked: true,
      };
    }

    const graceExpiresAt = new Date(stored.lastValidatedAt + graceHours * 3600000).toISOString();

    storeState({
      ...stored,
      monotonicChecks: [...stored.monotonicChecks.slice(-9), Date.now()],
    });

    return {
      state: "grace",
      message: `Offline mode. Grace period expires ${new Date(graceExpiresAt).toLocaleString()}.`,
      businessName: stored.businessName,
      subscriptionPlan: stored.subscriptionPlan,
      expiresAt: stored.expiresAt,
      lastValidatedAt: new Date(stored.lastValidatedAt).toISOString(),
      gracePeriodHours: graceHours,
      graceExpiresAt,
      salesBlocked: false,
      loginBlocked: false,
    };
  }
}

// Periodic validation timer
let validationTimer: ReturnType<typeof setInterval> | null = null;

export function startPeriodicValidation(
  licenseKey: string,
  projectId: string,
  onStateChange: (validation: LicenseValidation) => void,
  intervalMs = VALIDATION_INTERVAL_MS
) {
  stopPeriodicValidation();
  validateLicense(licenseKey, projectId).then(onStateChange);
  validationTimer = setInterval(async () => {
    const result = await validateLicense(licenseKey, projectId);
    onStateChange(result);
  }, intervalMs);
}

export function stopPeriodicValidation() {
  if (validationTimer) {
    clearInterval(validationTimer);
    validationTimer = null;
  }
}
