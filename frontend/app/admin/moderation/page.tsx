import type { Metadata } from "next";
import { ModerationQueue } from "@/components/admin/ModerationQueue";

export const metadata: Metadata = {
  title: "Moderation Queue — StellarVeriphy Admin",
  description:
    "Review disputed assets, flagged provenance records, and suspicious attestations.",
};

export default function AdminModerationPage() {
  return (
    <main id="main-content" className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            Moderation Queue
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review disputed assets, flagged provenance records, and suspicious attestations.
            Every status transition is recorded for auditability.
          </p>
        </div>
        <ModerationQueue />
      </div>
    </main>
  );
}
