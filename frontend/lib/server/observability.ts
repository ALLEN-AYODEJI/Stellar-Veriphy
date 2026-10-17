import { createHash } from "crypto";

type LogLevel = "info" | "warn" | "error";

interface OperationalLogContext {
  requestId?: string;
  route: string;
  operation: string;
  status?: number;
  reason?: string;
  actor?: string;
  uploadId?: string;
  jobId?: string;
  contentHash?: string;
  manifestHash?: string;
  error?: unknown;
  details?: Record<string, unknown>;
}

function shortHash(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function errorSummary(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return { message: String(error) };
}

function safeContext(context: OperationalLogContext) {
  const { actor, contentHash, manifestHash, error, ...rest } = context;
  return {
    ...rest,
    actorHash: shortHash(actor),
    contentHashPrefix: contentHash?.slice(0, 12),
    manifestHashPrefix: manifestHash?.slice(0, 12),
    error: errorSummary(error),
  };
}

export function requestIdFrom(req: Request): string {
  return (
    req.headers.get("x-request-id") ??
    req.headers.get("x-correlation-id") ??
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  );
}

export function logOperationalEvent(level: LogLevel, event: string, context: OperationalLogContext): void {
  const payload = {
    event,
    level,
    timestamp: new Date().toISOString(),
    service: "stellar-veriphy",
    ...safeContext(context),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
