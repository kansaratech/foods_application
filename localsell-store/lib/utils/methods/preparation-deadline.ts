/** Support saved minute durations and older absolute preparation deadlines. */
export function preparationDeadline(
  preparationTime?: string | null,
  acceptedAt?: string | null,
): number | null {
  const value = preparationTime?.trim();
  if (!value) return null;
  if (/^\d+(\.\d+)?$/.test(value)) {
    const minutes = Number(value);
    // Older clients may have persisted a Unix millisecond deadline.
    if (minutes > 1e12) return minutes;
    if (!acceptedAt) return null;
    const accepted = /^\d+$/.test(acceptedAt)
      ? Number(acceptedAt)
      : Date.parse(acceptedAt);
    return Number.isFinite(accepted) ? accepted + minutes * 60000 : null;
  }
  const deadline = Date.parse(value);
  return Number.isFinite(deadline) ? deadline : null;
}
