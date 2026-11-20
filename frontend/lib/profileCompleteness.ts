/**
 * profileCompleteness.ts — #911
 *
 * Pure rules describing which profile details are missing, how important
 * each one is for verification, and where the user can fix it. Kept free of
 * React so the grouping and copy can be unit tested directly.
 */

export type ProfileFieldImportance = "required" | "recommended" | "optional";

export interface ProfileField {
  /** DOM id of the input; used as the anchor the guidance links to. */
  id: string;
  label: string;
  importance: ProfileFieldImportance;
  /** Why this field matters for verification, shown to the user. */
  why: string;
  /** Sensitive fields are stored privately and are labelled as such in the UI. */
  sensitive?: boolean;
  /** Returns true when the value is acceptable. Defaults to a non-empty check. */
  isValid?: (value: string) => boolean;
}

export type ProfileValues = Partial<Record<ProfileField["id"], string>>;

const STELLAR_ACCOUNT_PATTERN = /^G[A-Z2-7]{55}$/;

export const PROFILE_FIELDS: readonly ProfileField[] = [
  {
    id: "displayName",
    label: "Display name",
    importance: "required",
    why: "Shown on certificates and verification records so people can see who published the content.",
  },
  {
    id: "stellarAccount",
    label: "Stellar account",
    importance: "required",
    why: "Your public key. Submissions are signed with it, so verifications cannot be linked to you without it.",
    isValid: (value) => STELLAR_ACCOUNT_PATTERN.test(value.trim()),
  },
  {
    id: "email",
    label: "Email",
    importance: "recommended",
    why: "Lets us send verification status updates when a check passes or fails.",
    sensitive: true,
  },
  {
    id: "bio",
    label: "Bio",
    importance: "optional",
    why: "A short description that helps reviewers recognise your work. Not needed for verification.",
  },
];

export interface MissingProfileField {
  field: ProfileField;
  /** "empty" when nothing was entered; "invalid" when the value fails validation. */
  reason: "empty" | "invalid";
}

export interface ProfileCompleteness {
  /** Number of fields that are filled in and valid. */
  completed: number;
  total: number;
  percent: number;
  /** Required fields are blocking; recommended and optional are not. */
  missing: Record<ProfileFieldImportance, MissingProfileField[]>;
  /** True when every required field is complete. */
  canVerify: boolean;
}

function isFieldComplete(field: ProfileField, raw: string | undefined): MissingProfileField["reason"] | null {
  const value = (raw ?? "").trim();
  if (value === "") return "empty";
  const valid = field.isValid ? field.isValid(value) : true;
  return valid ? null : "invalid";
}

export function getProfileCompleteness(
  values: ProfileValues,
  fields: readonly ProfileField[] = PROFILE_FIELDS,
): ProfileCompleteness {
  const missing: ProfileCompleteness["missing"] = { required: [], recommended: [], optional: [] };
  let completed = 0;

  for (const field of fields) {
    const reason = isFieldComplete(field, values[field.id]);
    if (reason === null) {
      completed += 1;
    } else {
      missing[field.importance].push({ field, reason });
    }
  }

  const total = fields.length;
  return {
    completed,
    total,
    percent: total === 0 ? 100 : Math.round((completed / total) * 100),
    missing,
    canVerify: missing.required.length === 0,
  };
}

export const IMPORTANCE_LABELS: Record<ProfileFieldImportance, string> = {
  required: "Required for verification",
  recommended: "Recommended",
  optional: "Optional",
};
