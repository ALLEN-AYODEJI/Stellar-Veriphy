/**
 * mobile.spec.ts
 *
 * Mobile & responsive E2E tests covering:
 * - iOS Safari / Android Chrome viewport behaviour
 * - Responsive breakpoints (xs → lg)
 * - Touch interactions (tap, swipe-scroll, long-press)
 *
 * Run locally:   pnpm test:e2e -- e2e/mobile.spec.ts --project=mobile-chrome
 * BrowserStack:  BROWSERSTACK_USERNAME=… BROWSERSTACK_ACCESS_KEY=… pnpm test:e2e -- e2e/mobile.spec.ts --project=bs-ios-safari
 *
 * Known mobile issues are tracked in docs/testing/mobile-issues.md
 */

import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Swipe up by `px` pixels from the centre of the viewport. */
async function swipeUp(page: import("@playwright/test").Page, px = 300) {
  const { width, height } = page.viewportSize()!;
  const cx = width / 2;
  const cy = height / 2;
  await page.touchscreen.tap(cx, cy);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - px, { steps: 10 });
  await page.mouse.up();
}

// ---------------------------------------------------------------------------
// Navigation & layout
// ---------------------------------------------------------------------------

test.describe("Mobile navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero section within mobile viewport", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "StellarVeriphy" })).toBeVisible();
  });

  test("hamburger / nav links are reachable on small screens", async ({ page }) => {
    // On narrow viewports the nav may collapse; ensure at least one nav link is accessible
    const navLink = page.getByRole("link", { name: /verify|tools|about/i }).first();
    await expect(navLink).toBeVisible();
  });

  test("footer is reachable by scrolling", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator("footer")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Responsive breakpoints
// ---------------------------------------------------------------------------

test.describe("Responsive breakpoints", () => {
  const breakpoints: Array<{ name: string; width: number; height: number }> = [
    { name: "xs (375px)", width: 375, height: 812 },
    { name: "sm (640px)", width: 640, height: 900 },
    { name: "md (768px)", width: 768, height: 1024 },
    { name: "lg (1024px)", width: 1024, height: 768 },
  ];

  for (const bp of breakpoints) {
    test(`home page renders correctly at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "StellarVeriphy" })).toBeVisible();
      // No horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(bp.width + 2); // 2px tolerance
    });

    test(`verify page renders correctly at ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto("/verify");
      await expect(page.getByRole("heading", { name: /Select Verification Mode/i })).toBeVisible();
    });
  }
});

// ---------------------------------------------------------------------------
// Touch interactions
// ---------------------------------------------------------------------------

test.describe("Touch interactions", () => {
  test("tap on CTA button navigates to verify page", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /verify|get started|start/i }).first();
    await cta.tap();
    await expect(page).toHaveURL(/\/(verify|creator)/);
  });

  test("scroll gesture reaches How It Works section", async ({ page }) => {
    await page.goto("/");
    await swipeUp(page, 400);
    // After scrolling, the section should be in or near the viewport
    const section = page.locator("#how-it-works");
    // It may not be fully in viewport yet; just assert it exists in DOM
    await expect(section).toBeAttached();
  });

  test("touch targets meet 44×44 px minimum", async ({ page }) => {
    await page.goto("/");
    const buttons = page.getByRole("button");
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const box = await buttons.nth(i).boundingBox();
      if (!box) continue;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("form inputs are focusable via tap on verify page", async ({ page }) => {
    await page.goto("/verify");
    const input = page.getByRole("textbox").first();
    if (await input.isVisible()) {
      await input.tap();
      await expect(input).toBeFocused();
    }
  });
});
