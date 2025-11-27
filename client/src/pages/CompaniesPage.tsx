import { FormEvent, useState } from 'react';
import '../App.css';
import { API_BASE_URL } from '../config';

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const CompaniesPage = () => {
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    website: '',
    contactEmail: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name) {
      setError('กรุณากรอกชื่อบริษัท');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(withBase('/companies'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const message = (payload && (payload.message || payload.error)) || 'ไม่สามารถส่งข้อมูลได้';
        throw new Error(Array.isArray(message) ? message[0] : message);
      }
      setSuccess('ส่งข้อมูลเรียบร้อยแล้ว ขอบคุณครับ');
      setForm({ name: '', address: '', phone: '', website: '', contactEmail: '' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-container">
      <section className="card">
        <h1>ส่งข้อมูลบริษัท/องค์กร</h1>
        <p>กรอกข้อมูลบริษัทของคุณเพื่อบันทึกไว้ในระบบ</p>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            ชื่อบริษัท
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            ที่อยู่
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label>
            เบอร์โทร
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            เว็บไซต์
            <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </label>
          <label>
            อีเมลติดต่อ
            <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </label>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <button type="submit" disabled={submitting}>{submitting ? 'กำลังส่ง...' : 'ส่ง'}</button>
        </form>
      </section>
    </main>
  );
};
