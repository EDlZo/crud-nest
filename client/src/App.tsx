import { FormEvent, useEffect, useState } from 'react';
import './App.css';

type Contact = {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  createdAt?: string;
  updatedAt?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const emptyContact: Contact = {
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
};

function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [formData, setFormData] = useState<Contact>(emptyContact);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/cruds`);
      if (!response.ok) {
        throw new Error('โหลดข้อมูลไม่สำเร็จ');
      }
      const data = await response.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleChange = (key: keyof Contact, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyContact);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
    };

    if (!payload.firstName || !payload.lastName || !payload.phone || !payload.address) {
      setError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      setSubmitting(false);
      return;
    }

    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(
        `${API_BASE_URL}/cruds${isEdit ? `/${editingId}` : ''}`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error('บันทึกข้อมูลไม่สำเร็จ');
      }

      const saved = (await response.json()) as Contact;

      if (isEdit) {
        setContacts((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      } else {
        setContacts((prev) => [saved, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id ?? null);
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone,
      address: contact.address,
      id: contact.id,
    });
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    const confirmed = window.confirm('ยืนยันการลบข้อมูลนี้หรือไม่?');
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/cruds/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('ลบข้อมูลไม่สำเร็จ');
      }
      setContacts((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="app">
      

      <section className="card">
        <h2>{editingId ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</h2>
        <form onSubmit={handleSubmit} className="form">
          <div className="grid">
            <label>
              ชื่อ
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
              />
            </label>
            <label>
              นามสกุล
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
              />
            </label>
            <label>
              เบอร์โทร
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </label>
            <label className="full">
              ที่อยู่
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={3}
              />
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
            </button>
            {editingId && (
              <button type="button" className="secondary" onClick={resetForm}>
                ยกเลิกการแก้ไข
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="list-header">
          <h2>รายการข้อมูล</h2>
          <button className="secondary" onClick={fetchContacts} disabled={loading}>
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>
        {contacts.length === 0 && !loading ? (
          <p>ยังไม่มีข้อมูล ลองเพิ่มรายการใหม่</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ชื่อ-นามสกุล</th>
                  <th>เบอร์โทร</th>
                  <th>ที่อยู่</th>
                  <th>อัปเดตล่าสุด</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <strong>
                        {contact.firstName} {contact.lastName}
                      </strong>
                    </td>
                    <td>{contact.phone}</td>
                    <td>{contact.address}</td>
                    <td>
                      {contact.updatedAt
                        ? new Date(contact.updatedAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="actions-cell">
                      <button onClick={() => handleEdit(contact)}>แก้ไข</button>
                      <button className="danger" onClick={() => handleDelete(contact.id)}>
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;

