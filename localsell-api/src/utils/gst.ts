import { userInputError } from './errors';

export const GST_REGISTRATION_TYPES = ['REGULAR', 'COMPOSITION', 'UNREGISTERED'] as const;
export type GstRegistrationType = (typeof GST_REGISTRATION_TYPES)[number];

// Standard 15-character GSTIN structure: 2-digit state code, 10-char PAN,
// 1-digit entity code, 'Z' by convention, 1-char checksum. Mirrors the regex
// in localsell-admin/lib/utils/schema/vendor.ts — kept in sync there since
// client-side validation is a UX nicety, not a substitute for this check.
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function normalizeGstRegistrationType(value: string | null | undefined): GstRegistrationType {
  if (!value) return 'UNREGISTERED';
  const upper = value.toUpperCase();
  if (!GST_REGISTRATION_TYPES.includes(upper as GstRegistrationType)) {
    throw userInputError(`gstRegistrationType must be one of ${GST_REGISTRATION_TYPES.join(', ')}`);
  }
  return upper as GstRegistrationType;
}

/** A Regular or Composition dealer must have a valid-format GSTIN; Unregistered must not need one. */
export function assertGstinRequiredFor(type: GstRegistrationType, gstin: string | null | undefined): void {
  if (type === 'UNREGISTERED') return;
  if (!gstin || !GSTIN_REGEX.test(gstin.toUpperCase())) {
    throw userInputError('A valid 15-character GSTIN is required for a GST Regular or Composition store.');
  }
}
