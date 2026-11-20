/**
 * Environment-Aware Application & API Configuration
 * 
 * Manages environment-specific behaviors and API endpoint resolutions across
 * local development, staging, and production.
 * 
 * Provides runtime validation with actionable error messages when misconfigurations occur.
 */

export type AppEnvironment = "development" | "staging" | "production" | "test";

export interface EnvironmentConfig {
  /** The identified environment */
  environment: AppEnvironment;
  /** Base URL for backend API requests */
  apiBaseUrl: string;
  /** Default Stellar Soroban network for this environment */
  defaultNetwork: "testnet" | "mainnet" | "futurenet";
  /** Whether mock responses are permitted if services are unavailable */
  allowMockFallback: boolean;
  /** Logging verbosity */
  logLevel: "debug" | "info" | "warn" | "error";
  /** Request timeout in milliseconds */
  apiTimeoutMs: number;
  /** Environment-specific feature toggles */
  features: {
    enableDevTools: boolean;
    enableDetailedErrorResponses: boolean;
    enforceHttps: boolean;
  };
}

/**
 * Standard configuration presets by environment.
 * Can be overridden via NEXT_PUBLIC_* environment variables.
 */
const ENV_PRESETS: Record<AppEnvironment, EnvironmentConfig> = {
  development: {
    environment: "development",
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    defaultNetwork: "testnet",
    allowMockFallback: true,
    logLevel: "debug",
    apiTimeoutMs: 15000,
    features: {
      enableDevTools: true,
      enableDetailedErrorResponses: true,
      enforceHttps: false,
    },
  },
  staging: {
    environment: "staging",
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "https://staging-api.stellarveriphy.io",
    defaultNetwork: "testnet",
    allowMockFallback: false,
    logLevel: "info",
    apiTimeoutMs: 10000,
    features: {
      enableDevTools: true,
      enableDetailedErrorResponses: true,
      enforceHttps: true,
    },
  },
  production: {
    environment: "production",
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "https://api.stellarveriphy.io",
    defaultNetwork: "mainnet",
    allowMockFallback: false,
    logLevel: "warn",
    apiTimeoutMs: 8000,
    features: {
      enableDevTools: false,
      enableDetailedErrorResponses: false,
      enforceHttps: true,
    },
  },
  test: {
    environment: "test",
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    defaultNetwork: "testnet",
    allowMockFallback: true,
    logLevel: "error",
    apiTimeoutMs: 5000,
    features: {
      enableDevTools: false,
      enableDetailedErrorResponses: true,
      enforceHttps: false,
    },
  },
};

/**
 * Determines the current runtime environment with fallback to development.
 */
export function getCurrentEnvironment(): AppEnvironment {
  const envString = (
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development"
  ).toLowerCase();

  if (envString.includes("prod")) return "production";
  if (envString.includes("stag")) return "staging";
  if (envString.includes("test")) return "test";
  return "development";
}

/**
 * Validates the environment configuration and produces helpful, actionable guidance upon error.
 */
