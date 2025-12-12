// Lightweight date formatter used across the client.
// Accepts ISO strings, numeric timestamps, Date objects, and Firestore-like timestamp objects
// (e.g. { seconds, nanoseconds } or { _seconds, _nanoseconds }).
export function formatDateTime(value?: string | number | Date | any): string {
  if (!value) return '-';

  let date: Date | null = null;

  if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  } else if (value && (value.seconds || value._seconds)) {
    // Firestore timestamp object
    const seconds = value.seconds ?? value._seconds;
    const nanos = value.nanoseconds ?? value._nanoseconds ?? 0;
    date = new Date(seconds * 1000 + Math.round(nanos / 1e6));
  }

  if (!date || isNaN(date.getTime())) return '-';

  // Use the user's locale by default; show date and time (no seconds) and short month.
  try {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    // Fallback
    return date.toISOString();
  }
}

export default formatDateTime;
