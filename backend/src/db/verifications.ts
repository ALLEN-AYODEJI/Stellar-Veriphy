import type { Db, Filter } from "mongodb";
import { Collections, type VerificationDoc, type VerificationStatus } from "./collections.js";

const MAX_PAGE_SIZE = 100;

/** Only what the status endpoint returns; keeps the hot path's documents small. */
const STATUS_PROJECTION = {
  _id: 0,
  jobId: 1,
  status: 1,
  certId: 1,
  txHash: 1,
  error: 1,
  createdAt: 1,
  updatedAt: 1,
  completedAt: 1,
} as const;

/**
 * Every verification read goes through here so each query shape maps to exactly one index
 * in src/db/indexes.ts. Add a matching index (and doc entry) before adding a new query.
 */
export class VerificationRepository {
  constructor(private readonly db: Db) {}

  private get col() {
    return this.db.collection<VerificationDoc>(Collections.verifications);
  }

  /** Index: jobId_unique */
  getStatus(jobId: string) {
    return this.col.findOne({ jobId }, { projection: STATUS_PROJECTION });
  }

  /** Index: contentHash_createdAt */
  findLatestByContentHash(contentHash: string) {
    return this.col.findOne({ contentHash }, { sort: { createdAt: -1 } });
  }

  /**
   * Index: creator_createdAt. Keyset pagination: pass the last item's createdAt as `before`
   * instead of using skip(), which scans and discards every skipped document.
   */
  listByCreator(creator: string, { limit = 20, before }: { limit?: number; before?: Date } = {}) {
    const filter: Filter<VerificationDoc> = { creator };
    if (before) filter.createdAt = { $lt: before };
    return this.col
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), MAX_PAGE_SIZE))
      .toArray();
  }

  /** Index: status_updatedAt — e.g. requests stuck in "processing". */
  findStale(status: VerificationStatus, olderThan: Date, limit = 100) {
    return this.col
      .find({ status, updatedAt: { $lt: olderThan } })
      .sort({ updatedAt: 1 })
      .limit(limit)
      .toArray();
  }

  /** Index: certId_unique */
  findByCertId(certId: string) {
    return this.col.findOne({ certId });
  }
}
