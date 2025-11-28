import { API_BASE_URL } from '../config';

type FetchOptions = RequestInit | undefined;

export async function apiFetch(path: string, options?: FetchOptions) {
  const full = `${API_BASE_URL}${path}`;
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
