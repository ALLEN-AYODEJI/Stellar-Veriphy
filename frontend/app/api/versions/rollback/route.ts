/**
 * POST /api/versions/rollback
 *
 * Rolls an asset back to a previous version and persists an immutable
 * RollbackMetadata record for auditability (#658).
 */
import type { ApiResponse, ContentVersion, RollbackMetadata } from "@stellarveriphy/shared";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// In-memory stores (replaced by a real DB in production)
// ---------------------------------------------------------------------------

function getStoredVersions(): ContentVersion[] {
  if (typeof globalThis !== "undefined" && "versions" in globalThis) {
    return (globalThis as unknown as Record<string, unknown>).versions as ContentVersion[];
  }
  return [];
}

function setStoredVersions(versions: ContentVersion[]) {
  if (typeof globalThis !== "undefined") {
    (globalThis as unknown as Record<string, ContentVersion[]>).versions = versions;
  }
}

function getRollbackHistory(): RollbackMetadata[] {
  if (typeof globalThis !== "undefined" && "rollbackHistory" in globalThis) {
    return (globalThis as unknown as Record<string, unknown>).rollbackHistory as RollbackMetadata[];
  }
  return [];
}

function appendRollbackRecord(record: RollbackMetadata) {
  const history = getRollbackHistory();
  history.push(record);
  if (typeof globalThis !== "undefined") {
    (globalThis as unknown as Record<string, RollbackMetadata[]>).rollbackHistory = history;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

interface RollbackRequestBody {
  contentHash: string;
  versionId: string;
  initiatedBy?: string;
  reason?: string;
  notes?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ version: ContentVersion; rollback: RollbackMetadata }>>> {
  try {
    const body = (await request.json()) as RollbackRequestBody;

    if (!body.contentHash || !body.versionId) {
      return NextResponse.json(
        { success: false, error: "contentHash and versionId are required." },
        { status: 400 },
      );
    }

    const versions = getStoredVersions();

    const targetVersion = versions.find((v) => v.id === body.versionId);
    if (!targetVersion) {
      return NextResponse.json({ success: false, error: "Version not found." }, { status: 404 });
    }

    const currentVersion = versions.find(
      (v) => v.contentHash === body.contentHash && v.isCurrentVersion,
    );

    if (currentVersion?.id === body.versionId) {
      return NextResponse.json(
        { success: false, error: "Target version is already the current version." },
        { status: 409 },
      );
    }

    // Demote the active version
    if (currentVersion) {
      currentVersion.isCurrentVersion = false;
    }

    // Create a new version entry representing the restored state
    const newVersion: ContentVersion = {
      id: `version_${Date.now()}`,
      versionNumber: Math.max(...versions.map((v) => v.versionNumber)) + 1,
      contentHash: body.contentHash,
      manifestHash: targetVersion.manifestHash,
      creator: body.initiatedBy ?? "unknown",
      createdAt: Date.now(),
      changeLog: `Rolled back to version ${targetVersion.versionNumber} (${targetVersion.id})`,
      previousVersionId: currentVersion?.id,
      isCurrentVersion: true,
    };

    versions.push(newVersion);
    setStoredVersions(versions);

    // Persist an immutable rollback record for auditability
    const rollbackRecord: RollbackMetadata = {
      id: `rollback_${Date.now()}`,
      contentHash: body.contentHash,
      fromVersionId: currentVersion?.id ?? "unknown",
      fromVersionNumber: currentVersion?.versionNumber ?? 0,
      toVersionId: targetVersion.id,
      toVersionNumber: targetVersion.versionNumber,
      initiatedBy: body.initiatedBy ?? "unknown",
      initiatedAt: new Date().toISOString(),
      reason: (body.reason as RollbackMetadata["reason"]) ?? "other",
      notes: body.notes,
      targetManifestHash: targetVersion.manifestHash,
    };

    appendRollbackRecord(rollbackRecord);

    return NextResponse.json({
      success: true,
      data: { version: newVersion, rollback: rollbackRecord },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to perform rollback." },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/versions/rollback?contentHash=<hash>
// Returns the rollback history for an asset.
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<RollbackMetadata[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const contentHash = searchParams.get("contentHash");

    const history = getRollbackHistory();
    const filtered = contentHash
      ? history.filter((r) => r.contentHash === contentHash)
      : history;

    return NextResponse.json({ success: true, data: filtered });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch rollback history." },
      { status: 500 },
    );
  }
}
