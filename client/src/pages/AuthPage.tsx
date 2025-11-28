import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'login' | 'register';

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const AuthPage = ({ mode }: { mode: AuthMode }) => {
  const navigate = useNavigate();
  const { login, token } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-container">
      <section className="card auth-card">
        <h1>{mode === 'login' ? 'Login' : 'Register'}</h1>
        <p className="auth-description">
          {mode === 'login'
            ? 'Enter your email and password to manage contacts'
            : 'Create a new account to start using the contact book'}
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </label>
          {mode === 'register' && (
            <label>
              Confirm Password
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
              />
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting
              ? 'Submitting...'
              : mode === 'login'
              ? 'Login'
              : 'Register'}
          </button>
        </form>

        <p className="auth-toggle">
          {mode === 'login' ? (
            <>
              No account? <Link to="/register">Register</Link>
            </>
          ) : (
            <>
              Already have an account? <Link to="/login">Login</Link>
            </>
          )}
        </p>
      </section>
    </main>
  );
};

