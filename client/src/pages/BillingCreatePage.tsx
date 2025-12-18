import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type Company = { id: string; name: string } | any;

export const BillingCreatePage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [contactsForCompany, setContactsForCompany] = useState<any[]>([]);
  const [loadingContactsForCompany, setLoadingContactsForCompany] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<any>({
    companyId: '',
    contactId: '',
    companyName: '',
    billingDate: new Date().toISOString().split('T')[0],
    contractStartDate: new Date().toISOString().split('T')[0],
    contractEndDate: '',
    billingCycle: 'monthly',
    billingIntervalMonths: 1,
    amount: 0,
    items: [{ name: '', description: '', quantity: 1, price: 0 }],
    status: 'pending',
  });
  const [loadedRecord, setLoadedRecord] = useState<any | null>(null);
  

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const res = await fetch(`${API_BASE_URL}/companies`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setCompanies(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Failed to fetch companies', err);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, [token]);

  // If editing, fetch existing billing record
  useEffect(() => {
    const loadRecord = async () => {
      if (!editId) return;
      try {
        const res = await fetch(`${API_BASE_URL}/billing-records/${editId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // Fill form with data
        setLoadedRecord(data);
        setForm((f: any) => ({
          ...f,
          companyId: data.companyId || data.company?.id || data.company?._id || f.companyId,
          contactId: data.contactId || data.contact?.id || data.contact?._id || data.contact?._ref || f.contactId,
          companyName: data.companyName || (data.company && (data.company.name || data.company.companyName)) || f.companyName,
          // also capture contactName for display
          ...(data.contact && data.contact.name ? { contactName: data.contact.name } : {}),
          billingDate: data.billingDate ? data.billingDate.split('T')[0] : f.billingDate,
          contractStartDate: data.contractStartDate || f.contractStartDate,
          contractEndDate: data.contractEndDate || f.contractEndDate,
          billingCycle: data.billingCycle || f.billingCycle,
          billingIntervalMonths: data.billingIntervalMonths || f.billingIntervalMonths,
          items: Array.isArray(data.items) && data.items.length ? data.items : f.items,
          amount: data.amount ?? computeAmount(),
          status: data.status || f.status,
        }));
        // If the loaded record references a contact id, fetch that contact specifically
        try {
          const cid = data.contactId || data.contact?.id || data.contact?._id || data.contact?._ref;
          if (cid) {
            const cRes = await fetch(`${API_BASE_URL}/cruds/${cid}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (cRes.ok) {
              const contactObj = await cRes.json();
              if (contactObj) {
                setContactsForCompany((prev) => {
                  // ensure we include the contact in the list shown for the select
                  const exists = prev.some((p) => String(p.id) === String(contactObj.id));
                  return exists ? prev : [contactObj, ...prev];
                });
              }
            }
          }
        } catch (e) {
          // ignore contact fetch errors
        }
      } catch (err) {
        console.error('Failed to load billing record for edit', err);
      }
    };
    loadRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // fetch contacts for selected company
  useEffect(() => {
    const fetchContactsForCompany = async () => {
      const cid = form.companyId;
      if (!cid) {
        setContactsForCompany([]);
        return;
      }
      // wait until companies are loaded so name-based matching works
      if (!companies || companies.length === 0) return;
      setLoadingContactsForCompany(true);
      try {
        const res = await fetch(`${API_BASE_URL}/cruds`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // fetched contacts
        if (!Array.isArray(data)) {
          setContactsForCompany([]);
        } else {
          // primary: id-based matches and company.contacts association
          let filtered = data.filter((c: any) => {
            if (!c) return false;
            if (c.companyId && String(c.companyId) === String(cid)) return true;
            if (c.company && (c.company === cid || c.company.id === cid || c.company._id === cid)) return true;
            if (c.company_id && String(c.company_id) === String(cid)) return true;
            if (c.companyRef && (typeof c.companyRef === 'string' ? c.companyRef === cid : c.companyRef?.id === cid)) return true;
            const companyObj = companies.find((co: any) => String(co.id) === String(cid));
            if (companyObj && Array.isArray(companyObj.contacts) && companyObj.contacts.includes(c.id)) return true;
            return false;
          });
          console.debug && console.debug('BillingCreatePage: contacts after id-based filter', filtered.length);

          // Only related contacts should be shown. Do not fall back to unrelated contacts in edit mode.
          setContactsForCompany(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch contacts for company', err);
        setContactsForCompany([]);
      } finally {
        setLoadingContactsForCompany(false);
      }
    };
    fetchContactsForCompany();
  }, [form.companyId, token, companies]);

  const setItem = (index: number, key: string, value: any) => {
    setForm((f: any) => {
      const items = [...f.items];
      items[index] = { ...items[index], [key]: value };
      return { ...f, items };
    });
  };

  const addItem = () => setForm((f: any) => ({ ...f, items: [...f.items, { name: '', description: '', quantity: 1, price: 0 }] }));
  const removeItem = (i: number) => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, idx: number) => idx !== i) }));

  const computeAmount = () => {
    const total = form.items.reduce((s: number, it: any) => s + (Number(it.quantity || 0) * Number(it.price || 0)), 0);
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Determine billingCycle name from months: 1->monthly, 3->quarterly, 12->yearly, otherwise 'custom'
      const months = Number(form.billingIntervalMonths || 1);
      let cycleName = 'custom';
      if (months === 1) cycleName = 'monthly';
      else if (months === 3) cycleName = 'quarterly';
      else if (months === 12) cycleName = 'yearly';

      const payload = {
        companyId: form.companyId,
        companyName: companies.find((c) => c.id === form.companyId)?.name || form.companyName,
        contactId: form.contactId || undefined,
        contactName: contactsForCompany.find((c) => c.id === form.contactId)?.name || undefined,
        billingDate: form.billingDate,
        contractStartDate: form.contractStartDate || undefined,
        contractEndDate: form.contractEndDate || undefined,
        billingCycle: cycleName,
        billingIntervalMonths: months,
        items: form.items,
        amount: computeAmount(),
        status: form.status,
      };

      let res: Response;
      if (editId) {
        res = await fetch(`${API_BASE_URL}/billing-records/${editId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE_URL}/billing-records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
          credentials: 'include',
        });
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Status ${res.status}`);
      }
      // success
      navigate('/billing');
    } catch (err: any) {
      setError(err.message || 'Failed to create billing record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Create Invoice</h1>
      </div>

      <div className="card shadow mb-4">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row mb-3">
              <div className="col-md-4">
                <label className="form-label">Customer</label>
                <select className="form-select" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                  <option value="">-- Select customer --</option>
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Contact</label>
                <select
                  className="form-select"
                  value={form.contactId}
                  onChange={(e) => setForm({ ...form, contactId: e.target.value })}
                  disabled={!form.companyId || loadingContactsForCompany}
                >
                  <option value="">-- Select contact --</option>
                  {loadingContactsForCompany && <option>Loading...</option>}
                  {!loadingContactsForCompany && contactsForCompany.map((ct: any) => (
                    <option
                      key={ct.id}
                      value={ct.id}
                    >{
                      ((ct.firstName || ct.lastName) ? `${(ct.firstName || '').trim()} ${(ct.lastName || '').trim()}`.trim() : ct.name)
                        || ct.fullName
                        || ct.email
                        || ct.displayName
                        || ct.id
                    }</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Billing date</label>
                <input type="date" className="form-control" value={form.billingDate} onChange={(e) => setForm({ ...form, billingDate: e.target.value })} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Billing interval (months)</label>
                <select className="form-select" value={form.billingIntervalMonths} onChange={(e) => setForm({ ...form, billingIntervalMonths: Number(e.target.value) })}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{`ทุกๆ ${n} เดือน`}</option>
                  ))}
                </select>
              </div>
            </div>

            

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Contract start date</label>
                <input type="date" className="form-control" value={form.contractStartDate} onChange={(e) => setForm({ ...form, contractStartDate: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Contract end date</label>
                <input type="date" className="form-control" value={form.contractEndDate} onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })} />
              </div>
            </div>

            <div className="mb-3">
              <h5>Items</h5>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Description</th>
                      <th style={{ width: 120 }}>Qty</th>
                      <th style={{ width: 140 }}>Price</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td><input className="form-control" value={it.name} onChange={(e) => setItem(idx, 'name', e.target.value)} /></td>
                        <td><input className="form-control" value={it.description} onChange={(e) => setItem(idx, 'description', e.target.value)} /></td>
                        <td><input type="number" className="form-control" value={it.quantity} onChange={(e) => setItem(idx, 'quantity', Number(e.target.value))} /></td>
                        <td><input type="number" className="form-control" value={it.price} onChange={(e) => setItem(idx, 'price', Number(e.target.value))} /></td>
                        <td>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => removeItem(idx)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <button type="button" className="btn btn-outline-primary" onClick={addItem}>Add item</button>
              </div>
            </div>

            <div className="mb-3">
              <strong>Total: </strong> {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(computeAmount())}
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <div>
              <button className="btn btn-primary me-2" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button className="btn btn-secondary" type="button" onClick={() => navigate('/billing')}>Cancel</button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};
