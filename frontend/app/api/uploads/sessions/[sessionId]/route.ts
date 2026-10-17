import { describeUploadSession, validateUploadSessionUpdate, type UploadSessionView } from "@stellarveriphy/shared";
import { readValidated, respond, serverError, validationError } from "@/lib/server/http";
import { logOperationalEvent, requestIdFrom } from "@/lib/server/observability";
import { getSession, updateSession } from "@/lib/server/upload-sessions";

type Params = { params: Promise<{ sessionId: string }> };

// GET /api/uploads/sessions/:sessionId: current state, including which chunk to send next.
export async function GET(_req: Request, { params }: Params) {
  const { sessionId } = await params;
  try {
    const session = await getSession(sessionId);
    if (!session) return respond(404, { status: "not_found", message: "No upload session exists with this ID." });
    return respond<UploadSessionView>(200, { status: "ok", data: describeUploadSession(session) });
  } catch (err) {
    return serverError("GET /api/uploads/sessions/[sessionId]", err);
  }
}

// PATCH /api/uploads/sessions/:sessionId { action, … }: record progress, resume,
// restart, abort or complete the session.
export async function PATCH(req: Request, { params }: Params) {
  const { sessionId } = await params;
  const requestId = requestIdFrom(req);
  const parsed = await readValidated(req, validateUploadSessionUpdate);
  if ("response" in parsed) return parsed.response;

  try {
    const result = await updateSession(sessionId, parsed.value);
    if (!result) return respond(404, { status: "not_found", message: "No upload session exists with this ID." });
    if (!result.ok) {
      if (result.reason === "invalid") return validationError(result.errors);
      if (result.reason === "expired") {
        return respond(410, {
          status: "expired",
          message: "This upload session expired. Restart it with { \"action\": \"restart\" } or start a new session.",
        });
      }
      return respond(409, { status: "conflict", message: result.message });
    }

    const view = describeUploadSession(result.session);
    if (parsed.value.action !== "progress") {
      logOperationalEvent("info", `upload_session.${parsed.value.action}`, {
        requestId,
        route: "PATCH /api/uploads/sessions/[sessionId]",
        operation: "update_upload_session",
        status: 200,
        actor: view.creator,
        contentHash: view.contentHash,
        uploadId: view.uploadId,
        details: { sessionId, attempt: view.attempt, progress: view.progress },
      });
    }
    return respond<UploadSessionView>(200, { status: "ok", data: view });
  } catch (err) {
    return serverError("PATCH /api/uploads/sessions/[sessionId]", err);
  }
}
