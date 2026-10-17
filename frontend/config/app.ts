/**
 * app.ts
 *
 * Application-wide constants extracted from magic numbers and hardcoded
 * strings scattered across the codebase.
 *
 * All values are typed and exported individually so they can be imported
 * by name wherever needed.  Environment-specific overrides are handled via
 * the NEXT_PUBLIC_* env vars in `.env.local`.
 *
 * @module config/app
 */

// ---------------------------------------------------------------------------
// Site metadata
// ---------------------------------------------------------------------------

/** Canonical site display name. */
export const SITE_NAME = "StellarVeriphy";

/** Short tagline shown in the hero section. */
export const SITE_TAGLINE = "The Truth Engine for the Stellar Ecosystem";

/** Default SEO description (kept under 160 characters). */
export const SITE_DESCRIPTION =
  "Decentralized content verification and provenance on the Stellar blockchain — cryptographically verify media authenticity and origin.";

/** Resolved at build-time; falls back to the production domain. */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://stellarveriphy.com";

// ---------------------------------------------------------------------------
// Pagination defaults
// ---------------------------------------------------------------------------

/** Default number of certificates per page. */
export const DEFAULT_PAGE_SIZE = 10;

/** Maximum records returned in a single batch fetch. */
export const MAX_BATCH_FETCH = 10_000;

/** Maximum items allowed in a batch-verification submission. */
export const MAX_BATCH_VERIFICATION_SIZE = 50;

// ---------------------------------------------------------------------------
// Certificate / on-chain constants
// ---------------------------------------------------------------------------

/**
 * Number of seconds before a certificate is considered expired after
 * it is minted.  Default: 1 year.
 */
export const CERTIFICATE_DEFAULT_TTL_SECONDS = 86_400 * 365;

/** Minimum verification code length (alphanumeric). */
export const VERIFICATION_CODE_LENGTH = 8;

/** Character set used when generating verification codes. */
export const VERIFICATION_CODE_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// ---------------------------------------------------------------------------
// Mock / simulated API delays (milliseconds)
// ---------------------------------------------------------------------------

/** Simulated network round-trip for most contract reads. */
export const MOCK_DELAY_MS = 600;

/** Simulated delay for heavier search / filter operations. */
export const MOCK_SEARCH_DELAY_MS = 800;

/** Simulated delay for authenticity-verification (multi-step). */
export const MOCK_VERIFY_DELAY_MS = 1_000;

/** Simulated delay for code generation. */
export const MOCK_CODE_GEN_DELAY_MS = 500;

/** Simulated delay for a simple single-item fetch. */
export const MOCK_FETCH_DELAY_MS = 300;

/** Simulated delay for export operations. */
export const MOCK_EXPORT_DELAY_MS = 500;

/** Simulated delay for transaction-history queries. */
export const MOCK_TX_DELAY_MS = 400;

// ---------------------------------------------------------------------------
// Caching / React Query TTLs
// ---------------------------------------------------------------------------

/** How long (ms) a certificate record is considered fresh before re-fetching. */
export const CACHE_TTL_CERTIFICATE_MS = 5 * 60 * 1_000; // 5 min

/** How long (ms) a certificate search result is considered fresh. */
export const CACHE_TTL_SEARCH_MS = 2 * 60 * 1_000; // 2 min

/** How long (ms) blockchain / network status data is considered fresh. */
export const CACHE_TTL_BLOCKCHAIN_MS = 30 * 1_000; // 30 s

/** How long (ms) transaction-history data stays fresh. */
export const CACHE_TTL_TX_HISTORY_MS = 60 * 1_000; // 1 min

/** How long (ms) stale data is kept in the React Query cache after becoming unused. */
export const CACHE_GC_TIME_MS = 10 * 60 * 1_000; // 10 min

/** Retry attempts for failed React Query fetches. */
export const CACHE_RETRY_COUNT = 3;

/** Base delay (ms) between retry attempts (doubles on each retry). */
export const CACHE_RETRY_DELAY_MS = 1_000;

// ---------------------------------------------------------------------------
// Wallet / Stellar protocol constants
// ---------------------------------------------------------------------------

/** Minimum XLM stake in stroops (1 billion = 100 XLM). */
export const MINIMUM_STAKE_STROOPS = 1_000_000_000;

/** Default transaction fee in stroops. */
export const DEFAULT_TX_FEE_STROOPS = 100;

/** Ledger duration used for time-range displays (seconds per ledger ≈ 5 s). */
export const LEDGER_DURATION_SECONDS = 5;

// ---------------------------------------------------------------------------
// UI / UX constants
// ---------------------------------------------------------------------------

/** Duration (ms) for page-transition / Framer Motion animations. */
export const ANIMATION_DURATION_MS = 800;

/** Stagger delay between child animation variants (seconds). */
export const ANIMATION_STAGGER_S = 0.2;

/** Delay before first child begins animating (seconds). */
export const ANIMATION_DELAY_S = 0.1;

/** Auto-save debounce interval (ms). */
export const AUTO_SAVE_DEBOUNCE_MS = 2_000;

/** Toast notification duration (ms). */
export const TOAST_DURATION_MS = 5_000;

/** Maximum characters displayed in a truncated Stellar address. */
export const ADDRESS_TRUNCATE_HEAD = 4;

/** Tail characters preserved when truncating a Stellar address. */
export const ADDRESS_TRUNCATE_TAIL = 4;

// ---------------------------------------------------------------------------
// Image optimisation
// ---------------------------------------------------------------------------

/** Blur data URL used as placeholder while next/image loads. */
export const IMAGE_BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4=";

/** Allowed external image hostname patterns for next/image. */
export const ALLOWED_IMAGE_DOMAINS: string[] = [
  "ipfs.io",
  "gateway.ipfs.io",
  "dweb.link",
  "cloudflare-ipfs.com",
  "arweave.net",
];

/** Allowed remote image URL patterns (used in next.config.ts remotePatterns). */
export const ALLOWED_IMAGE_URL_PATTERNS = [
  { protocol: "https" as const, hostname: "**.ipfs.io" },
  { protocol: "https" as const, hostname: "dweb.link" },
  { protocol: "https" as const, hostname: "arweave.net" },
  { protocol: "https" as const, hostname: "cloudflare-ipfs.com" },
];
