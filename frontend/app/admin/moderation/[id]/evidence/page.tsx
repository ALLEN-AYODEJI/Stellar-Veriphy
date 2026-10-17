import type { Metadata } from "next";
import Link from "next/link";

import { DisputeEvidencePackageView } from "@/components/admin/DisputeEvidencePackageView";

export const metadata: Metadata = {
  title: "Dispute Evidence — StellarVeriphy Admin",
  description: "Review the packaged files, manifests, hashes and comments attached to a dispute.",
};

export default async function DisputeEvidencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main id="main-content" className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href="/admin/moderation" className="text-sm text-blue-600 hover:underline">
            ← Back to moderation queue
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">Dispute evidence package</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All evidence attached to this dispute, grouped and integrity-checked. Viewing and adding evidence is
            recorded in the audit log.
          </p>
        </div>
        <DisputeEvidencePackageView disputeId={id} />
      </div>
    </main>
  );
}
