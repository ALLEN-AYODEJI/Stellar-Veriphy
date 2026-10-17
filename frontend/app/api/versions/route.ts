import {
  paginate,
  parsePaginationParams,
  rejectUnknownFields,
  requireObject,
  sha256Field,
  textField,
  type ApiResponse,
  type ContentVersion,
  type FieldError,
} from "@stellarveriphy/shared";
import { NextRequest, NextResponse } from "next/server";
import { legacyValidationError } from "@/lib/server/http";

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
    const pageParams = parsePaginationParams(searchParams);
    if (!pageParams.ok) return legacyValidationError(pageParams.errors);
    const contentHash = searchParams.get("contentHash");

    const versions = getStoredVersions();
    const filtered = contentHash
      ? versions.filter((v) => v.contentHash === contentHash)
      : versions;

    const page = paginate(filtered, pageParams.value);
    return NextResponse.json({ success: true, data: page.items, pagination: page.pagination });
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
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Malformed JSON." }, { status: 400 });
    }
    const object = requireObject(raw);
    if (!object.ok) return legacyValidationError(object.errors);
    const errors: FieldError[] = [];
    rejectUnknownFields(object.value, ["contentHash", "manifestHash", "changeLog"], errors);
    const contentHash = sha256Field(object.value, "contentHash", { required: true }, errors);
    const manifestHash = sha256Field(object.value, "manifestHash", { required: true }, errors);
    const changeLog = textField(object.value, "changeLog", { maxLength: 2000 }, errors);
    if (errors.length > 0 || !contentHash || !manifestHash) return legacyValidationError(errors);
    const body = { contentHash, manifestHash, changeLog };
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
