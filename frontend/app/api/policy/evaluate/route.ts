/**
 * POST /api/policy/evaluate
 *
 * Evaluate a compliance policy for an asset being uploaded or certified.
 *
 * Accepts a `PolicyContext` and returns a `PolicyDecision` that describes:
 *   - Whether the upload is `allowed`.
 *   - The aggregate `complianceStatus` (compliant / restricted / blocked).
 *   - Any `violations` and `requiredDisclosures`.
 *
 * The caller must display required disclosures to the creator before
 * proceeding.  Blocked assets must not be uploaded or certified.
 */
import { isPlainObject } from "@stellarveriphy/shared";
import { respond, readJson, serverError } from "@/lib/server/http";
import { logOperationalEvent, requestIdFrom } from "@/lib/server/observability";
import {
  evaluatePolicy,
  defaultRuleSet,
  type PolicyContext,
  type AssetClass,
  type CreatorSegment,
} from "@stellarveriphy/shared/policy";
import type { AiGenerationType } from "@stellarveriphy/shared/ai-labeling";

const VALID_ASSET_CLASSES: AssetClass[] = [
  "news_media",
  "legal_document",
  "ai_generated_artwork",
  "scientific_data",
  "supply_chain_evidence",
  "nft_asset",
  "other",
];

const VALID_CREATOR_SEGMENTS: CreatorSegment[] = [
  "individual",
  "journalist",
  "enterprise",
  "government",
  "platform_partner",
];

export async function POST(req: Request) {
  const requestId = requestIdFrom(req);
  const parsed = await readJson(req);
  if ("response" in parsed) return parsed.response;

  const body = parsed.body;
  if (!isPlainObject(body)) {
    return respond(422, { status: "validation_error", errors: [{ field: "body", message: "Expected a JSON object." }] });
  }

  // Validate required fields
  const errors: { field: string; message: string }[] = [];

  const assetClass = body.assetClass as AssetClass;
  if (!VALID_ASSET_CLASSES.includes(assetClass)) {
    errors.push({ field: "assetClass", message: `Must be one of: ${VALID_ASSET_CLASSES.join(", ")}.` });
  }

  const creatorSegment = body.creatorSegment as CreatorSegment;
  if (!VALID_CREATOR_SEGMENTS.includes(creatorSegment)) {
    errors.push({ field: "creatorSegment", message: `Must be one of: ${VALID_CREATOR_SEGMENTS.join(", ")}.` });
  }

  const jurisdiction = body.jurisdiction;
  if (typeof jurisdiction !== "string" || jurisdiction.trim() === "") {
    errors.push({ field: "jurisdiction", message: "jurisdiction is required (e.g. 'EU', 'US', 'GLOBAL')." });
  }

  if (errors.length > 0) {
    return respond(422, { status: "validation_error", errors });
  }

  const context: PolicyContext = {
    assetClass,
    creatorSegment,
    jurisdiction: (jurisdiction as string).trim().toUpperCase(),
    aiLabel: typeof body.aiLabel === "string" ? (body.aiLabel as AiGenerationType) : undefined,
    mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
    fileSize: typeof body.fileSize === "number" ? body.fileSize : undefined,
  };

  try {
    const decision = evaluatePolicy(defaultRuleSet, context);

    logOperationalEvent(
      decision.allowed ? "info" : "warn",
      "policy.evaluated",
      {
        requestId,
        route: "POST /api/policy/evaluate",
        operation: "evaluate_policy",
        details: {
          assetClass: context.assetClass,
          creatorSegment: context.creatorSegment,
          jurisdiction: context.jurisdiction,
          complianceStatus: decision.complianceStatus,
          allowed: decision.allowed,
          violationCount: decision.violations.length,
        },
      },
    );

    return respond(200, { status: "ok", data: decision });
  } catch (err) {
    return serverError("POST /api/policy/evaluate", err);
  }
}
