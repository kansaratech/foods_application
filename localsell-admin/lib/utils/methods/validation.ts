// Shared client-side validation for the admin registration / edit forms.
// Yup's built-in `.email()` accepts `x@gmail` and `x@gmailcom` (no real TLD),
// which let QA "verify" a bogus address (#41). This is the stricter rule,
// mirroring the customer web app's `isValidEmail`.

/**
 * Requires a real domain: `local@domain.tld` with a 2+ character alphabetic
 * TLD. Rejects `x@gmail`, `x@gmailcom`, `x@a.b`, blank labels and `..`.
 */
export function isValidEmail(email?: string | null): boolean {
  const value = (email ?? '').trim();
  if (!value || value.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return false;

  const domain = value.slice(value.indexOf('@') + 1);
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }

  const labels = domain.split('.');
  if (labels.some((label) => label.length === 0)) return false;
  if (!/^[A-Za-z]{2,}$/.test(labels[labels.length - 1])) return false;

  return true;
}
