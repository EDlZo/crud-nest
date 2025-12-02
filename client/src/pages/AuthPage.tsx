import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaUser, FaUserCircle } from 'react-icons/fa';
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
    firstName: '',
    lastName: '',
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
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
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
        </form>

        <div className="auth-divider">
          <span></span>
        </div>

        <p className="auth-toggle">
          {mode === 'login' ? (
            <>
              Don't have an account? <Link to="/register">Register</Link>
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

