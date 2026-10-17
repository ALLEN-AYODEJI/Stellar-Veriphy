"use client";

/**
 * DisputeEvidencePackageView (#671)
 *
 * Single-page reviewer view of a dispute's evidence package: files,
 * manifests, hashes, attestations, links and comments grouped consistently,
 * each linked to the dispute with its integrity checks. Reviewers can
 * re-verify the package hash locally, add evidence, and export the package
 * as JSON for the audit record.
 */

import { useCallback, useEffect, useState } from "react";
import {
  EVIDENCE_KINDS,
  verifyEvidencePackage,
  type DisputeEvidenceItem,
  type DisputeEvidencePackage,
  type EvidenceItemCheck,
  type EvidenceKind,
  type EvidencePackageSummary,
  type EvidencePackageVerification,
} from "@stellarveriphy/shared";

const KIND_LABELS: Record<EvidenceKind, string> = {
  manifest: "Manifests",
  hash: "Hashes",
  file: "Files",
  attestation: "Attestations",
  link: "Links",
  comment: "Comments",
};

const inputClass =
  "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100";

function CheckBadges({ check }: { check?: EvidenceItemCheck }) {
  if (!check) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {check.contentHashRelation === "match" && (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Matches asset hash
        </span>
      )}
      {check.contentHashRelation === "mismatch" && (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
          Differs from asset hash
        </span>
      )}
      {check.manifestIntegrity === "valid" && (
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Manifest hash valid
        </span>
      )}
      {check.manifestIntegrity === "invalid" && (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
          Manifest hash invalid
        </span>
      )}
      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300" title={check.itemDigest}>
        digest {check.itemDigest.slice(0, 10)}…
      </span>
    </div>
  );
}

