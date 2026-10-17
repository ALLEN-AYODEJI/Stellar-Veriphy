/**
 * POST /api/certificates/regenerate
 *
 * Handles provenance certificate regeneration requests (#653).
 *
 * The original certificate is preserved on-chain for auditability.
 * A new certificate is minted that references the predecessor via
 * `predecessorId`, forming an auditable lineage chain.
 *
 * Request body: RegenerationRequest (see certificateRegenerationService.ts)
 * Response: RegenerationResult
 */

import { NextRequest, NextResponse } from "next/server";

import type { RegenerationRequest, RegenerationResult } from "@/services/certificateRegenerationService";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

function isValidStellarKey(key: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(key);
}

function isValidHex64(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

const VALID_REASONS = new Set([
  "metadata_updated",
  "storage_ref_changed",
  "attestation_refresh",
  "creator_key_rotation",
  "correction",
]);

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Partial<RegenerationRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const { certificateId, reason, newManifestHash, newStorageRef, reviewNote, requesterKey } = body;

  // --- validation ---
  if (!certificateId || typeof certificateId !== "string") {
    return NextResponse.json({ error: "certificateId is required" }, { status: 400 });
  }
  if (!reason || !VALID_REASONS.has(reason)) {
    return NextResponse.json({ error: `reason must be one of: ${[...VALID_REASONS].join(", ")}` }, { status: 400 });
  }
  if (!requesterKey || !isValidStellarKey(requesterKey)) {
    return NextResponse.json({ error: "requesterKey must be a valid Stellar public key" }, { status: 400 });
  }
  if (newManifestHash !== null && newManifestHash !== undefined && !isValidHex64(newManifestHash)) {
    return NextResponse.json({ error: "newManifestHash must be a 64-character hex string" }, { status: 400 });
  }
  if (reviewNote && typeof reviewNote === "string" && reviewNote.length > 1000) {
    return NextResponse.json({ error: "reviewNote must not exceed 1000 characters" }, { status: 400 });
  }

  // ---------------------------------------------------------------------------
  // Regeneration logic
  //
  // Production implementation wires up:
  //   1. Ownership verification via the Soroban provenance contract.
  //   2. TEE oracle re-attestation pipeline.
  //   3. A new `mint` call with `predecessor_id` set.
  //   4. A `certificate_renewed` provenance event emission.
  //
  // For the current milestone the endpoint returns a well-formed mock result
  // that exercises the full request / response contract, enabling the frontend
  // and tests to proceed while the smart-contract integration lands.
  // ---------------------------------------------------------------------------

  const now = new Date().toISOString();
  const newCertId = `${certificateId}-r${Date.now()}`;

  // Simulate processing delay representative of TEE round-trip
  await new Promise((r) => setTimeout(r, 0));

  const result: RegenerationResult = {
    newCertificate: {
      id: newCertId,
      storageRef: newStorageRef ?? `ipfs://regenerated-${certificateId}`,
      manifestHash: newManifestHash ?? `0000${certificateId.replace(/\D/g, "").padStart(60, "0")}`,
      attestationHash: `regen${Date.now().toString(16).padStart(60, "0")}`,
      creator: requesterKey,
      timestamp: Math.floor(Date.now() / 1000),
      predecessorId: certificateId,
    },
    predecessorId: certificateId,
    regeneratedAt: now,
    txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
  };

  return NextResponse.json(result, { status: 201 });
}
