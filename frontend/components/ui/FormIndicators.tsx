/**
 * FormIndicators.tsx (issue #895)
 *
 * Shared markers for required and optional form fields so every creator and
 * verifier form marks them the same way.
 *
 * • RequiredIndicator — a red asterisk for sighted users (aria-hidden, so it is
 *   not read twice) plus visually hidden "(required)" text for screen readers.
 * • OptionalIndicator — a visible "(optional)" label, used only when a form
 *   chooses to mark optional fields. Once a form does this, every field should
 *   be marked one way or the other, so an unmarked field is never ambiguous.
 *
 * Place these inside the <label> or <legend> that names the field.
 */

export function RequiredIndicator() {
  return (
    <>
      <span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

export function OptionalIndicator() {
  return (
    <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">(optional)</span>
  );
}
