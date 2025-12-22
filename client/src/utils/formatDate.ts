const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatToDDMMYYYY(val: any): string {
  if (!val && val !== 0) return '-';
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mon = MONTHS_SHORT[d.getMonth()];
      const yyyy = d.getFullYear();
      return `${dd} ${mon} ${yyyy}`;
    }
  } catch (e) {
    // ignore
  }
  try {
    const m = String(val).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const mon = MONTHS_SHORT[parseInt(m[2]) - 1];
      return `${m[3]} ${mon} ${m[1]}`;
    }
  } catch (e) {
    // ignore
  }
  return String(val);
}

export default formatToDDMMYYYY;
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
