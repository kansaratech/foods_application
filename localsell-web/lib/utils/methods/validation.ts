// Shared client-side validation for the auth / registration forms.
// One source of truth so web + partner (rider/restaurant) forms agree.

/**
 * Requires a real domain: `local@domain.tld` with a 2+ character TLD.
 * Rejects `x@gmail`, `x@gmailcom`, `x@a.b`, and addresses with a bare/blank
 * domain label or consecutive dots.
 */
export function isValidEmail(email?: string | null): boolean {
  const value = (email ?? "").trim();
  if (!value || value.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return false;

  const domain = value.slice(value.indexOf("@") + 1);
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes(".."))
    return false;

  // Every dot-separated label must be non-empty and the TLD must be alphabetic.
  const labels = domain.split(".");
  if (labels.some((label) => label.length === 0)) return false;
  if (!/^[A-Za-z]{2,}$/.test(labels[labels.length - 1])) return false;

  return true;
}

export interface PasswordChecks {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

/** Minimum length for a "strong" password. */
export const PASSWORD_MIN_LENGTH = 8;

export function getPasswordChecks(password?: string | null): PasswordChecks {
  const value = password ?? "";
  return {
    length: value.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(value),
    uppercase: /[A-Z]/.test(value),
    number: /\d/.test(value),
    // any non-alphanumeric, non-whitespace character counts as "special"
    special: /[^A-Za-z0-9\s]/.test(value),
  };
}

/**
 * Strong password: at least {@link PASSWORD_MIN_LENGTH} characters and one each
 * of lowercase, uppercase, digit and special character.
 */
export function isStrongPassword(password?: string | null): boolean {
  return Object.values(getPasswordChecks(password)).every(Boolean);
}
