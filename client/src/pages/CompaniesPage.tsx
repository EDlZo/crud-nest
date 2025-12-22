import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FaEye, FaEllipsisV, FaPlus } from 'react-icons/fa';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import '../App.css';
import provincesFallback from '../data/thailand-provinces.json';
import localThailandHierarchy from '../data/thailand-hierarchy.json';
import fullThailandHierarchy from '../data/thailand-hierarchy-full.json';
import thailandFlat from '../data/thailand-hierarchy-full.flat.json';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { getAvatarColor } from '../utils/avatarColor';

type Company = {
  id?: string;
  type: 'individual' | 'company';
  name: string;
  address?: string;
  zipcode?: string;
  province?: string;
  amphoe?: string;
  tambon?: string;
  phone?: string;
  fax?: string;
  taxId?: string;
  branchName?: string;
  branchNumber?: string;
  billingDate?: string; // วันที่เรียกเก็บเงิน (1-31)
  notificationDate?: string; // วันที่แจ้งเตือนล่วงหน้า (1-31)
  amountDue?: number;
  billingCycle?: 'monthly' | 'yearly' | 'quarterly';
  subscription?: {
    planId?: string;
    planName?: string;
    status?: string;
    interval?: 'monthly' | 'yearly' | 'quarterly';
    amount?: number;
    startDate?: string;
    nextBillingDate?: string;
    autoRenew?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
  ownerUserId?: string;
  ownerEmail?: string;
  updatedByEmail?: string;
  contacts?: string[];
  avatarUrl?: string;
  openDealsAmount?: number;
};

const emptyCompany: Company = {
  type: 'company',
  name: '',
  address: '',
  zipcode: '',
  province: '',
  amphoe: '',
  tambon: '',
  phone: '',
  fax: '',
  taxId: '',
  branchName: '',
  branchNumber: '',
  billingDate: '',
  notificationDate: '',
  billingCycle: 'monthly',
  contacts: [],
  subscription: {
    interval: 'monthly',
    amount: 0,
    autoRenew: true,
  },
  avatarUrl: '',
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const CompaniesPage = () => {
  // Inline edit state for amountDue, billingDate, notificationDate
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const startInlineEdit = (company: Company, field: string) => {
    setEditingId(company.id ?? null);
    setEditField(field);
    setEditValue(field === 'amountDue' ? (company.amountDue?.toString() ?? '') : (company[field as keyof Company]?.toString() ?? ''));
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditField(null);
    setEditValue('');
  };

  const saveInlineField = async (company: Company, field: string) => {
    if (!company.id || !token) return;
    let value: any = editValue;
    if (field === 'amountDue') value = parseFloat(editValue);
    if ((field === 'billingDate' || field === 'notificationDate') && (parseInt(editValue) < 1 || parseInt(editValue) > 31)) return;
    try {
      const res = await fetch(withBase(`/companies/${company.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCompanies((prev) => prev.map((c) => (c.id === company.id ? updated : c)));
        cancelInlineEdit();
      }
    } catch (err) {
      // handle error
    }
  };
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  // If not authenticated, force landing to login
  useEffect(() => {
    if (token === null) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState<Company>(emptyCompany);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [contacts, setContacts] = useState<any[]>([]);
  const [billingSums, setBillingSums] = useState<Record<string, number>>({});
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const performLogout = () => {
    setCompanies([]);
    logout();
  };

  const handleUnauthorized = () => {
    setError('Session expired. Please log in again');
    performLogout();
  };

  const fetchCompanies = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(withBase('/companies'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (response.status === 403) {
        throw new Error('You do not have permission to access this resource');
      }
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }
      const data = await response.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // After companies are loaded, fetch billing sums per company
  useEffect(() => {
    if (!token || companies.length === 0) return;

    const controller = new AbortController();

    const fetchSums = async () => {
      const map: Record<string, number> = {};
      await Promise.all(
        companies.map(async (c) => {
          if (!c.id) return;
          try {
            const res = await fetch(withBase(`/billing-records/company/${c.id}`), {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            });
            if (!res.ok) return;
            const data = await res.json();
            if (!Array.isArray(data)) return;
            const sum = data.reduce((s: number, item: any) => {
              const a = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0;
              return s + (isNaN(a) ? 0 : a);
            }, 0);
            map[c.id!] = sum;
          } catch (err) {
            // ignore per-company errors
          }
        })
      );
      setBillingSums(map);
    };

    fetchSums();
    return () => controller.abort();
  }, [companies, token]);

  // fetch contacts list for use in adding contacts to a company
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(withBase('/cruds'), { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setContacts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Listen for contact changes from other pages (e.g., after deleting a contact)
  useEffect(() => {
    const handler = () => {
      fetchContacts();
    };
    window.addEventListener('contacts:changed', handler as EventListener);
    return () => window.removeEventListener('contacts:changed', handler as EventListener);
  }, [fetchContacts]);

  const handleChange = (key: keyof Company, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleZipcodeChange = (zip: string) => {
    handleChange('zipcode', zip);
    if (zip.length === 5) {
      const match = (thailandFlat as any[]).find((r) => r.zipcode.toString() === zip);
      if (match) {
        setFormData((prev) => ({
          ...prev,
          province: match.province,
          amphoe: match.amphoe,
          tambon: match.district,
          zipcode: zip,
        }));
      }
    }
  };

  const handleSubscriptionChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      subscription: {
        ...(prev.subscription || {}),
        [key]: value,
      },
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyCompany);
    setPhotoPreview('');
  };

  const [thailandHierarchy, setThailandHierarchy] = useState<any[] | null>(null);

  const extractThaiPartsFromAddress = (addr?: string) => {
    if (!addr || typeof addr !== 'string') return { tambon: '', amphoe: '', province: '' };
    const s = addr.replace(/\s+/g, ' ').trim();
    const tambonMatch = s.match(/(?:ต(?:\.|ำบล)?\s*)([ก-๙\-\s\u0E00-\u0E7F]+)/);
    const amphoeMatch = s.match(/(?:อ(?:\.|ำเภอ)?\s*)([ก-๙\-\s\u0E00-\u0E7F]+)/);
    const provinceMatch = s.match(/(?:จ(?:\.|ังหวัด)?\s*)([ก-๙\-\s\u0E00-\u0E7F]+)/);
    const clean = (m?: RegExpMatchArray | null) => (m && m[1] ? m[1].trim().replace(/\s+/g, ' ') : '');
    return { tambon: clean(tambonMatch), amphoe: clean(amphoeMatch), province: clean(provinceMatch) };
  };

  const inferPartsByLookup = (addr?: string) => {
    if (!addr || !Array.isArray(thailandHierarchy)) return { tambon: '', amphoe: '', province: '' };
    const s = addr.replace(/\s+/g, '');
    for (const prov of thailandHierarchy) {
      const pname = (prov.name || prov.province || prov.province_name || '').toString();
      const provClean = pname.replace(/\s+/g, '');
      if (provClean && s.includes(provClean)) {
        if (Array.isArray(prov.amphoes)) {
          for (const a of prov.amphoes) {
            const aname = (a.name || a.amphoe || '').toString().replace(/\s+/g, '');
            if (aname && s.includes(aname)) {
              if (Array.isArray(a.tambons)) {
                for (const t of a.tambons) {
                  const tname = (typeof t === 'string' ? t : (t.name || t.tambon || '')).toString().replace(/\s+/g, '');
                  if (tname && s.includes(tname)) {
                    return { tambon: (typeof t === 'string' ? t : t.name || t.tambon || '') as string, amphoe: a.name || a.amphoe || '', province: pname };
                  }
                }
              }
              return { tambon: '', amphoe: a.name || a.amphoe || '', province: pname };
            }
          }
        }
        return { tambon: '', amphoe: '', province: pname };
      }
    }
    return { tambon: '', amphoe: '', province: '' };
  };

  const fetchThailandHierarchy = useCallback(async () => {
    setThailandHierarchy(null);
    try {
      const response = await fetch(withBase('/thailand/hierarchy'));
      if (!response.ok) {
        let fallback: any = Array.isArray(fullThailandHierarchy) ? fullThailandHierarchy : (Array.isArray(localThailandHierarchy) ? localThailandHierarchy : provincesFallback);
        if (Array.isArray(fallback) && fallback.length > 0 && fallback[0].province && fallback[0].amphoe && fallback[0].district) {
          const map: any = {};
          fallback.forEach((r: any) => {
            const prov = r.province;
            const amph = r.amphoe;
            const tamb = r.district;
            if (!map[prov]) map[prov] = { name: prov, amphoes: {} };
            if (!map[prov].amphoes[amph]) map[prov].amphoes[amph] = { name: amph, tambons: [] };
            if (tamb && !map[prov].amphoes[amph].tambons.includes(tamb)) map[prov].amphoes[amph].tambons.push(tamb);
          });
          fallback = Object.values(map).map((pv: any) => ({ name: pv.name, amphoes: Object.values(pv.amphoes) }));
        }
        setThailandHierarchy(fallback);
        return;
      }
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setThailandHierarchy(data);
        return;
      }
      setThailandHierarchy(Array.isArray(fullThailandHierarchy) ? fullThailandHierarchy : (Array.isArray(localThailandHierarchy) ? localThailandHierarchy : provincesFallback));
    } catch (err) {
      setThailandHierarchy(Array.isArray(fullThailandHierarchy) ? fullThailandHierarchy : (Array.isArray(localThailandHierarchy) ? localThailandHierarchy : provincesFallback));
    }
  }, []);

  useEffect(() => { fetchThailandHierarchy(); }, [fetchThailandHierarchy]);

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);

    const payload: any = {
      type: formData.type || undefined,
      name: formData.name.trim(),
      address: formData.address?.trim() || undefined,
      zipcode: formData.zipcode?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      fax: formData.fax?.trim() || undefined,
      taxId: formData.taxId?.trim() || undefined,
      notificationDate: formData.notificationDate || undefined,
      billingCycle: formData.billingCycle || undefined,
      avatarUrl: formData.avatarUrl || undefined,
    };

    // attach subscription if provided
    if (formData.subscription && (formData.subscription.planName || formData.subscription.amount)) {
      payload.subscription = {
        planId: formData.subscription.planId || undefined,
        planName: formData.subscription.planName || undefined,
        interval: formData.subscription.interval || undefined,
        amount: typeof formData.subscription.amount === 'number' ? formData.subscription.amount : undefined,
        nextBillingDate: formData.subscription.nextBillingDate || undefined,
        autoRenew: typeof formData.subscription.autoRenew === 'boolean' ? formData.subscription.autoRenew : undefined,
      };
    }

    // เพิ่ม branch fields เฉพาะเมื่อเป็น company
    if (formData.type === 'company') {
      payload.branchName = formData.branchName?.trim() || undefined;
      payload.branchNumber = formData.branchNumber?.trim() || undefined;
    }

    // Attach province/amphoe/tambon: prefer selects, otherwise try to infer from address
    if (formData.province) payload.province = formData.province;
    if (formData.amphoe) payload.amphoe = formData.amphoe;
    if (formData.tambon) payload.tambon = formData.tambon;
    if (formData.zipcode) payload.zipcode = formData.zipcode;
    if (!payload.province || !payload.amphoe) {
      const inferred = inferPartsByLookup(formData.address || '') || extractThaiPartsFromAddress(formData.address || '');
      if (!payload.province && inferred.province) payload.province = inferred.province;
      if (!payload.amphoe && inferred.amphoe) payload.amphoe = inferred.amphoe;
      if (!payload.tambon && inferred.tambon) payload.tambon = inferred.tambon;
    }

    // Debug log
    console.log('Submitting payload:', payload);

    if (!payload.name) {
      setError('Please enter company name');
      setSubmitting(false);
      return;
    }

    try {
      const isEdit = Boolean(editingId);
      const response = await fetch(
        withBase(`/companies${isEdit ? `/${editingId}` : ''}`),
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
        throw new Error('You do not have permission to edit this data');
      }

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }

      const saved = (await response.json()) as Company;

      if (isEdit) {
        setCompanies((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      } else {
        setCompanies((prev) => [saved, ...prev]);
      }
      resetForm();
      setShowModal(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingId(company.id ?? null);
    setFormData({
      type: company.type || 'company',
      name: company.name,
      address: company.address || '',
      zipcode: company.zipcode || '',
      province: company.province || '',
      amphoe: company.amphoe || '',
      tambon: company.tambon || '',
      phone: company.phone || '',
      fax: company.fax || '',
      taxId: company.taxId || '',
      branchName: company.branchName || '',
      branchNumber: company.branchNumber || '',
      avatarUrl: company.avatarUrl || '',
      id: company.id,
    });
    setPhotoPreview(company.avatarUrl || '');
    setShowModal(true);
  };

  const handleDelete = async (id?: string) => {
    if (!token || !id) return;
    const confirmed = window.confirm('Are you sure you want to delete this company?');
    if (!confirmed) return;

    try {
      const response = await fetch(withBase(`/companies/${id}`), {
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
        throw new Error('You do not have permission to delete this data');
      }
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }
      setCompanies((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Contacts modal handlers
  const closeContactsModal = () => {
    setShowContactsModal(false);
    setActiveCompany(null);
    setSelectedContactIds([]);
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) => {
      if (prev.includes(contactId)) return prev.filter((id) => id !== contactId);
      return [...prev, contactId];
    });
  };

  const saveCompanyContacts = async () => {
    if (!activeCompany || !token) return;
    try {
      const res = await fetch(withBase(`/companies/${activeCompany.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contacts: selectedContactIds }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await res.json() : await res.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }
      const updated = await res.json();
      setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      closeContactsModal();
    } catch (err) {
      console.error('Error saving company contacts:', err);
      setError((err as Error).message);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6 px-8 py-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">

            <input
              type="text"
              className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring focus:border-blue-400"
              placeholder="Search by name"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ minWidth: 220 }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-[#3869a9] text-white font-medium shadow"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 17 }}
              onClick={openAddModal}
            >
              + Add New Company
            </button>
            <button
              className="btn-refresh"
              onClick={fetchCompanies}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        {error && <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{error}</div>}
        {companies.length === 0 && !loading ? (
          <p className="text-center text-gray-500">There is no company information yet. Try adding new information.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {companies
              .filter((company) => {
                if (searchTerm) {
                  const searchLower = searchTerm.toLowerCase();
                  const matchesSearch = company.name?.toLowerCase().includes(searchLower);
                  if (!matchesSearch) return false;
                }
                if (filterType !== 'all' && company.type !== filterType) return false;

                // Billing Due Filter


                return true;
              })
              .map((company) => {
                const canModify = user?.role === 'admin' || user?.role === 'superadmin' || company.ownerUserId === user?.userId;
                // Normalize company.contacts to an array of ids, handle case where contacts may be stored as objects
                const rawRelated = Array.isArray(company.contacts) ? company.contacts : [];
                const relatedContactIds = rawRelated
                  .map((item: any) => (typeof item === 'string' ? item : item?.id))
                  .filter((id: any) => !!id) as string[];
                // Only show contacts that actually exist in the fetched `contacts` list (hide deleted references)
                const relatedContacts = relatedContactIds.filter((id) => contacts.some((c) => c.id === id));
                // กำหนดสี pastel สำหรับ avatar (ใช้ util เดียวกับหน้า Contacts)
                const avatarColor = getAvatarColor(company.name);
                return (
                  <div key={company.id} className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      {company.avatarUrl ? (
                        <img src={company.avatarUrl} alt={company.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {company.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-lg">{company.name}</div>
                        <div className="text-gray-500 text-sm">{company.type === 'company' ? 'Company' : 'Individual'}</div>
                        <div className="text-gray-400 text-xs mt-1">
                          {(() => {
                            const segs = [];
                            if (company.address) segs.push(company.address);
                            if (company.tambon) segs.push(`ต.${company.tambon}`);
                            if (company.amphoe) segs.push(`อ.${company.amphoe}`);
                            if (company.province) segs.push(`จ.${company.province}`);
                            if (company.zipcode) segs.push(company.zipcode);
                            return segs.length > 0 ? segs.join(' ') : 'No address provided';
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div>
                        <div className="text-gray-500 text-xs uppercase tracking-wider font-medium mb-1">Amount Due</div>
                        <div className="font-bold text-lg text-primary">
                          {(() => {
                            const sum = company.id ? (billingSums[company.id] ?? company.amountDue ?? 0) : (company.amountDue ?? 0);
                            const num = typeof sum === 'number' ? sum : parseFloat(String(sum)) || 0;
                            return `฿${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="text-gray-500 text-sm">Related contacts</div>
                      <div className="flex items-center ml-2">
                        {relatedContacts.slice(0, 4).map((cid: string, idx: number) => {
                          const c = contacts.find((x) => x.id === cid);
                          const hasPhoto = c?.avatarUrl || c?.photo;
                          const firstLetter = c?.firstName?.charAt(0).toUpperCase() || 'C';
                          // ใช้ชุดสี pastel และ logic เดียวกับ ContactsPage
                          const avatarColor = getAvatarColor(c?.firstName || c?.email || '');
                          return hasPhoto ? (
                            <img
                              key={cid}
                              src={c?.avatarUrl || c?.photo}
                              alt={c?.firstName || c?.email || 'contact'}
                              className="w-7 h-7 rounded-full border-2 border-white -ml-2 first:ml-0 object-cover"
                            />
                          ) : (
                            <div
                              key={cid}
                              className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold border-2 border-white -ml-2 first:ml-0 text-xs"
                              style={{ backgroundColor: avatarColor }}
                            >
                              {firstLetter}
                            </div>
                          );
                        })}
                        {relatedContacts.length > 4 && (
                          <div className="w-7 h-7 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold border-2 border-white -ml-2 text-xs">
                            +{relatedContacts.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-auto">
                      <button className="btn btn-sm btn-outline-primary d-flex align-items-center text-nowrap" onClick={() => { setActiveCompany(company); setSelectedContactIds(Array.isArray(company.contacts) ? company.contacts : []); setShowContactsModal(true); }}>
                        <FaPlus className="me-1" /> Add contacts
                      </button>
                      {canModify && (
                        <Dropdown drop="start">
                          <Dropdown.Toggle
                            as="span"
                            id={`dropdown-${company.id}`}
                            className="no-caret"
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            bsPrefix="dropdown-toggle-no-caret"
                          >
                            <FaEllipsisV className="text-muted" />
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => navigate(`/companies/${company.id}`)}>
                              <FaEye className="me-2 text-secondary" /> View Company
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleDelete(company.id)} className="text-danger">
                              <FiTrash2 className="me-2" /> Delete
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingId ? 'Edit Company' : 'Add New Company'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    {/* Company Logo Upload */}
                    <div className="col-md-12 mb-4 text-center">
                      <label className="form-label d-block">Company Logo</label>
                      <div className="mb-3">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="d-block mx-auto"
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #ddd' }}
                          />
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center mx-auto text-white fw-bold"
                            style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: getAvatarColor(formData.name || ''), fontSize: 32 }}
                          >
                            {formData.name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_SIZE = 400;
                                let width = img.width;
                                let height = img.height;
                                if (width > height) {
                                  if (width > MAX_SIZE) {
                                    height *= MAX_SIZE / width;
                                    width = MAX_SIZE;
                                  }
                                } else {
                                  if (height > MAX_SIZE) {
                                    width *= MAX_SIZE / height;
                                    height = MAX_SIZE;
                                  }
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx?.drawImage(img, 0, 0, width, height);
                                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                                handleChange('avatarUrl', base64String);
                                setPhotoPreview(base64String);
                              };
                              img.src = event.target?.result as string;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <small className="text-muted">Upload a company logo (JPG, PNG)</small>
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">
                        Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => handleChange('type', e.target.value as 'individual' | 'company')}
                        required
                      >
                        <option value="company">Company (นิติบุคคล)</option>
                        <option value="individual">Individual (บุคคล)</option>
                      </select>
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">
                        {formData.type === 'company' ? 'Company Name' : 'Name'} <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                      />
                    </div>
                    {/* Province / Amphoe / Tambon selects placed under Address label in a single row */}
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Address</label>
                      <textarea
                        className="form-control mb-2"
                        value={formData.address || ''}
                        onChange={(e) => handleChange('address', e.target.value)}
                        rows={3}
                      />
                      <div className="row gx-2 mb-2">
                        <div className="col-12 col-md-3">
                          <select
                            className="form-select"
                            value={formData.province || ''}
                            onChange={(e) => {
                              const val = e.target.value || '';
                              handleChange('province', val);
                              handleChange('amphoe', '');
                              handleChange('tambon', '');
                              handleChange('zipcode', '');
                            }}
                          >
                            <option value="">Select province</option>
                            {Array.isArray(thailandHierarchy) && thailandHierarchy.map((p: any) => (
                              <option key={p.name || p.province} value={p.name || p.province}>{p.name || p.province}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12 col-md-3">
                          <select
                            className="form-select"
                            value={formData.amphoe || ''}
                            onChange={(e) => {
                              const val = e.target.value || '';
                              handleChange('amphoe', val);
                              handleChange('tambon', '');
                              handleChange('zipcode', '');
                            }}
                            disabled={!formData.province}
                          >
                            <option value="">Select amphoe</option>
                            {Array.isArray(thailandHierarchy) && formData.province && (() => {
                              const prov = thailandHierarchy.find((x: any) => (x.name || x.province) === formData.province);
                              if (!prov || !Array.isArray(prov.amphoes)) return null;
                              return prov.amphoes.map((a: any) => (
                                <option key={a.name || a.amphoe} value={a.name || a.amphoe}>{a.name || a.amphoe}</option>
                              ));
                            })()}
                          </select>
                        </div>
                        <div className="col-12 col-md-3">
                          <select
                            className="form-select"
                            value={formData.tambon || ''}
                            onChange={(e) => {
                              const val = e.target.value || '';
                              handleChange('tambon', val);
                              // Auto-fill zipcode if found in flat hierarchy
                              if (val && formData.amphoe && formData.province) {
                                const match = (thailandFlat as any[]).find(r =>
                                  (r.district === val || r.name === val) &&
                                  (r.amphoe === formData.amphoe) &&
                                  (r.province === formData.province)
                                );
                                if (match && match.zipcode) {
                                  handleChange('zipcode', match.zipcode.toString());
                                }
                              }
                            }}
                            disabled={!formData.amphoe}
                          >
                            <option value="">Select tambon</option>
                            {Array.isArray(thailandHierarchy) && formData.province && formData.amphoe && (() => {
                              const prov = thailandHierarchy.find((x: any) => (x.name || x.province) === formData.province);
                              if (!prov || !Array.isArray(prov.amphoes)) return null;
                              const amph = prov.amphoes.find((a: any) => (a.name || a.amphoe) === formData.amphoe);
                              if (!amph || !Array.isArray(amph.tambons)) return null;
                              return amph.tambons.map((t: any) => (
                                <option key={typeof t === 'string' ? t : (t.name || t.tambon)} value={typeof t === 'string' ? t : (t.name || t.tambon)}>{typeof t === 'string' ? t : (t.name || t.tambon)}</option>
                              ));
                            })()}
                          </select>
                        </div>
                        <div className="col-12 col-md-3">
                          <input
                            type="text"
                            className="form-control"
                            value={formData.zipcode || ''}
                            onChange={(e) => handleZipcodeChange(e.target.value)}
                            placeholder="Zipcode"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={formData.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Fax</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={formData.fax || ''}
                        onChange={(e) => handleChange('fax', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Tax ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.taxId || ''}
                        onChange={(e) => handleChange('taxId', e.target.value)}
                      />
                    </div>
                    {formData.type === 'company' && (
                      <>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Branch Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.branchName || ''}
                            onChange={(e) => handleChange('branchName', e.target.value)}
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Branch Number</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formData.branchNumber || ''}
                            onChange={(e) => handleChange('branchNumber', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {error && <div className="alert alert-danger">{error}</div>}
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting
                        ? 'Saving...'
                        : editingId
                          ? 'Save Changes'
                          : 'Add Company'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal for adding contacts to a company */}
      {showContactsModal && activeCompany && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add contacts to {activeCompany.name}</h5>
                <button type="button" className="btn-close" onClick={closeContactsModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <input className="form-control" placeholder="Search contacts" onChange={(e) => { /* optional: implement search */ }} />
                </div>
                <div style={{ maxHeight: 360, overflow: 'auto' }}>
                  {contacts.map((c) => (
                    <div key={c.id} className="form-check d-flex align-items-center mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={selectedContactIds.includes(c.id)}
                        onChange={() => toggleContactSelection(c.id)}
                        id={`contact_${c.id}`}
                      />
                      <label className="form-check-label ms-2 d-flex align-items-center" htmlFor={`contact_${c.id}`}>
                        {(c.avatarUrl || c.photo) ? (
                          <img src={c.avatarUrl || c.photo} alt={c.firstName || c.email} style={{ width: 28, height: 28, borderRadius: '50%', marginRight: 8, objectFit: 'cover' }} />
                        ) : (
                          <div
                            className="d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: getAvatarColor(c.firstName || c.email || ''), marginRight: 8, fontSize: 12 }}
                          >
                            {c.firstName?.charAt(0).toUpperCase() || (c.email ? c.email.charAt(0).toUpperCase() : 'C')}
                          </div>
                        )}
                        {c.firstName ? `${c.firstName} ${c.lastName || ''}` : c.email}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={saveCompanyContacts}>Save</button>
                <button className="btn btn-secondary" onClick={closeContactsModal}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

