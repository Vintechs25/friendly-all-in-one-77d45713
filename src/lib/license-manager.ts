/**
 * Client-side License Manager
 * Handles device fingerprinting, periodic validation, offline grace, and tamper detection.
 */

const STORAGE_KEY = "pos_license_state";
const VALIDATION_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

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
}

interface StoredLicenseState {
  licenseKey: string;
  lastValidatedAt: number; // epoch ms
  lastServerTime: number;
  gracePeriodHours: number;
  status: string;
  expiresAt: string;
  businessName?: string;
  subscriptionPlan?: string;
  validationToken?: { payload: string; signature: string };
  monotonicChecks: number[]; // last N timestamps for monotonic clock check
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
  
  // Simple hash function
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
  
  // If time went backwards significantly (>2 min), likely tampered
  if (stored.lastValidatedAt > 0 && now < stored.lastValidatedAt - 120000) {
    return true;
  }
  
  // Check monotonic progression
  if (stored.monotonicChecks.length >= 3) {
    const sorted = [...stored.monotonicChecks].sort((a, b) => a - b);
    // If timestamps aren't monotonically increasing, suspicious
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] < sorted[i - 1] - 60000) return true;
    }
  }
  
  // Compare with server time if available
  if (stored.lastServerTime > 0) {
    const drift = Math.abs(now - stored.lastServerTime);
    const timeSinceValidation = Math.abs(now - stored.lastValidatedAt);
    // If local clock drifted more than the time since validation + 5 min buffer, suspicious
    if (drift > timeSinceValidation + 300000) return true;
  }
  
  return false;
}

export async function validateLicense(
  licenseKey: string,
  projectId: string
): Promise<LicenseValidation> {
  const fingerprint = generateDeviceFingerprint();
  const deviceName = `${navigator.platform} - ${navigator.userAgent.split("(")[1]?.split(")")[0] || "Browser"}`;
  const functionUrl = `https://${projectId}.supabase.co/functions/v1/license-server?action=validate`;

  // Check stored state first
  const stored = getStoredState();
  
  // Try online validation
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
        gracePeriodHours: result.grace_period_hours || 72,
        status: result.status,
        expiresAt: result.expires_at,
        businessName: result.business_name,
        subscriptionPlan: result.subscription_plan,
        validationToken: result.validation_token,
        monotonicChecks: [...(stored?.monotonicChecks || []).slice(-9), Date.now()],
      };
      storeState(newStored);

      return {
        state: "active",
        message: "License validated successfully.",
        businessName: result.business_name,
        subscriptionPlan: result.subscription_plan,
        expiresAt: result.expires_at,
        lastValidatedAt: new Date().toISOString(),
        gracePeriodHours: result.grace_period_hours,
      };
    }

    // Handle specific failure reasons
    const reason = result.reason as string;
    
    if (reason === "suspended") {
      if (stored) storeState({ ...stored, status: "suspended" });
      return { state: "suspended", message: result.message };
    }
    if (reason === "terminated") {
      clearLicenseState();
      return { state: "terminated", message: result.message };
    }
    if (reason === "expired") {
      if (stored) storeState({ ...stored, status: "expired" });
      return { state: "expired", message: result.message, expiresAt: result.expires_at };
    }
    if (reason === "clock_tamper") {
      return { state: "locked", message: result.message };
    }
    if (reason === "device_limit") {
      return { state: "locked", message: result.message };
    }

    return { state: "locked", message: result.message || "License validation failed." };
  } catch {
    // ─── OFFLINE MODE ───
    if (!stored || stored.licenseKey !== licenseKey) {
      return { state: "unregistered", message: "Cannot validate license offline. Connect to the internet." };
    }

    // Tamper detection
    if (detectClockTamper(stored)) {
      return { state: "locked", message: "System clock manipulation detected. Connect to the internet to re-validate." };
    }

    // Check if suspended/terminated was last known status
    if (stored.status === "suspended") {
      return { state: "suspended", message: "License is suspended. Connect to internet to check for updates." };
    }
    if (stored.status === "terminated") {
      return { state: "terminated", message: "License has been terminated." };
    }
    if (stored.status === "expired") {
      return { state: "expired", message: "License expired. Connect to renew." };
    }

    // Grace period check
    const hoursSinceValidation = (Date.now() - stored.lastValidatedAt) / 3600000;
    const graceHours = stored.gracePeriodHours || 72;

    if (hoursSinceValidation > graceHours) {
      return {
        state: "locked",
        message: `Offline grace period (${graceHours}h) exceeded. Connect to the internet to re-validate.`,
      };
    }

    const graceExpiresAt = new Date(stored.lastValidatedAt + graceHours * 3600000).toISOString();

    // Update monotonic checks
    storeState({
      ...stored,
      monotonicChecks: [...stored.monotonicChecks.slice(-9), Date.now()],
    });

    return {
      state: "grace",
      message: `Operating in offline mode. Grace period expires ${new Date(graceExpiresAt).toLocaleString()}.`,
      businessName: stored.businessName,
      subscriptionPlan: stored.subscriptionPlan,
      expiresAt: stored.expiresAt,
      lastValidatedAt: new Date(stored.lastValidatedAt).toISOString(),
      gracePeriodHours: graceHours,
      graceExpiresAt,
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

  // Initial validation
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
