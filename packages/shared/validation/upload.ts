import type { UploadMetadata } from "../types";
import { checkSha256Hex, normalizeHash } from "./hash";
import { validateManifest } from "./manifest";
import { FieldError, ValidationResult, isPlainObject } from "./result";
import { checkStellarPublicKey } from "./stellar";

// MIME type -> accepted file extensions.
export const SUPPORTED_MEDIA_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/ogg": [".ogg"],
  "application/pdf": [".pdf"],
};

export const UPLOAD_LIMITS = {
  maxFileSizeBytes: 500 * 1024 * 1024,
  fileNameMaxLength: 255,
  titleMaxLength: 120,
  descriptionMaxLength: 2000,
  maxTags: 20,
  tagMaxLength: 40,
};

const UPLOAD_FIELDS = ["fileName", "mimeType", "fileSize", "contentHash", "creator", "title", "description", "tags", "manifest"];

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

function optionalText(
  input: Record<string, unknown>,
  field: string,
  maxLength: number,
  errors: FieldError[],
): string | undefined {
  const value = input[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    errors.push({ field, message: "Must be text." });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors.push({ field, message: `Must be at most ${maxLength} characters.` });
    return undefined;
  }
  return trimmed || undefined;
}

// Validates upload metadata and returns it in the normalized form that is stored.
export function validateUploadMetadata(input: unknown, options: { now?: Date } = {}): ValidationResult<UploadMetadata> {
  if (!isPlainObject(input)) {
    return { ok: false, errors: [{ field: "body", message: "Upload metadata must be a JSON object." }] };
  }
  const errors: FieldError[] = [];

  for (const key of Object.keys(input)) {
    if (!UPLOAD_FIELDS.includes(key)) {
      errors.push({ field: key, message: `Unknown field "${key}".`, hint: `Allowed fields: ${UPLOAD_FIELDS.join(", ")}.` });
    }
  }

  // mimeType
  let mimeType = "";
  if (typeof input.mimeType !== "string" || input.mimeType.trim() === "") {
    errors.push({ field: "mimeType", message: "MIME type is required." });
  } else {
    mimeType = input.mimeType.split(";")[0].trim().toLowerCase();
    if (!SUPPORTED_MEDIA_TYPES[mimeType]) {
      errors.push({
        field: "mimeType",
        message: `Files of type "${mimeType}" are not supported.`,
        hint: `Supported types: ${Object.keys(SUPPORTED_MEDIA_TYPES).join(", ")}.`,
      });
    }
  }

  // fileName (checked against mimeType)
  let fileName = "";
  if (typeof input.fileName !== "string" || input.fileName.trim() === "") {
    errors.push({ field: "fileName", message: "File name is required." });
  } else {
    fileName = input.fileName.trim();
    const extensions = SUPPORTED_MEDIA_TYPES[mimeType];
    if (fileName.length > UPLOAD_LIMITS.fileNameMaxLength) {
      errors.push({ field: "fileName", message: `Must be at most ${UPLOAD_LIMITS.fileNameMaxLength} characters.` });
    } else if (/[\\/\u0000-\u001f]/.test(fileName)) {
      errors.push({ field: "fileName", message: "File name must not contain path separators or control characters." });
    } else if (extensions && !extensions.includes(extensionOf(fileName))) {
      errors.push({
        field: "fileName",
        message: `The file extension does not match its type (${mimeType}).`,
        hint: `Expected ${extensions.join(" or ")}. Renamed files can indicate the wrong file was selected.`,
      });
    }
  }

  // fileSize
  const fileSize = input.fileSize;
  if (typeof fileSize !== "number" || !Number.isInteger(fileSize)) {
    errors.push({ field: "fileSize", message: "File size must be a whole number of bytes." });
  } else if (fileSize <= 0) {
    errors.push({ field: "fileSize", message: "File is empty.", hint: "Choose a file that has content." });
  } else if (fileSize > UPLOAD_LIMITS.maxFileSizeBytes) {
    errors.push({ field: "fileSize", message: `File is larger than the ${UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024)} MB limit.` });
  }

  // contentHash
  let contentHash = "";
  if (typeof input.contentHash !== "string") {
    errors.push({ field: "contentHash", message: "Content hash is required." });
  } else {
    contentHash = normalizeHash(input.contentHash);
    const problem = checkSha256Hex(contentHash);
    if (problem) errors.push({ field: "contentHash", ...problem });
  }

  // creator
  let creator = "";
  if (typeof input.creator !== "string" || input.creator.trim() === "") {
    errors.push({ field: "creator", message: "Creator public key is required." });
  } else {
    creator = input.creator.trim().toUpperCase();
    const problem = checkStellarPublicKey(creator);
    if (problem) errors.push({ field: "creator", ...problem });
  }

  const title = optionalText(input, "title", UPLOAD_LIMITS.titleMaxLength, errors);
  const description = optionalText(input, "description", UPLOAD_LIMITS.descriptionMaxLength, errors);

  // tags: trimmed, lowercased, de-duplicated
  let tags: string[] = [];
  if (input.tags !== undefined && input.tags !== null) {
    if (!Array.isArray(input.tags) || input.tags.some((t) => typeof t !== "string")) {
      errors.push({ field: "tags", message: "Tags must be a list of text values." });
    } else {
      tags = [...new Set((input.tags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean))];
      if (tags.length > UPLOAD_LIMITS.maxTags) {
        errors.push({ field: "tags", message: `At most ${UPLOAD_LIMITS.maxTags} tags are allowed.` });
      } else if (tags.some((t) => t.length > UPLOAD_LIMITS.tagMaxLength)) {
        errors.push({ field: "tags", message: `Each tag must be at most ${UPLOAD_LIMITS.tagMaxLength} characters.` });
      }
    }
  }

  // manifest, plus cross-field consistency with the upload itself
  const manifestResult = validateManifest(input.manifest, { now: options.now, path: "manifest" });
  if (!manifestResult.ok) {
    errors.push(...manifestResult.errors);
  } else {
    const manifest = manifestResult.value;
    if (contentHash && manifest.contentHash !== contentHash) {
      errors.push({
        field: "manifest.contentHash",
        message: "The manifest content hash does not match the file hash.",
        hint: "The manifest must describe the file being uploaded. Re-select the file to regenerate it.",
      });
    }
    if (creator && manifest.creator !== creator) {
      errors.push({
        field: "manifest.creator",
        message: "The manifest creator does not match the uploader.",
        hint: "Use the same Stellar public key for the upload and the manifest.",
      });
    }
  }

  if (errors.length > 0 || !manifestResult.ok) return { ok: false, errors };

  const value: UploadMetadata = {
    fileName,
    mimeType,
    fileSize: fileSize as number,
    contentHash,
    creator,
    tags,
    manifest: manifestResult.value,
  };
  if (title) value.title = title;
  if (description) value.description = description;
  return { ok: true, value };
}