function EvidenceItemCard({ item, check }: { item: DisputeEvidenceItem; check?: EvidenceItemCheck }) {
  return (
    <li className="rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {item.submitterRole} · <span className="font-mono">{item.submittedBy}</span> ·{" "}
            {new Date(item.submittedAt).toLocaleString()}
          </p>
        </div>
        <CheckBadges check={check} />
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
        {item.sha256 && (
          <>
            <dt className="text-gray-500">SHA-256</dt>
            <dd className="font-mono break-all text-gray-800 dark:text-gray-200">{item.sha256}</dd>
          </>
        )}
        {item.storageRef && (
          <>
            <dt className="text-gray-500">Storage</dt>
            <dd className="font-mono break-all text-gray-800 dark:text-gray-200">{item.storageRef}</dd>
          </>
        )}
        {item.mimeType && (
          <>
            <dt className="text-gray-500">Type</dt>
            <dd className="text-gray-800 dark:text-gray-200">
              {item.mimeType}
              {item.sizeBytes !== undefined && ` · ${item.sizeBytes.toLocaleString()} bytes`}
            </dd>
          </>
        )}
        {item.attestationRef && (
          <>
            <dt className="text-gray-500">Attestation</dt>
            <dd className="font-mono break-all text-gray-800 dark:text-gray-200">{item.attestationRef}</dd>
          </>
        )}
        {item.url && (
          <>
            <dt className="text-gray-500">URL</dt>
            <dd className="break-all">
              <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-600 hover:underline">
                {item.url}
              </a>
            </dd>
          </>
        )}
      </dl>
      {item.text && (
        <p className="whitespace-pre-wrap rounded bg-gray-50 dark:bg-gray-900/50 p-2 text-sm text-gray-700 dark:text-gray-300">{item.text}</p>
      )}
      {item.manifest && (
        <details>
          <summary className="cursor-pointer text-xs text-blue-600">View manifest JSON</summary>
          <pre className="mt-1 max-h-64 overflow-auto rounded bg-gray-50 dark:bg-gray-900 p-2 text-xs text-gray-800 dark:text-gray-200">
            {JSON.stringify(item.manifest, null, 2)}
          </pre>
        </details>
      )}
      {check && check.warnings.length > 0 && (
        <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400">
          {check.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

function AddEvidenceForm({ disputeId, onAdded }: { disputeId: string; onAdded: () => void }) {
  const [kind, setKind] = useState<EvidenceKind>("hash");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [sha256, setSha256] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const body: Partial<DisputeEvidenceItem> = { kind, label };
    try {
      if (kind === "hash") body.sha256 = value;
      if (kind === "file") Object.assign(body, { storageRef: value, sha256 });
      if (kind === "link") body.url = value;
      if (kind === "comment") body.text = value;
      if (kind === "attestation") body.attestationRef = value;
      if (kind === "manifest") Object.assign(body, { manifest: JSON.parse(value), sha256: sha256 || undefined });
    } catch {
      setError("Manifest must be valid JSON.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/admin/moderation/${disputeId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Failed to add evidence.");
      } else {
        setLabel("");
        setValue("");
        setSha256("");
        onAdded();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const valueLabel: Record<EvidenceKind, string> = {
    hash: "SHA-256 digest",
    file: "Storage reference (IPFS CID, S3 key…)",
    link: "HTTPS URL",
    comment: "Comment",
    attestation: "Oracle request id or tx hash",
    manifest: "Manifest JSON",
  };

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add evidence</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ev-kind" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Kind</label>
          <select id="ev-kind" value={kind} onChange={(e) => setKind(e.target.value as EvidenceKind)} className={inputClass}>
            {EVIDENCE_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ev-label" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Label</label>
          <input id="ev-label" value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="ev-value" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{valueLabel[kind]}</label>
        {kind === "comment" || kind === "manifest" ? (
          <textarea id="ev-value" rows={4} value={value} onChange={(e) => setValue(e.target.value)} className={`${inputClass} font-mono`} />
        ) : (
          <input id="ev-value" value={value} onChange={(e) => setValue(e.target.value)} className={`${inputClass} font-mono`} />
        )}
      </div>
      {(kind === "file" || kind === "manifest") && (
        <div>
          <label htmlFor="ev-sha" className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
            {kind === "file" ? "File SHA-256" : "Declared manifest SHA-256 (optional)"}
          </label>
          <input id="ev-sha" value={sha256} onChange={(e) => setSha256(e.target.value)} className={`${inputClass} font-mono`} />
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving || !label.trim() || !value.trim()}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Adding…" : "Add to package"}
      </button>
    </section>
  );
}

export function DisputeEvidencePackageView({ disputeId }: { disputeId: string }) {
  const [pkg, setPkg] = useState<DisputeEvidencePackage | null>(null);
  const [summary, setSummary] = useState<EvidencePackageSummary | null>(null);
  const [verification, setVerification] = useState<EvidencePackageVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setVerification(null);
    try {
      const res = await fetch(`/api/admin/moderation/${disputeId}/evidence`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setPkg(data.data.package);
        setSummary(data.data.summary);
      } else {
        setError(data.error ?? "Failed to load evidence package.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportJson = () => {
    if (!pkg) return;
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pkg.packageId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !pkg) return <p className="text-sm text-gray-500">Loading evidence package…</p>;
  if (error) return <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!pkg || !summary) return null;

  const checkFor = (id: string) => pkg.checks.find((c) => c.itemId === id);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="text-gray-500">Dispute</dt>
          <dd className="font-mono text-gray-900 dark:text-gray-100">
            {pkg.disputeId}
            {pkg.onChainDisputeId !== undefined && ` (on-chain #${pkg.onChainDisputeId})`}
          </dd>
          <dt className="text-gray-500">Asset</dt>
          <dd className="font-mono text-gray-900 dark:text-gray-100">{pkg.assetId}</dd>
          <dt className="text-gray-500">Content hash</dt>
          <dd className="font-mono break-all text-xs text-gray-900 dark:text-gray-100">{pkg.contentHash}</dd>
          <dt className="text-gray-500">Package hash</dt>
          <dd className="font-mono break-all text-xs text-gray-900 dark:text-gray-100">{pkg.packageHash}</dd>
          {pkg.summary && (
            <>
              <dt className="text-gray-500">Summary</dt>
              <dd className="text-gray-700 dark:text-gray-300">{pkg.summary}</dd>
            </>
          )}
        </dl>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => setVerification(await verifyEvidencePackage(pkg))}
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200"
          >
            Re-verify integrity
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200"
          >
            Export package JSON
          </button>
        </div>
        {verification && (
          <p
            role="status"
            className={`text-sm ${verification.valid ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
          >
            {verification.valid
              ? "Package hash and all item digests verified."
              : `Integrity check failed${verification.tamperedItems.length ? ` for: ${verification.tamperedItems.join(", ")}` : ""}.`}
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Items", summary.totalItems],
          ["Hash matches", summary.matchingHashes],
          ["Hash mismatches", summary.mismatchingHashes],
          ["Invalid manifests", summary.invalidManifests],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{value}</p>
          </div>
        ))}
      </section>

      {summary.warnings.length > 0 && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">Review warnings</p>
          <ul className="list-disc list-inside text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
            {summary.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {EVIDENCE_KINDS.map((kind) => (
        <section key={kind} aria-labelledby={`ev-${kind}`} className="space-y-2">
          <h2 id={`ev-${kind}`} className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {KIND_LABELS[kind]} <span className="text-gray-400">({pkg.sections[kind].length})</span>
          </h2>
          {pkg.sections[kind].length === 0 ? (
            <p className="text-xs text-gray-400">None submitted.</p>
          ) : (
            <ul className="space-y-2">
              {pkg.sections[kind].map((item) => (
                <EvidenceItemCard key={item.id} item={item} check={checkFor(item.id)} />
              ))}
            </ul>
          )}
        </section>
      ))}

      <AddEvidenceForm disputeId={disputeId} onAdded={() => void load()} />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Package audit trail</h2>
        <ol className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          {pkg.auditTrail.map((a, i) => (
            <li key={i}>
              <span className="font-mono">{new Date(a.at).toLocaleString()}</span> · {a.action} · {a.actor} — {a.details}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
