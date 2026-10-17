import type { Metadata } from "next";

import { ApiTokenManager } from "@/components/admin/ApiTokenManager";

export const metadata: Metadata = {
  title: "API Tokens — StellarVeriphy Admin",
  description: "Issue, rotate, and revoke API tokens segmented by product surface.",
};

export default function AdminApiTokensPage() {
  return (
    <main id="main-content" className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">API Tokens</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Every token is bound to one product surface, carries only that surface&apos;s allowed scopes, and expires.
            Rotation keeps the previous secret valid for a grace window so integrations can roll over without
            downtime. See <code>docs/security/api-token-lifecycle.md</code> for the compromise runbook.
          </p>
        </div>
        <ApiTokenManager />
      </div>
    </main>
  );
}
