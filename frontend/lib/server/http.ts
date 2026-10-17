import { NextResponse } from "next/server";
import type { FieldError } from "@stellarveriphy/shared";
import { logOperationalEvent } from "./observability";

export type ApiStatus =
  | "ok"
  | "created"
  | "exists"
  | "queued"
  | "invalid_json"
  | "unsupported_media_type"
  | "validation_error"
  | "not_found"
  | "server_error";

export interface ApiBody<T> {
  status: ApiStatus;
  message?: string;
  errors?: FieldError[];
  data?: T;
}

export function respond<T>(httpStatus: number, body: ApiBody<T>) {
  return NextResponse.json(body, { status: httpStatus });
}

// Parses a JSON request body, or returns the error response to send.
export async function readJson(req: Request): Promise<{ body: unknown } | { response: NextResponse }> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return {
      response: respond(415, { status: "unsupported_media_type", message: "Send the request body as application/json." }),
    };
  }
  try {
    return { body: await req.json() };
  } catch {
    return { response: respond(400, { status: "invalid_json", message: "The request body is not valid JSON." }) };
  }
}

export function serverError(context: string, err: unknown) {
  logOperationalEvent("error", "api.server_error", {
    route: context,
    operation: "request",
    status: 500,
    error: err,
  });
  return respond(500, { status: "server_error", message: "Something went wrong on our side. Please try again." });
}
