import { checkSha256Hex, normalizeHash, validateUploadMetadata, type UploadRecord } from "@stellarveriphy/shared";
import { readJson, respond, serverError } from "@/lib/server/http";
import { logOperationalEvent, requestIdFrom } from "@/lib/server/observability";
import { findUploadsByHash, saveUpload } from "@/lib/server/uploads";

// POST /api/uploads: validate and store upload metadata (docs/api/upload-metadata.md).
export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  const parsed = await readJson(req);
  if ("response" in parsed) {
    logOperationalEvent("warn", "upload.rejected", {
      requestId,
      route: "POST /api/uploads",
      operation: "parse_upload_metadata",
      status: parsed.response.status,
      reason: "invalid_request_body",
    });
    return parsed.response;
  }

  const result = validateUploadMetadata(parsed.body);
  if (!result.ok) {
    logOperationalEvent("warn", "upload.rejected", {
      requestId,
      route: "POST /api/uploads",
      operation: "validate_upload_metadata",
      status: 422,
      reason: "validation_error",
      details: {
        fields: result.errors.map((error) => error.field),
        errorCount: result.errors.length,
      },
    });
    return respond(422, {
      status: "validation_error",
      message: "Upload metadata is invalid. See `errors` for details.",
      errors: result.errors,
    });
  }

  try {
    const { record, created } = await saveUpload(result.value);
    logOperationalEvent("info", created ? "upload.created" : "upload.duplicate", {
      requestId,
      route: "POST /api/uploads",
      operation: "save_upload_metadata",
      status: created ? 201 : 200,
      actor: record.creator,
      uploadId: record.id,
      contentHash: record.contentHash,
      manifestHash: record.manifestHash,
    });
    return respond<UploadRecord>(created ? 201 : 200, {
      status: created ? "created" : "exists",
      message: created ? undefined : "This file was already registered by this creator.",
      data: record,
    });
  } catch (err) {
    logOperationalEvent("error", "upload.failed", {
      requestId,
      route: "POST /api/uploads",
      operation: "save_upload_metadata",
      status: 500,
      actor: result.value.creator,
      contentHash: result.value.contentHash,
      error: err,
    });
    return serverError("POST /api/uploads", err);
  }
}

// GET /api/uploads?contentHash=<sha256>: look up stored records for a file hash.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("contentHash");
  if (!raw) {
    return respond(422, {
      status: "validation_error",
      errors: [{ field: "contentHash", message: "The contentHash query parameter is required." }],
    });
  }
  const contentHash = normalizeHash(raw);
  const problem = checkSha256Hex(contentHash);
  if (problem) {
    return respond(422, { status: "validation_error", errors: [{ field: "contentHash", ...problem }] });
  }

  try {
    return respond<UploadRecord[]>(200, { status: "ok", data: await findUploadsByHash(contentHash) });
  } catch (err) {
    return serverError("GET /api/uploads", err);
  }
}
