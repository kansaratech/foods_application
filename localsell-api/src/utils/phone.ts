/**
 * Phone helpers. This launch is India-only, so a "phone number" is a 10-digit
 * Indian mobile (starts 6-9). We store it canonically as `+91XXXXXXXXXX` no
 * matter how the client formatted it (`+91 95525-52371`, `09552552371`, …).
 */

/** Reduce any input to its bare 10-digit Indian mobile, or '' if it isn't one. */
export function indianMobile10(raw?: string | null): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  let ten = digits;
  if (ten.length === 12 && ten.startsWith('91')) ten = ten.slice(2);
  else if (ten.length === 11 && ten.startsWith('0')) ten = ten.slice(1);
  return /^[6-9]\d{9}$/.test(ten) ? ten : '';
}

export function isValidIndianMobile(raw?: string | null): boolean {
  return indianMobile10(raw) !== '';
}

/**
 * Canonical storage form. Returns `+91XXXXXXXXXX` for a valid Indian mobile,
 * otherwise the trimmed input untouched (so partially-entered / non-IN values
 * still round-trip and validation elsewhere can reject them).
 */
export function normalizeIndianPhone(raw?: string | null): string | undefined {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return undefined;
  const ten = indianMobile10(trimmed);
  return ten ? `+91${ten}` : trimmed;
}
