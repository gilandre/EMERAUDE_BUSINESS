/**
 * Sanitization des entrées pour prévenir XSS et injections.
 */

import validator from "validator";

export function sanitizeString(value: unknown, maxLength = 1000): string {
  if (value == null) return "";
  const str = String(value).trim();
  return validator.escape(str.slice(0, maxLength));
}

export function sanitizeHtml(value: unknown, maxLength = 10000): string {
  if (value == null) return "";
  const str = String(value).trim();
  return validator.escape(str.slice(0, maxLength));
}

export function sanitizeEmail(value: unknown): string {
  if (value == null) return "";
  const str = String(value).trim().toLowerCase();
  return validator.isEmail(str) ? str : "";
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  stringFields: (keyof T)[],
  maxLength = 1000
): T {
  const result = { ...obj };
  for (const key of stringFields) {
    if (key in result && typeof result[key] === "string") {
      (result as Record<string, unknown>)[key as string] = sanitizeString(
        result[key],
        maxLength
      );
    }
  }
  return result;
}
