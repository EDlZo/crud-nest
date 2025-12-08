type FetchOptions = RequestInit | undefined;

function getApiBase() {
  // runtime override from localStorage (key: API_BASE_URL_OVERRIDE)
  if (typeof window !== 'undefined') {
    const override = window.localStorage.getItem('API_BASE_URL_OVERRIDE');
    if (override && override.trim()) return override.trim().replace(/\/$/, '');
  }

  const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, '');

  if (import.meta.env.DEV) return '/api';

  // fallback to current origin in production (may be misconfigured)
  if (typeof window !== 'undefined') return window.location.origin.replace(/\/$/, '');

  return '';
}

export async function apiFetch(path: string, options?: FetchOptions) {
  const base = getApiBase();
  const full = `${base}${path}`;
  const res = await fetch(full, options);

  const contentType = res.headers.get('content-type') || '';

  // Non-ok: try to extract message for better errors
  if (!res.ok) {
    const body = contentType.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => null);
    const message = typeof body === 'string' ? body : (body && (body.message || JSON.stringify(body))) || res.statusText;
    throw new Error(message);
  }

  // If JSON, parse and return
  if (contentType.includes('application/json')) {
    return res.json();
  }

  // For successful non-JSON responses return the raw text (caller can decide how to handle)
  const text = await res.text().catch(() => '');
  return text;
}

export default apiFetch;
