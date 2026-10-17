import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

export type Role = "admin" | "moderator" | "user";

export interface Actor {
  // For "user" actors this is their Stellar address.
  subject: string;
  role: Role;
}

const ROLES = new Set<Role>(["admin", "moderator", "user"]);

interface TokenEntry extends Actor {
  digest: Buffer;
}

let cachedTokens: { source: string; entries: TokenEntry[] } | null = null;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// Interim bearer-token auth until wallet-signature sessions land. Tokens are
// configured as API_TOKENS="token:role:subject,token:role:subject".
function loadTokens(): TokenEntry[] {
  const source = process.env.API_TOKENS ?? "";
  if (cachedTokens?.source === source) return cachedTokens.entries;

  const entries: TokenEntry[] = [];
  for (const item of source.split(",")) {
    const [token, role, subject] = item.trim().split(":");
    if (!token || !subject || !ROLES.has(role as Role)) continue;
    entries.push({ digest: digest(token), role: role as Role, subject });
  }
  cachedTokens = { source, entries };
  return entries;
}

export function getActor(req: NextRequest): Actor | null {
  const header = req.headers.get("authorization");
  const match = header ? /^Bearer\s+(.+)$/i.exec(header) : null;
  if (!match) return null;

  const presented = digest(match[1].trim());
  let found: Actor | null = null;
  for (const entry of loadTokens()) {
    // Compare every entry so timing doesn't reveal which token matched.
    if (timingSafeEqual(entry.digest, presented) && !found) {
      found = { subject: entry.subject, role: entry.role };
    }
  }
  return found;
}

export function requireActor(req: NextRequest, allowedRoles?: readonly Role[]): Actor {
  const actor = getActor(req);
  if (!actor) throw new ApiError("UNAUTHENTICATED");
  if (allowedRoles && !allowedRoles.includes(actor.role)) throw new ApiError("FORBIDDEN");
  return actor;
}
