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
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    if (mode === 'register' && formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านยืนยันไม่ตรงกัน');
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
          (payload as { message?: string | string[] } | null)?.message ?? 'ไม่สามารถดำเนินการได้';
        throw new Error(Array.isArray(message) ? message[0] : message);
      }

      const data = payload as { token: string } | null;
      if (!data?.token) {
        throw new Error('ไม่พบ token จากเซิร์ฟเวอร์');
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
        <h1>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h1>
        <p className="auth-description">
          {mode === 'login'
            ? 'กรอกอีเมลและรหัสผ่านเพื่อจัดการข้อมูลติดต่อ'
            : 'สร้างบัญชีใหม่เพื่อเริ่มใช้งานสมุดรายชื่อ'}
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            อีเมล
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </label>
          <label>
            รหัสผ่าน
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </label>
          {mode === 'register' && (
            <label>
              ยืนยันรหัสผ่าน
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
              ? 'กำลังดำเนินการ...'
              : mode === 'login'
              ? 'เข้าสู่ระบบ'
              : 'สมัครสมาชิก'}
          </button>
        </form>

        <p className="auth-toggle">
          {mode === 'login' ? (
            <>
              ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
            </>
          ) : (
            <>
              มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
            </>
          )}
        </p>
      </section>
    </main>
  );
};