export function validateEnvironmentConfig(config: EnvironmentConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check valid URL
  try {
    const url = new URL(config.apiBaseUrl);
    if (config.features.enforceHttps && url.protocol !== "https:") {
      errors.push(
        `[Environment Misconfiguration] In ${config.environment}, NEXT_PUBLIC_API_URL must use https://. Current: ${config.apiBaseUrl}`
      );
    }
    if (config.environment === "production" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      errors.push(
        `[Environment Misconfiguration] Production cannot point to localhost/127.0.0.1. Please set NEXT_PUBLIC_API_URL to your production domain.`
      );
    }
  } catch {
    errors.push(
      `[Environment Misconfiguration] Invalid NEXT_PUBLIC_API_URL format: "${config.apiBaseUrl}". Must be a valid absolute or relative URL.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Retrieves the active environment configuration with runtime validation.
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const currentEnv = getCurrentEnvironment();
  const config = { ...ENV_PRESETS[currentEnv] };

  // Runtime sanity check
  const validation = validateEnvironmentConfig(config);
  if (!validation.valid) {
    if (typeof console !== "undefined") {
      validation.errors.forEach((err) => console.error(err));
    }
    if (currentEnv === "production") {
      throw new Error(`Critical configuration error: ${validation.errors.join("; ")}`);
    }
  }

  return config;
}

/**
 * Resolves an API path against the environment's configured base endpoint.
 * Accepts both relative paths (e.g. "/api/uploads") and absolute URLs.
 */
export function resolveApiEndpoint(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const { apiBaseUrl } = getEnvironmentConfig();
  const cleanBase = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}

/**
 * Browser Capability Detection
 *
 * Shared source of truth for detecting unsupported browser capabilities so the
 * app can degrade gracefully (banner, PWA registration, error boundaries) instead
 * of failing silently.
 */

export type BrowserCapability =
  | "serviceWorker"
  | "cryptoSubtle"
  | "indexedDB"
  | "broadcastChannel"
  | "localStorage"
  | "fetch"
  | "webSockets"
  | "notifications";

export interface CapabilityCheck {
  /** The capability being checked */
  capability: BrowserCapability;
  /** Whether the capability is available */
  supported: boolean;
  /** Plain-language name of the capability, safe for primary messages */
  name: string;
  /** Technical name of the capability, for "technical details" only */
  label: string;
  /** Targeted, actionable guidance shown when the capability is missing */
  guidance: string;
}

export interface CapabilityReport {
  /** True when every required capability is available */
  supported: boolean;
  /** Capabilities that are missing in the current browser */
  missing: CapabilityCheck[];
  /** All capability checks performed */
  checks: CapabilityCheck[];
}

/**
 * Copy for each capability. `name` is plain language for the primary message;
 * `label` is the technical name, shown only inside "technical details".
 * `guidance` is the recommended next step, written for non-technical users.
 */
const CAPABILITY_META: Record<BrowserCapability, { name: string; label: string; guidance: string }> = {
  serviceWorker: {
    name: "offline access",
    label: "Service Workers",
    guidance:
      "Offline access and background updates are off. Update to the latest Chrome, Edge, Firefox, or Safari to turn them on.",
  },
  cryptoSubtle: {
    name: "secure signing",
    label: "Web Crypto (crypto.subtle)",
    guidance:
      "Signing and encryption need a secure connection. Open StellarVeriphy over HTTPS in a current browser.",
  },
  indexedDB: {
    name: "saving drafts on this device",
    label: "IndexedDB",
    guidance:
      "Drafts can't be saved on this device. Turn off private or incognito mode, or switch to a current browser.",
  },
  broadcastChannel: {
    name: "syncing across tabs",
    label: "BroadcastChannel",
    guidance:
      "Changes made in another open tab may not appear until you refresh this page.",
  },
  localStorage: {
    name: "remembering your preferences",
    label: "Local Storage",
    guidance:
      "Your preferences won't be remembered. Allow site storage for this site, or leave private browsing.",
  },
  fetch: {
    name: "loading data",
    label: "Fetch API",
    guidance:
      "Pages can't load data in this browser. Update to the latest Chrome, Edge, Firefox, or Safari.",
  },
  webSockets: {
    name: "live status updates",
    label: "WebSockets",
    guidance:
      "Live status updates are paused. Refresh the page to see the latest information.",
  },
  notifications: {
    name: "browser notifications",
    label: "Notifications API",
    guidance:
      "You won't receive browser notifications. Everything else still works. Allow notifications in your browser settings to turn them on.",
  },
};

/**
 * Capabilities that are essential for the app to function at all.
 * Missing any of these means the app should show a blocking message.
 */
export const REQUIRED_CAPABILITIES: BrowserCapability[] = ["fetch", "cryptoSubtle"];

/**
 * Capabilities that are optional; missing them degrades features gracefully.
 */
export const OPTIONAL_CAPABILITIES: BrowserCapability[] = [
  "serviceWorker",
  "indexedDB",
  "broadcastChannel",
  "localStorage",
  "webSockets",
  "notifications",
];

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function checkCapability(capability: BrowserCapability): boolean {
  if (!hasWindow()) return false;

  try {
    switch (capability) {
      case "serviceWorker":
        return "serviceWorker" in navigator;
      case "cryptoSubtle":
        return (
          typeof crypto !== "undefined" &&
          typeof crypto.subtle !== "undefined" &&
          crypto.subtle !== null
        );
      case "indexedDB":
        return typeof indexedDB !== "undefined";
      case "broadcastChannel":
        return typeof BroadcastChannel !== "undefined";
      case "localStorage":
        try {
          const probe = "__capability_probe__";
          window.localStorage.setItem(probe, "1");
          window.localStorage.removeItem(probe);
          return true;
        } catch {
          return false;
        }
      case "fetch":
        return typeof fetch === "function";
      case "webSockets":
        return typeof WebSocket !== "undefined";
      case "notifications":
        return "Notification" in window;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Builds a full capability report for the current browser.
 * Safe to call during SSR; all capabilities report as unsupported without a window.
 */
export function detectCapabilities(): CapabilityReport {
  const all = [...REQUIRED_CAPABILITIES, ...OPTIONAL_CAPABILITIES];
  const checks: CapabilityCheck[] = all.map((capability) => ({
    capability,
    supported: checkCapability(capability),
    name: CAPABILITY_META[capability].name,
    label: CAPABILITY_META[capability].label,
    guidance: CAPABILITY_META[capability].guidance,
  }));

  const missing = checks.filter((c) => !c.supported);

  return {
    supported: missing.length === 0,
    missing,
    checks,
  };
}

/**
 * Returns a targeted, human-readable message naming the missing capability.
 * Returns null when the capability is available.
 */
export function getMissingCapabilityMessage(capability: BrowserCapability): string | null {
  if (checkCapability(capability)) return null;
  const meta = CAPABILITY_META[capability];
  return `This browser can't support ${meta.name}. ${meta.guidance}`;
}

/**
 * Returns the first missing required capability, if any.
 * Useful for error boundaries that must block rendering.
 */
export function getFirstMissingRequiredCapability(): CapabilityCheck | null {
  for (const capability of REQUIRED_CAPABILITIES) {
    if (!checkCapability(capability)) {
      return {
        capability,
        supported: false,
        name: CAPABILITY_META[capability].name,
        label: CAPABILITY_META[capability].label,
        guidance: CAPABILITY_META[capability].guidance,
      };
    }
  }
  return null;
}
