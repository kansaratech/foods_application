// Server-side email sanity check. Mirrors the clients' `isValidEmail` so a
// bogus address like `x@gmail` (no real TLD) can't slip past a form and get an
// invite / OTP sent to it (#41).

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
