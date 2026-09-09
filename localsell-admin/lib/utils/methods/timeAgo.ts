// Accepts an epoch (ms or seconds), an ISO string, or a Date. The web
// notification feed passes an ISO string — `+isoString` was `NaN`, which
// rendered as "Invalid date" (#51).
export const timeAgo = (input: number | string | Date): string => {
  let date: Date;

  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'number') {
    // Treat 10-digit values as seconds, 13-digit as milliseconds.
    date = new Date(input < 1e12 ? input * 1000 : input);
  } else if (typeof input === 'string' && input.trim()) {
    const numeric = Number(input);
    date = Number.isFinite(numeric)
      ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
      : new Date(input);
  } else {
    return 'Invalid date';
  }

  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);

  return `${years}y ago`;
};
