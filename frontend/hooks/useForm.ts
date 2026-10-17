"use client";

/**
 * useForm.ts
 *
 * Generic form state management hook.
 *
 * Features
 * ────────
 * • Tracks values, touched state, and submit state
 * • Integrates with useFieldValidation for per-field error handling
 * • Calls onSubmit only when validation passes
 * • Exposes reset, setValues, and setFieldValue helpers
 *
 * Usage
 * ─────
 *   const form = useForm({
 *     initialValues: { email: "", password: "" },
 *     validate: (values) => ({
 *       email: values.email.includes("@") ? null : "Invalid email",
 *       password: values.password.length >= 8 ? null : "Min 8 characters",
 *     }),
 *     onSubmit: async (values) => { … },
 *   });
 *
 *   <input value={form.values.email} onChange={form.handleChange("email")} />
 *   <span>{form.errors.email}</span>
 *   <button onClick={form.handleSubmit}>Submit</button>
 */

import { useCallback, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormErrors<T> = Partial<Record<keyof T, string | null>>;

export interface UseFormOptions<T extends Record<string, unknown>> {
  /** Starting field values. */
  initialValues: T;
  /**
   * Synchronous validation function.
   * Return an object mapping field names to an error string (or null for valid).
   */
  validate?: (values: T) => FormErrors<T>;
  /** Called with validated values on successful submit. */
  onSubmit?: (values: T) => void | Promise<void>;
}

export interface UseFormReturn<T extends Record<string, unknown>> {
  values: T;
  errors: FormErrors<T>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isDirty: boolean;
  /** onChange handler factory — call with the field name. */
  handleChange: (
    field: keyof T
  ) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  /** onBlur handler factory — call with the field name. */
  handleBlur: (field: keyof T) => () => void;
  /** Programmatically set a single field value. */
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  /** Merge new values into the form state (useful for autofill / hydration). */
  setValues: (values: Partial<T>) => void;
  /** Validate and call onSubmit if there are no errors. */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  /** Reset form to initialValues (or provided override). */
  reset: (values?: Partial<T>) => void;
  /** Run validation and return whether the form is currently valid. */
  validate: () => boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate: validateFn,
  onSubmit,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValuesState] = useState<T>({ ...initialValues });
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialRef = useRef<T>({ ...initialValues });

  // Derived: any field differs from its initial value
  const isDirty = (Object.keys(values) as (keyof T)[]).some(
    (k) => values[k] !== initialRef.current[k]
  );

  // ── Internal validation runner ─────────────────────────────────────────────
  const runValidation = useCallback(
    (vals: T): FormErrors<T> => {
      if (!validateFn) return {};
      return validateFn(vals);
    },
    [validateFn]
  );

  // ── handleChange ──────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (field: keyof T) =>
      (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => {
        const newValues = { ...values, [field]: e.target.value as T[keyof T] };
        setValuesState(newValues);
        // Re-validate the changed field if already touched
        if (touched[field]) {
          const newErrors = runValidation(newValues);
          setErrors((prev) => ({ ...prev, [field]: newErrors[field] ?? null }));
        }
      },
    [values, touched, runValidation]
  );

  // ── handleBlur ────────────────────────────────────────────────────────────
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const newErrors = runValidation(values);
      setErrors((prev) => ({ ...prev, [field]: newErrors[field] ?? null }));
    },
    [values, runValidation]
  );

  // ── setFieldValue ─────────────────────────────────────────────────────────
  const setFieldValue = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      const newValues = { ...values, [field]: value };
      setValuesState(newValues);
      const newErrors = runValidation(newValues);
      setErrors((prev) => ({ ...prev, [field]: newErrors[field] ?? null }));
    },
    [values, runValidation]
  );

  // ── setValues ─────────────────────────────────────────────────────────────
  const setValues = useCallback(
    (patch: Partial<T>) => {
      setValuesState((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  // ── validate ──────────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const allErrors = runValidation(values);
    setErrors(allErrors);
    // Mark all fields as touched so errors become visible
    const allTouched = (Object.keys(values) as (keyof T)[]).reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as Record<keyof T, boolean>
    );
    setTouched(allTouched);
    return Object.values(allErrors).every((e) => !e);
  }, [values, runValidation]);

  // ── handleSubmit ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const isValid = validate();
      if (!isValid) return;
      setIsSubmitting(true);
      try {
        await onSubmit?.(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit]
  );

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback((override?: Partial<T>) => {
    const next = { ...initialRef.current, ...override } as T;
    setValuesState(next);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    handleChange,
    handleBlur,
    setFieldValue,
    setValues,
    handleSubmit,
    reset,
    validate,
  };
}

export default useForm;
