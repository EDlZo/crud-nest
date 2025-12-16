import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaUser, FaUserCircle } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { fetchProfile } from '../utils/fetchProfile';

type AuthMode = 'login' | 'register';

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const AuthPage = ({ mode }: { mode: AuthMode }) => {
  const navigate = useNavigate();
  const { login, token, setUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Role presets for quick login during development/testing.
  // Update these values to match accounts in your dev environment.
  const rolePresets: Record<string, { email: string; password: string }> = {
    superadmin: { email: 'purin.keuasakul@gmail.com', password: '123456789' },
    admin: { email: 'purin.k@rmutsvmail.com', password: '123456789' },
    guest: { email: 'dewhaha061@gmail.com', password: '123456789' },
  };

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formData.email || !formData.password) {
      setError('Please enter email and password');
      return;
    }

    if (mode === 'register' && formData.password !== formData.confirmPassword) {
      setError('Password confirmation does not match');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const response = await fetch(withBase(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          ...(mode === 'register' && {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
          }),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
          const message =
            (payload as { message?: string | string[] } | null)?.message ?? 'Unable to complete request';
        throw new Error(Array.isArray(message) ? message[0] : message);
      }

      const data = payload as { token: string } | null;
      if (!data?.token) {
        throw new Error('No token received from server');
      }
      login(data.token);
      // Fetch profile and set avatarUrl in context
      const profile = await fetchProfile(data.token);
      if (profile) setUser(profile);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const fillPreset = (key: string) => {
    const preset = rolePresets[key];
    if (!preset) return;
    setFormData((s) => ({ ...s, email: preset.email, password: preset.password }));
    setSelectedRole(key);
    setError(null);
  };

  return (
    <main className="auth-container">
      <div className="auth-background-decoration"></div>
      <section className="card auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <FaUserCircle className="auth-icon" />
          </div>
          <h1>{mode === 'login' ? 'Welcome' : 'Create Account'}</h1>
        <p className="auth-description">
          {mode === 'login'
              ? 'Sign in to manage your data'
              : 'Fill in your information to create a new account'}
        </p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FaUser className="input-icon" />
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>
                  <FaUser className="input-icon" />
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
          )}
          <div className="form-group">
          <label>
              <FaEnvelope className="input-icon" />
            Email
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="form-group">
          <label>
              <FaLock className="input-icon" />
            Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          {mode === 'register' && (
            <div className="form-group">
            <label>
                <FaLock className="input-icon" />
              Confirm Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
              />
            </div>
          )}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}
          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner"></span>
                <span>Processing...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In' : 'Register'}</span>
            )}
          </button>

          {mode === 'login' && (
            <div
              className="form-group role-presets-row"
              style={{ marginTop: 18, textAlign: 'center' }}
            >
              <div style={{ fontWeight: 400, color: '#888', fontSize: 14, marginBottom: 8, letterSpacing: 0.2 }}>Quick login</div>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
                <button
                  type="button"
                  className="quick-login-btn"
                  style={{
                    border: selectedRole === 'superadmin' ? '2px solid #2563eb' : '1.5px solid #d1d5db',
                    background: selectedRole === 'superadmin' ? '#e0e7ef' : '#fff',
                    color: selectedRole === 'superadmin' ? '#1e293b' : '#64748b',
                    borderRadius: 18,
                    padding: '7px 22px',
                    fontWeight: selectedRole === 'superadmin' ? 700 : 500,
                    fontSize: 15,
                    transition: 'all 0.18s',
                    boxShadow: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = selectedRole === 'superadmin' ? '#dbeafe' : '#f3f4f6')}
                  onMouseOut={e => (e.currentTarget.style.background = selectedRole === 'superadmin' ? '#e0e7ef' : '#fff')}
                  onClick={() => fillPreset('superadmin')}
                >
                  Superadmin
                </button>
                <button
                  type="button"
                  className="quick-login-btn"
                  style={{
                    border: selectedRole === 'admin' ? '2px solid #2563eb' : '1.5px solid #d1d5db',
                    background: selectedRole === 'admin' ? '#e0e7ef' : '#fff',
                    color: selectedRole === 'admin' ? '#1e293b' : '#64748b',
                    borderRadius: 18,
                    padding: '7px 22px',
                    fontWeight: selectedRole === 'admin' ? 700 : 500,
                    fontSize: 15,
                    transition: 'all 0.18s',
                    boxShadow: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = selectedRole === 'admin' ? '#dbeafe' : '#e0e7ef')}
                  onMouseOut={e => (e.currentTarget.style.background = selectedRole === 'admin' ? '#e0e7ef' : '#fff')}
                  onClick={() => fillPreset('admin')}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className="quick-login-btn"
                  style={{
                    border: selectedRole === 'guest' ? '2px solid #2563eb' : '1.5px solid #d1d5db',
                    background: selectedRole === 'guest' ? '#f1f5f9' : '#fff',
                    color: selectedRole === 'guest' ? '#1e293b' : '#64748b',
                    borderRadius: 18,
                    padding: '7px 22px',
                    fontWeight: selectedRole === 'guest' ? 700 : 500,
                    fontSize: 15,
                    transition: 'all 0.18s',
                    boxShadow: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = selectedRole === 'guest' ? '#e5e7eb' : '#f1f5f9')}
                  onMouseOut={e => (e.currentTarget.style.background = selectedRole === 'guest' ? '#f1f5f9' : '#fff')}
                  onClick={() => fillPreset('guest')}
                >
                  Guest
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="auth-divider">
          <span></span>
        </div>

        <p className="auth-toggle">
          {mode === 'login' ? (
            <>
              Don'tff have an account? <Link to="/register">Register</Link>
            </>
          ) : (
            <>
              Already have an account? <Link to="/login">Sign In</Link>
            </>
          )}
        </p>
      </section>
    </main>
  );
};

