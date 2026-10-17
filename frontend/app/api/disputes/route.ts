/**
 * GET  /api/disputes               — list disputes (filter by certificateId, status)
 * POST /api/disputes               — raise a new content dispute
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@stellarveriphy/shared/types";
import type {
  DisputeAuditEntry,
  DisputeRecord,
  RaiseDisputeRequest,
} from "@/types/dispute";

// ---------------------------------------------------------------------------
// In-memory store (replace with DB in production)
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __disputeStore: DisputeRecord[] | undefined;
  // eslint-disable-next-line no-var
  var __disputeAuditStore: DisputeAuditEntry[] | undefined;
}

function getStore(): DisputeRecord[] {
  if (!globalThis.__disputeStore) globalThis.__disputeStore = [];
  return globalThis.__disputeStore;
}

export function getAuditStore(): DisputeAuditEntry[] {
  if (!globalThis.__disputeAuditStore) globalThis.__disputeAuditStore = [];
  return globalThis.__disputeAuditStore;
}

export function appendAuditEntry(entry: DisputeAuditEntry): void {
  getAuditStore().push(entry);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<DisputeRecord[]>>> {
  const { searchParams } = new URL(request.url);
  const certificateId = searchParams.get("certificateId");
  const status = searchParams.get("status");

  let items = getStore();
  if (certificateId) items = items.filter((d) => d.certificateId === certificateId);
  if (status) items = items.filter((d) => d.status === status);

  // Newest first
  items = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({ success: true, data: items });
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<DisputeRecord>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Malformed JSON." }, { status: 400 });
  }

  const b = body as RaiseDisputeRequest;

  // Validate required fields
  if (!b.certificateId?.trim()) {
    return NextResponse.json(
      { success: false, error: "certificateId is required." },
      { status: 400 },
    );
  }
  if (!b.contentHash?.trim()) {
    return NextResponse.json(
      { success: false, error: "contentHash is required." },
      { status: 400 },
    );
  }
  if (!b.trigger) {
    return NextResponse.json(
      { success: false, error: "trigger is required." },
      { status: 400 },
    );
  }
  if (!b.summary?.trim() || b.summary.trim().length < 20) {
    return NextResponse.json(
      { success: false, error: "summary must be at least 20 characters." },
      { status: 400 },
    );
  }
  if (b.summary.trim().length > 1000) {
    return NextResponse.json(
      { success: false, error: "summary must be 1000 characters or fewer." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const disputeId = makeId("dsp");

  // Tag each evidence item with metadata
  const evidence = (b.evidence ?? []).map((ev) => ({
    ...ev,
    id: makeId("ev"),
    attachedAt: now,
    attachedBy: b.reportedBy,
  }));

  const record: DisputeRecord = {
    id: disputeId,
    certificateId: b.certificateId.trim(),
    contentHash: b.contentHash.trim(),
    status: "open",
    trigger: b.trigger,
    summary: b.summary.trim(),
    reportedBy: b.reportedBy?.trim() || undefined,
    evidence,
    createdAt: now,
    updatedAt: now,
    escalationChain: [],
  };

  getStore().push(record);

  // Seed the audit trail with the "raised" entry
  const auditEntry: DisputeAuditEntry = {
    id: makeId("aud"),
    disputeId,
    action: "raised",
    actor: b.reportedBy?.trim() || "anonymous",
    timestamp: now,
    description: `Dispute raised with trigger "${b.trigger.replace(/_/g, " ")}". ${evidence.length > 0 ? `${evidence.length} evidence item(s) attached.` : "No initial evidence."}`,
  };
  appendAuditEntry(auditEntry);

  return NextResponse.json({ success: true, data: record }, { status: 201 });
}
