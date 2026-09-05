// The phone field stores whatever `react-international-phone` hands back
// (e.g. "+91 98765 43210"), so both validation and submission need to reduce
// that down to the bare 10-digit Indian mobile number the API expects.
export const extractIndianMobileDigits = (raw?: string | null): string => {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

export const isValidIndianMobile = (raw?: string | null): boolean =>
  /^[6-9]\d{9}$/.test(extractIndianMobileDigits(raw));
