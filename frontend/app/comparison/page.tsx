"use client";

// #437 — lazy-load the heavy comparison tool (lucide-react + diff logic)
import { LazyCertificateComparisonTool } from "@/components/lazy";

export default function ComparisonPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <LazyCertificateComparisonTool />
    </div>
  );
}
