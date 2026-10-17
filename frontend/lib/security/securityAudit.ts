/**
 * securityAudit.ts
 *
 * Lightweight security audit helpers used by the Playwright security test suite.
 * Covers OWASP Top 10 checks that can be exercised via a running Next.js app:
 *   A01 – Broken Access Control (protected route exposure)
 *   A02 – Cryptographic Failures (HTTPS / HSTS headers)
 *   A03 – Injection (XSS / SQL-like payloads in inputs)
 *   A05 – Security Misconfiguration (CSP, X-Frame-Options, etc.)
 *   A07 – Identification & Authentication Failures (auth endpoint probing)
 */

export interface HeaderAuditResult {
  header: string;
  present: boolean;
  value: string | null;
  pass: boolean;
  note: string;
}

/** Required security response headers and their validation rules. */
const REQUIRED_HEADERS: Array<{
  header: string;
  validate: (value: string | null) => boolean;
  note: string;
}> = [
  {
    header: "content-security-policy",
    validate: (v) => v !== null && v.length > 0,
    note: "CSP must be present",
  },
  {
    header: "x-frame-options",
    validate: (v) => v !== null && /^(DENY|SAMEORIGIN)$/i.test(v),
    note: "Must be DENY or SAMEORIGIN",
  },
  {
    header: "x-content-type-options",
    validate: (v) => v?.toLowerCase() === "nosniff",
    note: "Must be nosniff",
  },
  {
    header: "referrer-policy",
    validate: (v) => v !== null,
    note: "Referrer-Policy must be set",
  },
  {
    header: "permissions-policy",
    validate: (v) => v !== null,
    note: "Permissions-Policy must be set",
  },
];

export function auditSecurityHeaders(
  headers: Record<string, string>
): HeaderAuditResult[] {
  return REQUIRED_HEADERS.map(({ header, validate, note }) => {
    const value = headers[header] ?? null;
    const present = value !== null;
    const pass = validate(value);
    return { header, present, value, pass, note };
  });
}

/** XSS probe payloads — none should be reflected unescaped. */
export const XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  '"><img src=x onerror=alert(1)>',
  "javascript:alert(1)",
  "<svg onload=alert(1)>",
];

/** SQL-injection-like payloads for input fields. */
export const SQLI_PAYLOADS = ["' OR '1'='1", "1; DROP TABLE users--", "\" OR \"\"=\""];

/** Paths that should return 401/403 without authentication. */
export const PROTECTED_PATHS = ["/api/verification", "/tools/api-keys", "/tools/audit-logs"];

/** Paths that must never expose stack traces or internal errors publicly. */
export const ERROR_PROBE_PATHS = [
  "/api/health?__test=1",
  "/api/verification",          // POST-only; GET should 405 or 404, not 500
];
