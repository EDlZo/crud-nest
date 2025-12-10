import { API_BASE_URL } from '../config';
import { AuthUser } from '../context/AuthContext';

export async function fetchProfile(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      userId: data.userId || data.id || '',
      email: data.email,
      role: data.role,
      avatarUrl: data.avatarUrl,
    };
  } catch {
    return null;
  }
}
