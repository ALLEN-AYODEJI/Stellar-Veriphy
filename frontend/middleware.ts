import { NextResponse, type NextRequest } from "next/server";
import { ApiError, errorResponse } from "@/lib/api/errors";
import { REQUEST_ID_HEADER, resolveRequestId } from "@/lib/api/request-id";
import {
  API_VERSION_HEADER,
  DEFAULT_API_VERSION,
  UNVERSIONED_API_PATHS,
  isSupportedVersion,
  parseApiVersion,
  supportedVersionsDetail,
  versionFromPath,
} from "@/lib/api/versioning";

// Routes unversioned /api/* requests to the version requested via header (or
// the default), and rejects unknown versions with the standard error shape.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (UNVERSIONED_API_PATHS.has(pathname)) return NextResponse.next();

  const requestId = resolveRequestId(req.headers);
  const fromPath = versionFromPath(pathname);

  if (fromPath) {
    if (isSupportedVersion(fromPath.raw)) return NextResponse.next();
    return unsupportedVersion(fromPath.raw, requestId);
  }

  const headerValue = req.headers.get(API_VERSION_HEADER);
  const version = headerValue ? parseApiVersion(headerValue) : DEFAULT_API_VERSION;
  if (!version) return unsupportedVersion(headerValue ?? "", requestId);

  const url = req.nextUrl.clone();
  url.pathname = `/api/v${version}${pathname.slice("/api".length)}`;
  return NextResponse.rewrite(url);
}

function unsupportedVersion(requested: string, requestId: string) {
  const error = new ApiError("UNSUPPORTED_API_VERSION", {
    details: { requestedVersion: requested.slice(0, 32), ...supportedVersionsDetail() },
  });
  return errorResponse(error, requestId, { [REQUEST_ID_HEADER]: requestId });
}

export const config = {
  matcher: "/api/:path*",
};
