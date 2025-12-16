const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
// In dev, default to backend at localhost:3000 when not provided
const defaultDev = 'http://localhost:3000';
const rawBaseUrl = envUrl || (import.meta.env.DEV ? defaultDev : window.location.origin);

export const API_BASE_URL = (rawBaseUrl || '').replace(/\/$/, '');

