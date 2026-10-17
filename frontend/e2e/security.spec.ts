/**
 * security.spec.ts
 *
 * Automated security test suite — OWASP Top 10 coverage via Playwright.
 *
 * A01 – Broken Access Control
 * A02 – Cryptographic / Header Failures
 * A03 – Injection (XSS, SQLi payloads in UI inputs)
 * A05 – Security Misconfiguration (CSP, X-Frame-Options, …)
 * A07 – Authentication Failures (unauthenticated access probing)
 * A09 – Logging / Monitoring (no stack traces in responses)
 *
 * Run:  pnpm test:e2e -- e2e/security.spec.ts --project=chromium
 * Report is written to playwright-report/index.html
 */

import { expect, test } from "@playwright/test";

import {
  auditSecurityHeaders,
  ERROR_PROBE_PATHS,
  PROTECTED_PATHS,
  SQLI_PAYLOADS,
  XSS_PAYLOADS,
} from "../lib/security/securityAudit";

// ---------------------------------------------------------------------------
// A05 – Security Misconfiguration: HTTP security headers
// ---------------------------------------------------------------------------

test.describe("A05 – Security headers", () => {
  test("home page response includes required security headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    const results = auditSecurityHeaders(headers);

    const failures = results.filter((r) => !r.pass);
    if (failures.length > 0) {
      const msg = failures.map((f) => `${f.header}: ${f.note} (got: ${f.value})`).join("\n");
      expect.soft(failures.length, `Missing/invalid headers:\n${msg}`).toBe(0);
    }
  });

  test("API health endpoint includes security headers", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });
});

// ---------------------------------------------------------------------------
// A01 – Broken Access Control: protected routes
// ---------------------------------------------------------------------------

test.describe("A01 – Access control", () => {
  for (const path of PROTECTED_PATHS) {
    test(`unauthenticated request to ${path} is rejected`, async ({ request }) => {
      const response = await request.get(path);
      // Must not return 200 for protected resources without auth
      expect([401, 403, 404, 405]).toContain(response.status());
    });
  }
});

// ---------------------------------------------------------------------------
// A09 – Logging / Monitoring: no stack traces exposed
// ---------------------------------------------------------------------------

test.describe("A09 – No internal errors exposed", () => {
  for (const path of ERROR_PROBE_PATHS) {
    test(`${path} does not leak stack traces`, async ({ request }) => {
      const response = await request.get(path);
      const body = await response.text();
      expect(body).not.toMatch(/at\s+\w+\s+\(.*\.js:\d+:\d+\)/); // JS stack frame
      expect(body).not.toMatch(/Error:\s+Cannot/i);
      expect(body).not.toMatch(/ENOENT|ECONNREFUSED/);
    });
  }
});

// ---------------------------------------------------------------------------
// A03 – Injection: XSS payloads in UI inputs
// ---------------------------------------------------------------------------

test.describe("A03 – XSS injection via UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/verify");
  });

  for (const payload of XSS_PAYLOADS) {
    test(`XSS payload is not executed: ${payload.slice(0, 30)}`, async ({ page }) => {
      let alertFired = false;
      page.on("dialog", async (dialog) => {
        alertFired = true;
        await dialog.dismiss();
      });

      const input = page.getByRole("textbox").first();
      if (!(await input.isVisible())) return;

      await input.fill(payload);
      await input.press("Tab"); // trigger validation / blur

      expect(alertFired).toBe(false);

      // Payload must not appear unescaped in the DOM
      const innerHTML = await page.evaluate(() => document.body.innerHTML);
      expect(innerHTML).not.toContain("<script>alert");
      expect(innerHTML).not.toContain("onerror=alert");
    });
  }
});

// ---------------------------------------------------------------------------
// A03 – Injection: SQLi-like payloads via API
// ---------------------------------------------------------------------------

test.describe("A03 – SQLi payloads via API", () => {
  for (const payload of SQLI_PAYLOADS) {
    test(`API rejects SQLi payload: ${payload.slice(0, 30)}`, async ({ request }) => {
      const response = await request.post("/api/verification", {
        data: {
          address: payload,
          contentHash: payload,
          fileName: payload,
          fileType: "image/jpeg",
          fileSizeBytes: 1024,
          manifest: {},
        },
      });
      // Must return a 4xx error, never 200 with injected data
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  }
});

// ---------------------------------------------------------------------------
// A07 – Authentication: auth endpoint probing
// ---------------------------------------------------------------------------

test.describe("A07 – Authentication", () => {
  test("verification API rejects request with missing required fields", async ({ request }) => {
    const response = await request.post("/api/verification", { data: {} });
    expect([400, 401, 422]).toContain(response.status());
  });

  test("verification API rejects malformed Stellar address", async ({ request }) => {
    const response = await request.post("/api/verification", {
      data: {
        address: "NOT_A_STELLAR_KEY",
        contentHash: "a".repeat(64),
        fileName: "test.jpg",
        fileType: "image/jpeg",
        fileSizeBytes: 1024,
        manifest: { contentHash: "a".repeat(64), creator: "G" + "A".repeat(55), timestamp: new Date().toISOString() },
      },
    });
    expect(response.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Dependency vulnerability scan reminder (documented, not automated here)
// ---------------------------------------------------------------------------
// Run `pnpm audit` in CI to catch known CVEs in npm dependencies.
// Soroban contract deps: `cargo audit` in contracts/*/
// See .github/workflows/ci.yml for integration.
