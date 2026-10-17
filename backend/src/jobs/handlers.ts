import type { QueueName } from "../db/collections.js";
import type { HandlerMap } from "./worker.js";

/**
 * Job handlers by queue and job type. A worker is started only for queues listed here, so jobs
 * enqueued for a queue with no handlers wait (visible as sv_jobs{state="ready"}) instead of being
 * dead-lettered. Throw JobError(message, code, retryable) from handlers for traceable failures.
 *
 * Example:
 *   verification: {
 *     "submit-attestation": async (job, { log, signal }) => { ... },
 *   },
 */
export const jobHandlers: Partial<Record<QueueName, HandlerMap>> = {};
