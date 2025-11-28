import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FaCog, FaTrash } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type Contact = {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  userEmail?: string;
  updatedByEmail?: string;
};

const emptyContact: Contact = {
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const ContactsPage = () => {
  const { token, user, logout } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [formData, setFormData] = useState<Contact>(emptyContact);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const performLogout = () => {
    setContacts([]);
    logout();
  };

  const handleUnauthorized = () => {
    setError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    performLogout();
  };

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(withBase('/cruds'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (response.status === 403) {
        throw new Error('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
      }
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }
      const data = await response.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleChange = (key: keyof Contact, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyContact);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
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
        withBase(`/cruds${isEdit ? `/${editingId}` : ''}`),
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (response.status === 403) {
        throw new Error('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้');
      }

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
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
    if (!token || !id) return;
    const confirmed = window.confirm('ยืนยันการลบข้อมูลนี้หรือไม่?');
    if (!confirmed) return;

    try {
      const response = await fetch(withBase(`/cruds/${id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (response.status === 403) {
        throw new Error('คุณไม่มีสิทธิ์ลบข้อมูลนี้');
      }
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
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
    <div className="container-fluid">
      {/* Page Heading */}
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">สมุดรายชื่อ</h1>
        <button className="btn btn-sm btn-secondary shadow-sm" onClick={performLogout}>
          <i className="fas fa-sign-out-alt fa-sm text-white-50"></i> ออกจากระบบ
        </button>
      </div>

      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">{editingId ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</h6>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">ชื่อ</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">นามสกุล</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">เบอร์โทร</label>
                <input
                  type="tel"
                  className="form-control"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="col-md-12 mb-3">
                <label className="form-label">ที่อยู่</label>
                <textarea
                  className="form-control"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มข้อมูล'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  ยกเลิกการแก้ไข
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow mb-4">
        <div className="card-header py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">รายการข้อมูล</h6>
          <button className="btn btn-sm btn-info shadow-sm" onClick={fetchContacts} disabled={loading}>
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>
        <div className="card-body">
          {contacts.length === 0 && !loading ? (
            <p className="text-center">ยังไม่มีข้อมูล ลองเพิ่มรายการใหม่</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered" width="100%" cellSpacing={0}>
                <thead>
                  <tr>
                    <th>ชื่อ-นามสกุล</th>
                    <th>เบอร์โทร</th>
                    <th>ที่อยู่</th>
                    <th>ผู้เพิ่ม (email)</th>
                    <th>ผู้แก้ล่าสุด (email)</th>
                    <th>อัปเดตล่าสุด</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => {
                    const canModify =
                      user?.role === 'admin' || user?.role === 'superadmin' || contact.userId === user?.userId;
                    return (
                      <tr key={contact.id}>
                        <td>
                          <strong>
                            {contact.firstName} {contact.lastName}
                          </strong>
                        </td>
                        <td>{contact.phone}</td>
                        <td>{contact.address}</td>
                        <td>{contact.userEmail ?? '-'}</td>
                        <td>{contact.updatedByEmail ?? '-'}</td>
                        <td>
                          {contact.updatedAt ? new Date(contact.updatedAt).toLocaleString() : '-'}
                        </td>
                        <td>
                          {canModify ? (
                              <div className="btn-group">
                                <button className="btn btn-sm btn-warning" aria-label="edit" title="แก้ไข" onClick={() => handleEdit(contact)}>
                                  <FaCog />
                                </button>
                                <button className="btn btn-sm btn-danger" aria-label="delete" title="ลบ" onClick={() => handleDelete(contact.id)}>
                                  <FaTrash />
                                </button>
                              </div>
                            ) : (
                              <span className="badge bg-secondary">ไม่มีสิทธิ์</span>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

