"use client";

/**
 * useFormValidation
 *
 * Real-time, field-level form validation hook.
 *
 * Features:
 * - Validates on change (debounced) and on blur (immediate)
 * - Returns per-field state: error | success | default
 * - Keyboard accessible — errors announced via aria-live (handled by FormInput)
 * - Screen-reader friendly: error text is associated via aria-describedby in FormInput
 *
 * Usage:
 *   const { register, getFieldProps, isValid } = useFormValidation(rules);
 *   <FormInput {...getFieldProps("email")} label="Email" />
 */

import { useCallback, useRef, useState } from "react";

import type { FormInputState } from "@/components/ui/FormInput";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldRule = {
  /** Called with the current field value; return an error string or null. */
  validate: (value: string) => string | null;
  /** Help text shown below the field when there is no error/success. */
  helperText?: string;
  /** Success message shown when validation passes (after first interaction). */
  successText?: string;
};

export type FormRules<T extends string> = Record<T, FieldRule>;

type FieldState = {
  value: string;
  touched: boolean;
  error: string | null;
};

type FieldProps = {
  value: string;
  state: FormInputState;
  errorText: string | undefined;
  successText: string | undefined;
  helperText: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: () => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 300;

export function useFormValidation<T extends string>(rules: FormRules<T>) {
  const [fields, setFields] = useState<Record<T, FieldState>>(() => {
    const init = {} as Record<T, FieldState>;
    for (const key of Object.keys(rules) as T[]) {
      init[key] = { value: "", touched: false, error: null };
    }
    return init;
  });

  const timers = useRef<Partial<Record<T, ReturnType<typeof setTimeout>>>>({});

  const validate = useCallback(
    (name: T, value: string): string | null => rules[name].validate(value),
    [rules]
  );

  const handleChange = useCallback(
    (name: T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;

      // Update value immediately; defer validation
      setFields((prev) => ({ ...prev, [name]: { ...prev[name], value } }));

      clearTimeout(timers.current[name]);
      timers.current[name] = setTimeout(() => {
        const error = validate(name, value);
        setFields((prev) => ({
          ...prev,
          [name]: { ...prev[name], error, touched: true },
        }));
      }, DEBOUNCE_MS);
    },
    [validate]
  );

  const handleBlur = useCallback(
    (name: T) => () => {
      clearTimeout(timers.current[name]);
      setFields((prev) => {
        const error = validate(name, prev[name].value);
        return { ...prev, [name]: { ...prev[name], error, touched: true } };
      });
    },
    [validate]
  );

  /** Returns props to spread onto a FormInput for the given field. */
  const getFieldProps = useCallback(
    (name: T): FieldProps => {
      const field = fields[name];
      const rule = rules[name];
      const hasError = field.touched && field.error !== null;
      const hasSuccess = field.touched && field.error === null && field.value.length > 0;

      return {
        value: field.value,
        state: hasError ? "error" : hasSuccess ? "success" : "default",
        errorText: hasError ? field.error ?? undefined : undefined,
        successText: hasSuccess ? (rule.successText ?? "Looks good!") : undefined,
        helperText: !hasError && !hasSuccess ? rule.helperText : undefined,
        onChange: handleChange(name),
        onBlur: handleBlur(name),
      };
    },
    [fields, rules, handleChange, handleBlur]
  );

  /** True when all fields have been touched and have no errors. */
  const isValid = (Object.keys(rules) as T[]).every(
    (name) => fields[name].touched && fields[name].error === null
  );

  /** Programmatically set a field value (e.g. from autofill). */
  const setValue = useCallback(
    (name: T, value: string) => {
      const error = validate(name, value);
      setFields((prev) => ({ ...prev, [name]: { value, touched: true, error } }));
    },
    [validate]
  );

  /** Reset all fields to initial state. */
  const reset = useCallback(() => {
    setFields(() => {
      const init = {} as Record<T, FieldState>;
      for (const key of Object.keys(rules) as T[]) {
        init[key] = { value: "", touched: false, error: null };
      }
      return init;
    });
  }, [rules]);

  return { getFieldProps, isValid, setValue, reset, fields };
}
