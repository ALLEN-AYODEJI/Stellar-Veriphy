/**
 * GET   /api/admin/moderation/[id]  — fetch a single moderation item
 * PATCH /api/admin/moderation/[id]  — update status, assign reviewer, add notes
 */
import type { ApiResponse, ModerationQueueItem } from "@stellarveriphy/shared";
import { NextRequest, NextResponse } from "next/server";
import { logOperationalEvent, requestIdFrom } from "@/lib/server/observability";

function getQueue(): ModerationQueueItem[] {
  if (typeof globalThis !== "undefined" && "moderationQueue" in globalThis) {
    return (globalThis as unknown as Record<string, unknown>)
      .moderationQueue as ModerationQueueItem[];
  }
  return [];
}

function setQueue(queue: ModerationQueueItem[]) {
  if (typeof globalThis !== "undefined") {
    (globalThis as unknown as Record<string, ModerationQueueItem[]>).moderationQueue = queue;
  }
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ModerationQueueItem>>> {
  const { id } = await params;
  const item = getQueue().find((i) => i.id === id);
  if (!item) {
    return NextResponse.json({ success: false, error: "Moderation item not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: item });
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

interface PatchBody {
  status?: ModerationQueueItem["status"];
  assignedTo?: string;
  reviewNotes?: string;
  /** Pass the reviewer address to append to the escalation chain. */
  escalateTo?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ModerationQueueItem>>> {
  const requestId = requestIdFrom(request);
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Malformed JSON." }, { status: 400 });
  }

  const queue = getQueue();
  const idx = queue.findIndex((i) => i.id === id);
  if (idx === -1) {
    return NextResponse.json({ success: false, error: "Moderation item not found." }, { status: 404 });
  }

  const patch = body as PatchBody;
  const item = { ...queue[idx]! };

  if (patch.status) {
    item.status = patch.status;
    if (patch.status === "resolved" || patch.status === "approved" || patch.status === "rejected") {
      item.resolvedAt = new Date().toISOString();
    }
  }

  if (patch.assignedTo !== undefined) item.assignedTo = patch.assignedTo;
  if (patch.reviewNotes !== undefined) item.reviewNotes = patch.reviewNotes;

  if (patch.escalateTo) {
    item.status = "escalated";
    item.escalationChain = [...(item.escalationChain ?? []), patch.escalateTo];
  }

  item.updatedAt = new Date().toISOString();
  queue[idx] = item;
  setQueue(queue);

  logOperationalEvent("info", "moderation_queue.item_updated", {
    requestId,
    itemId: id,
    newStatus: item.status,
  });

  return NextResponse.json({ success: true, data: item });
}
