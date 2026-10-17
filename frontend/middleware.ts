import { NextRequest, NextResponse } from "next/server";

/**
 * Request correlation (#765).
 *
 * Every API request gets a request ID. A well-formed `X-Request-Id` (or
 * `X-Correlation-Id`) sent by the client is reused so client and server events
 * can be matched; otherwise a new one is generated. The ID is forwarded to the
 * route handler (where `requestIdFrom()` picks it up for structured logs) and
 * echoed back on the response as `X-Request-Id`.
 */

const REQUEST_ID_HEADER = "x-request-id";
const VALID_REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;

function resolveRequestId(req: NextRequest): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER) ?? req.headers.get("x-correlation-id");
  if (incoming && VALID_REQUEST_ID.test(incoming)) return incoming;
  return `req_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function middleware(req: NextRequest) {
  const requestId = resolveRequestId(req);

  const headers = new Headers(req.headers);
  headers.set(REQUEST_ID_HEADER, requestId);

  const res = NextResponse.next({ request: { headers } });
  res.headers.set("X-Request-Id", requestId);
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
