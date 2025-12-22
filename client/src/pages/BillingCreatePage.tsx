import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import formatToDDMMYYYY from '../utils/formatDate';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Inline month-style picker for create/edit invoice form
  const InlineMonthPicker: React.FC<{ value: string; onChange: (v: string) => void; error?: string }>
    = ({ value, onChange, error }) => {
      const [open, setOpen] = useState(false);
      const instanceIdRef = React.useRef<string>(Math.random().toString(36).slice(2));
      const wrapperRef = React.useRef<HTMLDivElement | null>(null);

      useEffect(() => {
        const handler = (e: Event) => {
          try {
            const detail = (e as CustomEvent).detail;
            if (detail !== instanceIdRef.current) setOpen(false);
          } catch (err) { /* ignore */ }
        };
        window.addEventListener('inline-month-picker-open', handler as EventListener);

        const onDocClick = (ev: MouseEvent) => {
          const t = ev.target as Node | null;
          if (wrapperRef.current && t && !wrapperRef.current.contains(t)) {
            setOpen(false);
          }
        };
        const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setOpen(false); };
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onKey);

        return () => {
          window.removeEventListener('inline-month-picker-open', handler as EventListener);
          document.removeEventListener('click', onDocClick);
          document.removeEventListener('keydown', onKey);
        };
      }, []);
      const parseLocalIso = (iso: string) => {
        if (!iso) return null;
        try {
          const parts = iso.split('T')[0].split('-');
          if (parts.length >= 3) {
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          }
        } catch (e) { }
        return null;
      };

      const [viewDate, setViewDate] = useState<Date>(() => (value && parseLocalIso(value)) || new Date());
      const [showYearPicker, setShowYearPicker] = useState(false);
      const [decadeStart, setDecadeStart] = useState(() => Math.floor((new Date().getFullYear()) / 12) * 12);

      const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
      const weekdayOfFirst = (d: Date) => (startOfMonth(d).getDay() + 6) % 7;
      const buildGrid = (d: Date) => {
        const first = startOfMonth(d);
        const wf = weekdayOfFirst(d);
        const gridStart = new Date(first);
        gridStart.setDate(first.getDate() - wf);
        const cells: Date[] = [];
        for (let i = 0; i < 42; i++) {
          const c = new Date(gridStart);
          c.setDate(gridStart.getDate() + i);
          cells.push(c);
        }
        return cells;
      };

      const cells = buildGrid(viewDate);
      const today = new Date();
      const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

      const toLocalIso = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const setIso = (d: Date) => {
        onChange(toLocalIso(d));
        setOpen(false);
      };

      return (
        <div ref={wrapperRef} style={{ position: 'relative', display: 'block', width: '100%' }}>
          <input
            readOnly
            className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
            value={value ? formatToDDMMYYYY(value) : 'dd/mm/yyyy'}
            style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
            onClick={() => {
              if (!open) {
                window.dispatchEvent(new CustomEvent('inline-month-picker-open', { detail: instanceIdRef.current }));
                setOpen(true);
              } else setOpen(false);
            }}
          />
          <span
            role="button"
            aria-label="Open calendar"
            onClick={(e) => { e.stopPropagation(); if (!open) { window.dispatchEvent(new CustomEvent('inline-month-picker-open', { detail: instanceIdRef.current })); setOpen(true); } else setOpen(false); }}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'rgba(55,65,81,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg className="inline-date-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
              <path d="M16 3v4M8 3v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          {open && (
            <div className="inline-calendar-dropdown card p-3" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 1200 }} onClick={(e) => e.stopPropagation()}>
              <div className="inline-cal-header d-flex align-items-center justify-content-between mb-2">
                <button type="button" className="btn btn-sm btn-iconless" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
                <div className="inline-cal-title clickable" onClick={() => { setShowYearPicker(s => !s); setDecadeStart(Math.floor(viewDate.getFullYear() / 12) * 12); }}>{viewDate.toLocaleString('default', { month: 'long' })} {viewDate.getFullYear()}</div>
                <button type="button" className="btn btn-sm btn-iconless" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
              </div>

              {showYearPicker ? (
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <button type="button" className="btn btn-sm btn-iconless" onClick={() => setDecadeStart(s => s - 12)}>‹</button>
                    <div className="fw-bold">{decadeStart} - {decadeStart + 11}</div>
                    <button type="button" className="btn btn-sm btn-iconless" onClick={() => setDecadeStart(s => s + 12)}>›</button>
                  </div>
                  <div className="inline-year-grid">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const y = decadeStart + i;
                      return (
                        <div key={y} className={`inline-year-cell ${y === viewDate.getFullYear() ? 'active' : ''}`} onClick={() => { setViewDate(d => new Date(y, d.getMonth(), 1)); setShowYearPicker(false); }}>
                          {y}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="inline-cal-grid">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                      <div key={d} className="inline-cal-weekday small text-muted text-center">{d}</div>
                    ))}
                    {cells.map((c, i) => {
                      const sel = parseLocalIso(value);
                      const isSelected = sel && isSameDay(c, sel);
                      return (
                        <div key={i} className={`inline-cal-day text-center ${c.getMonth() !== viewDate.getMonth() ? 'muted' : ''} ${isSameDay(c, today) ? 'today' : ''} ${isSelected ? 'active' : ''}`} onClick={() => setIso(c)}>
                          {c.getDate()}
                        </div>
                      );
                    })}
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <button type="button" className="btn btn-sm btn-outline-secondary w-100" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
                    <button type="button" className="btn btn-sm btn-primary w-100" onClick={() => setOpen(false)}>Done</button>
                  </div>
                </>
              )}
            </div>
          )}
          {/* per-field inline error text intentionally omitted to avoid layout shift; outline remains */}
        </div>
      );
    };


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

  // Form validation: require company, contact, billing date, contract start, and at least one item with a name
  const isFormValid = useMemo(() => {
    if (!form) return false;
    if (!form.companyId || String(form.companyId).trim() === '') return false;
    if (!form.contactId || String(form.contactId).trim() === '') return false;
    if (!form.billingDate || String(form.billingDate).trim() === '') return false;
    if (!form.contractStartDate || String(form.contractStartDate).trim() === '') return false;
    if (!Array.isArray(form.items) || form.items.length === 0) return false;
    // ensure every item has a non-empty name
    for (const it of form.items) {
      if (!it || !String(it.name || '').trim()) return false;
    }
    return true;
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear previous field errors
    setFieldErrors({});
    setError(null);

    // Validate and show field-level errors if any
    if (!isFormValid) {
      const errs: Record<string, string> = {};
      if (!form.companyId) errs.companyId = 'Customer is required';
      if (!form.contactId) errs.contactId = 'Contact is required';
      if (!form.billingDate) errs.billingDate = 'Billing date is required';
      if (!form.contractStartDate) errs.contractStartDate = 'Contract start date is required';
      if (!Array.isArray(form.items) || form.items.length === 0) errs.items = 'At least one item is required';
      if (Array.isArray(form.items)) {
        form.items.forEach((it: any, idx: number) => {
          const nameTrim = String(it?.name || '').trim();
          if (!nameTrim) {
            // If the user just typed but React state hasn't flushed yet, check the DOM input value
            try {
              const el = typeof document !== 'undefined' ? document.querySelector<HTMLInputElement>(`input[name="item_name_${idx}"]`) : null;
              const domVal = el ? String(el.value || '').trim() : '';
              if (domVal) {
                // update form with the DOM value so UI stays in sync
                setForm((prev: any) => {
                  const items = Array.isArray(prev.items) ? [...prev.items] : [];
                  items[idx] = { ...(items[idx] || {}), name: domVal };
                  return { ...prev, items };
                });
                return; // treat as valid
              }
            } catch (e) {
              // ignore DOM read errors
            }
            errs[`item_${idx}`] = 'Item name is required';
          }
        });
      }
      setFieldErrors(errs);
      setError('Please fill out all fields');
      return;
    }

    setSaving(true);
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
                <select
                  className={`w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all ${fieldErrors.companyId ? 'ring-2 ring-red-200' : ''}`}
                  value={form.companyId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f: any) => ({ ...f, companyId: v }));
                    setFieldErrors((prev) => {
                      const p = { ...prev };
                      delete p.companyId;
                      delete p.items;
                      return p;
                    });
                  }}
                >
                  <option value="">-- Select customer --</option>
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Contact</label>
                <select
                  className={`w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all ${fieldErrors.contactId ? 'ring-2 ring-red-200' : ''} ${(!form.companyId || loadingContactsForCompany) ? 'opacity-70' : ''}`}
                  value={form.contactId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f: any) => ({ ...f, contactId: v }));
                    setFieldErrors((prev) => {
                      const p = { ...prev };
                      delete p.contactId;
                      return p;
                    });
                  }}
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
                <label className="form-label">Notification date</label>
                <InlineMonthPicker
                  value={form.billingDate}
                  onChange={(v) => {
                    setForm((f: any) => ({ ...f, billingDate: v }));
                    setFieldErrors((prev) => {
                      const p = { ...prev };
                      delete p.billingDate;
                      return p;
                    });
                  }}
                  error={fieldErrors.billingDate}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Billing interval (months)</label>
                <select className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all" value={form.billingIntervalMonths} onChange={(e) => setForm({ ...form, billingIntervalMonths: Number(e.target.value) })}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{`ทุกๆ ${n} เดือน`}</option>
                  ))}
                </select>
              </div>
            </div>



            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Contract start date</label>
                <InlineMonthPicker
                  value={form.contractStartDate}
                  onChange={(v) => {
                    setForm((f: any) => ({ ...f, contractStartDate: v }));
                    setFieldErrors((prev) => {
                      const p = { ...prev };
                      delete p.contractStartDate;
                      return p;
                    });
                  }}
                  error={fieldErrors.contractStartDate}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Contract end date</label>
                <InlineMonthPicker value={form.contractEndDate} onChange={(v) => setForm({ ...form, contractEndDate: v })} />
              </div>
            </div>

            <div className="mb-3">
              <h5>Items</h5>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th style={{ width: 120 }}>Qty</th>
                      <th style={{ width: 120 }}>Price</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td>
                          <input
                            name={`item_name_${idx}`}
                            className={`w-full px-3 py-2 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all ${fieldErrors[`item_${idx}`] ? 'ring-2 ring-red-200' : ''}`}
                            value={it.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setItem(idx, 'name', v);
                              setFieldErrors((prev) => {
                                const p = { ...prev };
                                delete p[`item_${idx}`];
                                delete p.items;
                                return p;
                              });
                            }}
                          />
                          {/* inline item error text removed to prevent layout shift; outline remains */}
                        </td>
                        <td><input className="w-full px-3 py-2 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all" value={it.description} onChange={(e) => setItem(idx, 'description', e.target.value)} /></td>
                        <td><input type="number" className="w-full px-3 py-2 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all" value={it.quantity} onChange={(e) => setItem(idx, 'quantity', Number(e.target.value))} /></td>
                        <td><input type="number" className="w-full px-3 py-2 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all" value={it.price} onChange={(e) => setItem(idx, 'price', Number(e.target.value))} /></td>
                        <td>
                          <button type="button" className="icon-btn delete" onClick={() => removeItem(idx)} aria-label="Remove item">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
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
