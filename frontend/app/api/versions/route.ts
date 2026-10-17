import type { ApiResponse, ContentVersion } from "@stellarveriphy/shared";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ContentVersion[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const contentHash = searchParams.get("contentHash");

    const versions = getStoredVersions();
    const filtered = contentHash
      ? versions.filter((v) => v.contentHash === contentHash)
      : versions;

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch versions" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ContentVersion>>> {
  try {
    const body = await request.json() as {
      contentHash: string;
      manifestHash: string;
      changeLog?: string;
    };
    const versions = getStoredVersions();

    const contentVersions = versions.filter((v) => v.contentHash === body.contentHash);
    const versionNumber = contentVersions.length + 1;

    if (contentVersions.length > 0) {
      const lastVersion = contentVersions[contentVersions.length - 1];
      lastVersion.isCurrentVersion = false;
      lastVersion.nextVersionId = `version_${Date.now()}`;
    }

    const newVersion: ContentVersion = {
      id: `version_${Date.now()}`,
      versionNumber,
      contentHash: body.contentHash,
      manifestHash: body.manifestHash,
      creator: "user_placeholder",
      createdAt: Date.now(),
      changeLog: body.changeLog,
      previousVersionId: contentVersions.length > 0 ? contentVersions[contentVersions.length - 1].id : undefined,
      isCurrentVersion: true,
    };

    versions.push(newVersion);
    setStoredVersions(versions);

    return NextResponse.json({ success: true, data: newVersion }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create version" },
      { status: 500 },
    );
  }
}
