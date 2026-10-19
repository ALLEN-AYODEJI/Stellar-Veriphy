# Data retention and stale-session cleanup

Verification sessions and job records are temporary working state. A scheduled cleanup removes them once they're no longer useful, so the collections and their indexes stay small. The rules live in `backend/src/maintenance/cleanup.ts`.

## Retention rules

| Task | Applies to | Rule (defaults) | Action |
|---|---|---|---|
| `archive_idle_sessions` | `verification_sessions` in state `open`, `abandoned`, or `expired` | no activity for `RETENTION_IDLE_SESSION_HOURS` (24h) | move to archive |
| `archive_completed_sessions` | `verification_sessions` in state `completed` | no activity for `RETENTION_COMPLETED_SESSION_DAYS` (7d) | move to archive |
| `purge_session_archive` | `verification_sessions_archive` | archived more than `RETENTION_ARCHIVE_DAYS` (90d) ago | delete |
| `purge_succeeded_jobs` | `jobs` with status `succeeded` | finished more than `RETENTION_SUCCEEDED_JOB_DAYS` (7d) ago | delete |
| `purge_dead_jobs` | `jobs` with status `dead` | finished more than `RETENTION_DEAD_JOB_DAYS` (30d) ago | delete |

"Activity" means `lastActivityAt`. The app updates it on every interaction with a session (`SessionRepository.touch`).

## What cleanup never removes

- **`verifications`**: verification records and certificate references are user data and the product's audit trail. No retention rule touches this collection, and the cleanup code refuses to delete from any collection not on its allow-list (see [backup-retention.md](backup-retention.md#2-protection-from-accidental-deletion-enforced-in-code)).
- **Sessions in state `submitted`**: their verification is in flight.
- **Any session whose linked verification is `pending` or `processing`**, whatever the session's own state. These are counted as `skippedActive` in the report.
- **Queued or running jobs**: only `succeeded` and `dead` jobs are purged.
- **On-chain data**: Soroban contract storage is immutable from the backend's point of view.

## Safety guarantees

- **Archive before delete.** Sessions are copied to `verification_sessions_archive` with `archivedAt` and `archiveReason`, then removed. The archive keeps a 90-day recovery window.
- **Re-checked at delete time.** The delete re-applies the staleness filter. A session that becomes active between the copy and the delete is kept, and its archive copy is removed.
- **Idempotent.** Archive writes are upserts keyed by `_id`, so a crash part-way through a batch is resolved by the next run.
- **Bounded.** Work happens in batches of `RETENTION_BATCH_SIZE` (500), up to `RETENTION_MAX_BATCHES_PER_RUN` (20) per task per run. When a backlog exceeds that, the report sets `truncated: true` and the next run continues.
- **Single runner.** A lease lock in the `locks` collection keeps scheduled and manual runs from overlapping across instances. The lease expires after 30 minutes if its holder dies.
- **Isolated failures.** If one task fails, it's logged and counted, and the remaining tasks still run.

## Schedule

Every instance runs the scheduler (first run 1 minute after start, then every `RETENTION_INTERVAL_MINUTES`, default 60), but only the lock holder does the work. Set `RETENTION_CLEANUP_ENABLED=false` to turn it off, for example during a data migration.

## Running it manually

Always do a dry run first. It only counts the records that currently match each rule:

```bash
pnpm --filter backend retention:dry-run
# or, against a running instance:
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" "http://<host>:4000/admin/maintenance/cleanup?dryRun=1"
```

Apply:

```bash
pnpm --filter backend retention:cleanup
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" http://<host>:4000/admin/maintenance/cleanup
```

Both commands return one report per task: `archived`, `deleted`, `skippedActive`, `truncated`, `durationMs`, and `error`, if any. A manual run returns `409` while another run holds the lock.

## Restoring an archived session

```js
const doc = db.verification_sessions_archive.findOne({ sessionId: "<id>" });
delete doc.archivedAt; delete doc.archiveReason;
doc.lastActivityAt = new Date();       // otherwise the next run archives it again
db.verification_sessions.insertOne(doc);
db.verification_sessions_archive.deleteOne({ _id: doc._id });
```

## Temporary uploads

Archived sessions keep `tempUploadRef`. Removing the referenced blob from the storage layer is left to the storage service's own lifecycle policy. Configure it with a lifetime longer than `RETENTION_IDLE_SESSION_HOURS`, so a blob never disappears while its session can still be resumed.

## Monitoring

| Metric | Meaning |
|---|---|
| `sv_cleanup_runs_total{task,outcome}` | Runs by `success` / `failure` |
| `sv_cleanup_records_total{task,action}` | Records `archived` / `deleted` |
| `sv_cleanup_duration_seconds{task}` | Task duration |
| `sv_cleanup_last_success_timestamp_seconds{task}` | Last successful run |

Logs use `component: "retention"`, with `retention task completed`, `retention task failed`, and `retention backlog exceeds per-run limit`. Alerts are in group `retention` of [`infra/prometheus/alerts.yml`](../../infra/prometheus/alerts.yml).

## Changing the rules

Any change to the retention windows must keep the guarantees above. Update this page in the same change. Shortening a window takes effect on the next run, so do a dry run against production first to see how many records it would affect.
