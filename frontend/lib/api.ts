import type { FieldError, UploadMetadata, UploadRecord, VerificationJobView } from "@stellarveriphy/shared";
import { resolveApiEndpoint } from "@/config";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly errors: FieldError[] = [],
    readonly retryAfterSeconds?: number
  ) {
    super(message);
  }
}

export interface RetryUpdate {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  reason: string;
}

interface RequestOptions extends RequestInit {
  retry?: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (update: RetryUpdate) => void;
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number): boolean {
  return status === 0 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function retryDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const jitter = Math.round(exponential * (0.75 + Math.random() * 0.5));
  return Math.min(maxDelayMs, jitter);
}

async function request<T>(pathOrUrl: string, init?: RequestOptions): Promise<T> {
  const url = resolveApiEndpoint(pathOrUrl);
  const retry = init?.retry;
  const maxAttempts = retry?.maxAttempts ?? 1;
  const baseDelayMs = retry?.baseDelayMs ?? 600;
  const maxDelayMs = retry?.maxDelayMs ?? 6000;
  const { retry: _retry, ...fetchInit } = init ?? {};
  let lastError: ApiError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let res: Response | null = null;
    try {
      res = await fetch(url, fetchInit);
    } catch {
      res = null;
    }

    const status = res?.status ?? 0;
    const body = res ? await res.json().catch(() => null) : null;
    if (res?.ok) return body.data as T;

    lastError = new ApiError(
      body?.message ?? (status === 0 ? "Could not reach the server. Check your connection and try again." : `Request failed (${status}).`),
      status,
      body?.errors ?? []
    );

    if (attempt >= maxAttempts || !shouldRetry(status)) {
      if (attempt > 1) {
        console.error("Upload request failed after retry attempts", {
          url,
          attempts: attempt,
          status,
          message: lastError.message,
        });
      }
      throw lastError;
    }

    const delayMs = retryDelay(attempt, baseDelayMs, maxDelayMs);
    retry?.onRetry?.({
      attempt,
      maxAttempts,
      delayMs,
      reason: status === 0 ? "network unavailable" : `HTTP ${status}`,
    });
    console.warn("Transient upload request failure; retrying", {
      url,
      attempt,
      nextAttempt: attempt + 1,
      maxAttempts,
      delayMs,
      status,
    });
    await wait(delayMs);
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? body?.retryAfterSeconds);
    const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
    const rateLimitMessage =
      res.status === 429 && retryAfterSeconds
        ? `Too many requests. Please wait ${retryAfterSeconds} seconds before trying again.`
        : undefined;
    throw new ApiError(
      rateLimitMessage ?? body?.message ?? body?.error ?? `Request failed (${res.status}).`,
      res.status,
      body?.errors ?? [],
      retryAfterSeconds
    );
  }

  throw lastError ?? new ApiError("Request failed.", 0);
}

function postJson<T>(url: string, payload: unknown, options?: Pick<RequestOptions, "retry">): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    retry: options?.retry,
  });
}

export const api = {
  createUpload: (metadata: UploadMetadata, options?: Pick<RequestOptions, "retry">) =>
    postJson<UploadRecord>("/api/uploads", metadata, options),
  findUploadsByHash: (contentHash: string) =>
    request<UploadRecord[]>(`/api/uploads?contentHash=${encodeURIComponent(contentHash)}`),
  getUpload: (id: string) => request<UploadRecord>(`/api/uploads/${encodeURIComponent(id)}`),
  createJob: (uploadId: string, options?: Pick<RequestOptions, "retry">) =>
    postJson<VerificationJobView>("/api/jobs", { uploadId }, options),
  getJobs: (ids: string[]) =>
    request<VerificationJobView[]>(`/api/jobs?ids=${ids.map(encodeURIComponent).join(",")}`),
};
