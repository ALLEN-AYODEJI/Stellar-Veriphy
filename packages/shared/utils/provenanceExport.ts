import type {
  ProvenanceExportFormat,
  ProvenanceExportMeta,
  ProvenanceRecord,
} from "../types";

export const PROVENANCE_EXPORT_SCHEMA_VERSION = "1.0.0";
/** Max records per exported file; larger exports are split into parts. */
export const PROVENANCE_EXPORT_CHUNK_SIZE = 5_000;

/** Stable column order shared by CSV headers and JSON keys. */
export const PROVENANCE_EXPORT_COLUMNS: (keyof ProvenanceRecord)[] = [
  "id",
  "status",
  "creator",
  "contentHash",
  "manifestHash",
  "attestationHash",
  "storageRef",
  "fileName",
  "fileType",
  "timestamp",
  "eventCount",
  "lastEventAt",
];

const MIME: Record<ProvenanceExportFormat, string> = {
  json: "application/json",
  csv: "text/csv",
  ndjson: "application/x-ndjson",
};

export function exportMimeType(format: ProvenanceExportFormat): string {
  return MIME[format];
}

/**
 * Naming convention: `stellarveriphy-provenance_<scope>_<YYYYMMDDTHHMMSSZ>[_partNofM].<ext>`
 */
export function buildExportFileName(
  format: ProvenanceExportFormat,
  scope: ProvenanceExportMeta["scope"],
  date: Date,
  part = 1,
  totalParts = 1,
): string {
  const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const partSuffix = totalParts > 1 ? `_part${part}of${totalParts}` : "";
  return `stellarveriphy-provenance_${scope}_${stamp}${partSuffix}.${format}`;
}

/** Normalises a record into the canonical export shape (ISO dates, fixed key order). */
export function normalizeRecord(record: ProvenanceRecord): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const col of PROVENANCE_EXPORT_COLUMNS) {
    const value = record[col];
    if (col === "timestamp" || col === "lastEventAt") {
      out[col] = new Date((value as number) * 1000).toISOString();
    } else {
      out[col] = value ?? "";
    }
  }
  return out;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function serializeRecords(
  records: ProvenanceRecord[],
  format: ProvenanceExportFormat,
  meta: ProvenanceExportMeta,
): string {
  const rows = records.map(normalizeRecord);
  switch (format) {
    case "json":
      return JSON.stringify({ meta, records: rows }, null, 2);
    case "ndjson":
      return [JSON.stringify({ meta }), ...rows.map((r) => JSON.stringify(r))].join("\n");
    case "csv":
      return [
        PROVENANCE_EXPORT_COLUMNS.join(","),
        ...rows.map((r) => PROVENANCE_EXPORT_COLUMNS.map((c) => csvCell(r[c])).join(",")),
      ].join("\n");
  }
}

export function chunkRecords<T>(records: T[], size = PROVENANCE_EXPORT_CHUNK_SIZE): T[][] {
  if (records.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < records.length; i += size) chunks.push(records.slice(i, i + size));
  return chunks;
}

/** Basic structural validation run before an export is offered for download. */
export function validateRecords(records: ProvenanceRecord[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  records.forEach((r, i) => {
    if (!r.id) errors.push(`Record ${i}: missing id`);
    else if (seen.has(r.id)) errors.push(`Record ${i}: duplicate id ${r.id}`);
    seen.add(r.id);
    if (!/^G[A-Z2-7]{55}$/.test(r.creator)) errors.push(`Record ${r.id}: invalid creator key`);
    if (!/^[a-f0-9]{64}$/i.test(r.contentHash)) errors.push(`Record ${r.id}: invalid contentHash`);
    if (!Number.isFinite(r.timestamp)) errors.push(`Record ${r.id}: invalid timestamp`);
  });
  return errors;
}
