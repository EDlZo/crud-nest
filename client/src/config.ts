const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  (import.meta.env.DEV ? '' : window.location.origin);

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

