/**
 * hash.ts
 *
 * Shared cryptographic hashing utilities for the StellarVeriphy platform.
 *
 * These functions run in Node.js (server-side, tests) via the built-in
 * `crypto` module.  For browser-side hashing of binary files, use
 * `frontend/utils/hashing.ts` which relies on the Web Crypto API.
 *
 * @module packages/shared/utils/hash
 *
 * @example
 * ```ts
 * import { sha256, buildManifestHash } from "@stellarveriphy/shared/utils/hash";
 *
 * const hash = sha256("hello world");
 * // → "b94d27b9934d3e08a52e52d7da7dabfac484efe04294e576b5..."
 *
 * const manifestHash = buildManifestHash({ creator: "GABC...", timestamp: "2026-01-01" });
 * ```
 */

import { createHash } from "crypto";

/**
 * Computes the SHA-256 digest of a UTF-8 string.
 *
 * The input is encoded as UTF-8 before hashing, matching the behaviour of
 * `TextEncoder` + `crypto.subtle.digest` in the browser so that both
 * environments produce identical digests for the same string.
 *
 * @param data - The UTF-8 string to hash.
 * @returns Lower-case hex-encoded SHA-256 digest (64 characters).
 *
 * @example
 * ```ts
 * sha256("hello")
 * // → "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
 * ```
 */
export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Produces a canonical SHA-256 hash of a content manifest object.
 *
 * The object is serialised with `JSON.stringify` (no indentation, no sorting)
 * before hashing.  Callers that need a canonical form should normalise the
 * object (sort keys, remove undefined values) before passing it in.
 *
 * This hash is what gets stored in the `manifest_hash` field of the
 * on-chain [`ProvenanceCert`] struct.
 *
 * @param manifest - Any JSON-serialisable object representing a
 *   {@link ContentManifest}.
 * @returns Lower-case hex-encoded SHA-256 digest of the serialised manifest.
 *
 * @example
 * ```ts
 * buildManifestHash({ creator: "GABC...", timestamp: "2026-01-01T00:00:00Z" })
 * // → "e3b0c44298fc1c149afbf4c8996fb924..."
 * ```
 */
export function buildManifestHash(manifest: object): string {
  return sha256(JSON.stringify(manifest));
}
