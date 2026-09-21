/**
 * Shared submit-helper for all react-hook-form forms.
 *
 * Some browsers / password managers fill inputs without firing React change
 * events, leaving RHF state empty ("... is required") even though the fields
 * look filled. This merges the live DOM values in as a fallback:
 * for every field whose RHF value is empty, the actual input value is used.
 */
export function fillFromDom<T extends Record<string, unknown>>(
  values: T,
  event?: { target?: unknown },
): T {
  try {
    const target = event?.target as Element | undefined;
    const form =
      target instanceof HTMLFormElement
        ? target
        : target?.closest?.("form") ?? null;
    if (!form) return values;

    const out: Record<string, unknown> = { ...values };
    const fd = new FormData(form);
    fd.forEach((domValue, key) => {
      const current = out[key];
      if (current === "" || current === undefined || current === null) {
        const input = form.elements.namedItem(key);
        if (
          input instanceof HTMLInputElement &&
          (input.type === "checkbox" || input.type === "radio")
        ) {
          out[key] = input.checked;
        } else {
          out[key] = domValue;
        }
      }
    });
    return out as T;
  } catch {
    return values;
  }
}
