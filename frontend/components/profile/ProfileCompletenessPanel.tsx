"use client";

/**
 * ProfileCompletenessPanel — #911
 *
 * Summarises which profile details are missing, grouped by importance, with
 * the reason each one matters and a link that jumps to the field to fix it.
 */

import {
  getProfileCompleteness,
  IMPORTANCE_LABELS,
  type MissingProfileField,
  type ProfileFieldImportance,
  type ProfileValues,
} from "@/lib/profileCompleteness";

const GROUP_ORDER: ProfileFieldImportance[] = ["required", "recommended", "optional"];

function MissingItem({ item }: { item: MissingProfileField }) {
  const { field, reason } = item;
  return (
    <li className="py-2">
      <a href={`#${field.id}`} className="font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-500">
        {field.label}
      </a>
      <span className="text-slate-500">
        {" — "}
        {reason === "invalid" ? "needs a valid value" : "not added yet"}
      </span>
      {field.sensitive && (
        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
          Sensitive · stored privately
        </span>
      )}
      <p className="mt-0.5 text-sm text-slate-600">{field.why}</p>
    </li>
  );
}

export function ProfileCompletenessPanel({ values }: { values: ProfileValues }) {
  const status = getProfileCompleteness(values);
  const anyMissing = GROUP_ORDER.some((group) => status.missing[group].length > 0);

  return (
    <section aria-labelledby="profile-completeness-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="profile-completeness-heading" className="text-base font-semibold text-slate-900">
          Profile completeness
        </h2>
        <p className="text-sm text-slate-600">
          {status.completed} of {status.total} details added ({status.percent}%)
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Profile completeness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={status.percent}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div className="h-full bg-indigo-600" style={{ width: `${status.percent}%` }} />
      </div>

      {!anyMissing && <p className="mt-4 text-sm font-medium text-emerald-700">Your profile is complete.</p>}

      {anyMissing && (
        <div className="mt-4 space-y-4">
          {GROUP_ORDER.map((group) => {
            const items = status.missing[group];
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <h3 className="text-sm font-semibold text-slate-800">
                  {IMPORTANCE_LABELS[group]} <span className="font-normal text-slate-500">({items.length})</span>
                </h3>
                <ul className="mt-1 divide-y divide-slate-100 text-sm">
                  {items.map((item) => (
                    <MissingItem key={item.field.id} item={item} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      {anyMissing && !status.canVerify && (
        <p className="mt-4 text-sm text-amber-800">Add the required details before submitting content for verification.</p>
      )}
    </section>
  );
}
