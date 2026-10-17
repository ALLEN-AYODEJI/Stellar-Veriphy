"use client";

/**
 * useFieldValidation.ts
 *
 * Single-field validation hook with debounced onChange and immediate onBlur.
 *
 * Features
 * ────────
 * • Validate-on-change (debounced, configurable delay)
 * • Validate-on-blur (immediate)
 * • Returns field state compatible with FormInput (state, errorText, successText)
 * • Composable: use standalone or via useForm for multi-field forms
 * • Async validators supported — returns a Promise<string | null>
 *
 * Usage
 * ─────
 *   const email = useFieldValidation({
 *     validate: (v) => (/\S+@\S+\.\S+/.test(v) ? null : "Invalid email"),
 *     successText: "Email looks good!",
 *     helperText: "We will never share your email.",
 *   });
 *
 *   <FormInput
 *     label="Email"
 *     value={email.value}
 *     {...email.inputProps}
 *   />
 */

import { useCallback, useRef, useState } from "react";

import type { FormInputState } from "@/components/ui/FormInput";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncValidator = (value: string) => string | null;
export type AsyncValidator = (value: string) => Promise<string | null>;

export interface UseFieldValidationOptions {
  /** Synchronous or asynchronous validation function. */
  validate: SyncValidator | AsyncValidator;
  /** Debounce delay for onChange validation (ms). Default: 300. */
  debounceMs?: number;
  /** Help text shown below the field when there is no error or success. */
  helperText?: string;
  /** Message shown when the field is valid (after first interaction). */
  successText?: string;
}

export interface FieldValidationReturn {
  value: string;
  /** Whether the field has been interacted with (blurred or changed). */
  touched: boolean;
  /** Current validation error, or null when valid. */
  error: string | null;
  /** Whether an async validation is in flight. */
  isValidating: boolean;
  /**
   * Props to spread directly onto a <FormInput> or <input>.
   * Includes value, onChange, onBlur, state, errorText, successText, helperText.
   */
  inputProps: {
    value: string;
    state: FormInputState;
    errorText: string | undefined;
    successText: string | undefined;
    helperText: string | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
  };
  /** Programmatically set the field value (triggers validation). */
  setValue: (value: string) => void;
  /** Reset field to empty, untouched state. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFieldValidation({
  validate,
  debounceMs = 300,
  helperText,
  successText,
}: UseFieldValidationOptions): FieldValidationReturn {
  const [value, setValue_] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Abort stale async validations
  const validationSeq = useRef(0);

  const runValidate = useCallback(
    async (val: string) => {
      const seq = ++validationSeq.current;
      const result = validate(val);
      if (result instanceof Promise) {
        setIsValidating(true);
        try {
          const err = await result;
          // Ignore stale results
          if (seq === validationSeq.current) {
            setError(err);
            setIsValidating(false);
          }
        } catch {
          if (seq === validationSeq.current) {
            setError("Validation failed");
            setIsValidating(false);
          }
        }
      } else {
        setError(result);
      }
    },
    [validate]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.value;
      setValue_(val);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setTouched(true);
        void runValidate(val);
      }, debounceMs);
    },
    [runValidate, debounceMs]
  );

  const handleBlur = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setTouched(true);
    void runValidate(value);
  }, [runValidate, value]);

  const setValue = useCallback(
    (val: string) => {
      setValue_(val);
      setTouched(true);
      void runValidate(val);
    },
    [runValidate]
  );

  const reset = useCallback(() => {
    setValue_("");
    setTouched(false);
    setError(null);
    setIsValidating(false);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  // Derive FormInput-compatible state
  const hasError = touched && error !== null;
  const hasSuccess = touched && error === null && value.length > 0 && !isValidating;
  const inputState: FormInputState = hasError ? "error" : hasSuccess ? "success" : "default";

  return {
    value,
    touched,
    error,
    isValidating,
    inputProps: {
      value,
      state: inputState,
      errorText: hasError ? (error ?? undefined) : undefined,
      successText: hasSuccess ? (successText ?? "Looks good!") : undefined,
      helperText: !hasError && !hasSuccess ? helperText : undefined,
      onChange: handleChange,
      onBlur: handleBlur,
    },
    setValue,
    reset,
  };
}

export default useFieldValidation;
