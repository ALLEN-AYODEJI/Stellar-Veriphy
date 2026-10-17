# Mobile Issues Log

Track known mobile-specific issues discovered during automated and manual testing.

## Format

| ID | Device / Browser | Breakpoint | Description | Status | Workaround |
|----|-----------------|------------|-------------|--------|------------|
| MOB-001 | _template_ | _e.g. xs_ | _description_ | Open / Fixed / Won't Fix | _if any_ |

## Active Issues

_No issues logged yet. Add rows as they are discovered during test runs._

## How to Report a New Issue

1. Run the mobile suite: `pnpm test:e2e -- e2e/mobile.spec.ts`
2. Identify the failing test and device/breakpoint.
3. Add a row to the table above with a unique `MOB-NNN` ID.
4. Open a GitHub issue referencing the `MOB-NNN` ID.

## BrowserStack Session Links

Paste BrowserStack session URLs here after real-device runs for traceability.

| Date | Session URL | Project | Notes |
|------|-------------|---------|-------|
| _YYYY-MM-DD_ | _https://automate.browserstack.com/builds/…_ | StellarVeriphy | _initial run_ |
