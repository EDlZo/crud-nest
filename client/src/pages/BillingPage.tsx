import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiFilter } from 'react-icons/fi';
import { FaPaperPlane } from 'react-icons/fa';
import { CiShare1 } from 'react-icons/ci';
import { API_BASE_URL } from '../config';
import formatToDDMMYYYY from '../utils/formatDate';
import DeleteConfirmPopover from '../components/DeleteConfirmPopover';
// read token directly to avoid circular import/runtime issues

export const BillingPage: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [contactsById, setContactsById] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{ company: string; amount: string; status: string }>({ company: '', amount: '', status: '' });
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  // Separate date ranges for contract date and notification/billing date
  const [contractDateFrom, setContractDateFrom] = useState<string>('');
  const [contractDateTo, setContractDateTo] = useState<string>('');
  const [notifyDateFrom, setNotifyDateFrom] = useState<string>('');
  const [notifyDateTo, setNotifyDateTo] = useState<string>('');
  const [sendingIds, setSendingIds] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  // Inline month-style date picker (small) used inside filter dropdowns
  const InlineMonthPicker: React.FC<{ value: string; onChange: (v: string) => void; }> = ({ value, onChange }) => {
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
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') setOpen(false);
      };
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

    const [viewDate, setViewDate] = useState<Date>(() => (value ? parseLocalIso(value) : null) || new Date());
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [decadeStart, setDecadeStart] = useState(() => Math.floor((viewDate.getFullYear()) / 12) * 12);

    const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
    const weekdayOfFirst = (d: Date) => (startOfMonth(d).getDay() + 6) % 7; // Monday-first

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
      const iso = toLocalIso(d);
      onChange(iso);
      setOpen(false);
    };

    return (
      <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button style={{ alignItems: 'center' }} type="button" className="inline-date-trigger" onClick={() => {
          if (!open) {
            window.dispatchEvent(new CustomEvent('inline-month-picker-open', { detail: instanceIdRef.current }));
            setOpen(true);
          } else setOpen(false);
        }}>
          {value ? formatToDDMMYYYY(value) : '22 Dec 2025'}
        </button>
        {open && (
          <div className="inline-calendar-dropdown card p-3" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 1200 }}>
            <div className="inline-cal-header d-flex align-items-center justify-content-between mb-2">
              <button type="button" className="btn btn-sm btn-iconless" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
              <div className="inline-cal-title clickable" onClick={() => { setShowYearPicker(s => !s); setDecadeStart(Math.floor(viewDate.getFullYear() / 12) * 12); }}>
                {viewDate.toLocaleString('default', { month: 'long' })} {viewDate.getFullYear()}
              </div>
              <button className="btn btn-sm btn-iconless" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
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
      </div>
    );
  };
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('crud-token') : null;

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!token) {
      alert('Please login to perform this action');
      return;
    }
    // Confirmed via Popover
    try {
      const res = await fetch(`${API_BASE_URL}/billing-records/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Status ${res.status}`);
      }
      // remove from UI
      setRecords((prev) => prev.filter((r) => r.id !== id));
      try { window.dispatchEvent(new CustomEvent('billing:changed')); } catch (e) { /* ignore */ }
    } catch (err: any) {
      alert(err.message || 'Failed to delete billing record');
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/billing-records`, { credentials: 'include' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API ${res.status}: ${txt}`);
      }
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch billing records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const renderDateRangeDropdown = (label: string, key: 'contract' | 'notify') => {
    const isActive = activeFilter === key;
    const hasValue = key === 'contract' ? (contractDateFrom || contractDateTo) : (notifyDateFrom || notifyDateTo);

    const getFrom = () => (key === 'contract' ? contractDateFrom : notifyDateFrom);
    const getTo = () => (key === 'contract' ? contractDateTo : notifyDateTo);
    const setFrom = (v: string) => { if (key === 'contract') setContractDateFrom(v); else setNotifyDateFrom(v); };
    const setTo = (v: string) => { if (key === 'contract') setContractDateTo(v); else setNotifyDateTo(v); };

    return (
      <div className="position-relative d-inline-block">
        <div
          className="d-flex align-items-center gap-2"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            headerRef.current = e.currentTarget as HTMLDivElement;
            setActiveFilter(isActive ? null : key);
          }}
        >
          {label}
          <FiFilter
            size={14}
            className={hasValue ? 'text-primary' : 'text-muted'}
            style={{ cursor: 'pointer' }}
          />
        </div>
        {isActive && (
          <div
            ref={dropdownRef}
            className="position-fixed bg-white shadow-lg rounded p-3"
            style={{ zIndex: 9999, minWidth: 260, border: '1px solid #e5e7eb', marginTop: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 d-flex align-items-center gap-2">
              <InlineMonthPicker value={getFrom()} onChange={setFrom} />
              <span className="text-muted">to</span>
              <InlineMonthPicker value={getTo()} onChange={setTo} />
            </div>
            <div className="d-flex justify-content-between">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setFrom(''); setTo(''); setActiveFilter(null); }}>Clear</button>
              <button className="btn btn-sm btn-primary" onClick={() => setActiveFilter(null)}>Apply</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSendNow = async (id?: string) => {
    if (!id) return;
    // navigate to preview page where user can inspect and send
    navigate(`/billing/preview/${id}`);
  };



  useEffect(() => {
    fetchRecords();
    // also fetch contacts once so we can display contact names in the list
    const fetchContacts = async () => {
      try {
        const headers: any = {};
        const tokenLocal = typeof window !== 'undefined' ? localStorage.getItem('crud-token') : null;
        if (tokenLocal) headers.Authorization = `Bearer ${tokenLocal}`;
        const res = await fetch(`${API_BASE_URL}/cruds`, { credentials: 'include', headers });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const map: Record<string, any> = {};
        data.forEach((c: any) => {
          const id = c.id || c._id || c._ref || c._key || c.contactId;
          if (id) map[String(id)] = c;
        });
        setContactsById(map);
      } catch (e) {
        // ignore
      }
    };
    fetchContacts();
  }, []);

  // Close active filter dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      // if clicking inside dropdown or header, keep open
      if (dropdownRef.current && target && dropdownRef.current.contains(target)) return;
      if (headerRef.current && target && headerRef.current.contains(target)) return;
      setActiveFilter(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveFilter(null); };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const displayedRecords = useMemo(() => {
    const s = String(search || '').trim().toLowerCase();
    return records.filter((r: any) => {
      const name = String(r.companyName || r.companyId || '').toLowerCase();
      const amount = String(r.amount || '').toLowerCase();
      const status = String(r.status || '').toLowerCase();

      // global search
      if (s && !(name.includes(s) || amount.includes(s) || status.includes(s))) return false;

      // column filters
      if (filters.company && !name.includes(String(filters.company).toLowerCase())) return false;
      if (filters.amount && !amount.includes(String(filters.amount).toLowerCase())) return false;
      if (filters.status && !status.includes(String(filters.status).toLowerCase())) return false;

      // contract date range filter — match if the selected range overlaps the contract period
      if (contractDateFrom || contractDateTo) {
        const startIso = r.contractStartDate ? String(r.contractStartDate).split('T')[0] : (r.contractDate ? String(r.contractDate).split('T')[0] : null);
        const endIso = r.contractEndDate ? String(r.contractEndDate).split('T')[0] : (r.contractStartDate ? String(r.contractStartDate).split('T')[0] : (r.contractDate ? String(r.contractDate).split('T')[0] : null));
        // if we have no contract dates at all, don't match
        if (!startIso && !endIso) return false;

        const recordStart = startIso || endIso;
        const recordEnd = endIso || startIso;

        // If the record ends before the filter start, no overlap
        if (contractDateFrom && recordEnd && recordEnd < contractDateFrom) return false;
        // If the record starts after the filter end, no overlap
        if (contractDateTo && recordStart && recordStart > contractDateTo) return false;
        // otherwise there is overlap (or filter bounds missing)
      }

      // notification/billing date range filter — use notificationDate if present, otherwise billingDate
      if (notifyDateFrom || notifyDateTo) {
        const rawNotify = r.notificationDate || r.billingDate || null;
        const notifyIso = rawNotify ? String(rawNotify).split('T')[0] : null;
        if (!notifyIso) return false;
        if (notifyDateFrom && notifyIso < notifyDateFrom) return false;
        if (notifyDateTo && notifyIso > notifyDateTo) return false;
      }

      return true;
    });
  }, [records, search, filters, dateFrom, dateTo, contractDateFrom, contractDateTo, notifyDateFrom, notifyDateTo]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilter = (key: keyof typeof filters) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
    setActiveFilter(null);
  };

  const renderFilterDropdown = (field: keyof typeof filters, label: string) => {
    const isActive = activeFilter === field;
    const hasValue = !!filters[field];
    return (
      <div className="position-relative d-inline-block">
        <div
          className="d-flex align-items-center gap-2"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            headerRef.current = e.currentTarget as HTMLDivElement;
            setActiveFilter(isActive ? null : field);
          }}
        >
          {label}
          <FiFilter
            size={14}
            className={hasValue ? 'text-primary' : 'text-muted'}
            style={{ cursor: 'pointer' }}
          />
        </div>
        {isActive && (
          <div
            ref={dropdownRef}
            className="position-fixed bg-white shadow-lg rounded p-3"
            style={{ zIndex: 9999, minWidth: 220, border: '1px solid #e5e7eb', marginTop: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={`Filter by ${label.toLowerCase()}...`}
                value={filters[field]}
                onChange={(e) => handleFilterChange(field, e.target.value)}
                autoFocus
              />
            </div>
            <div className="d-flex justify-content-between">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => clearFilter(field)}>Clear</button>
              <button className="btn btn-sm btn-primary" onClick={() => setActiveFilter(null)}>Apply</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Invoice</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="d-flex align-items-center" style={{ gap: 8 }}>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
              style={{ minWidth: 120, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => navigate('/billing/create')}
            >
              + Create Invoice
            </button>
            <button
              className="btn-refresh"
              style={{ minWidth: 120, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={fetchRecords}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>

          </div>
        </div>
      </div>

      {/* Active Filters Display (moved directly under header) */}
      {(filters.company || filters.amount || filters.status || search || contractDateFrom || contractDateTo || notifyDateFrom || notifyDateTo) && (
        <div className="mb-3 d-flex align-items-center gap-2 flex-wrap">
          <span className="text-muted">Filters:</span>
          {Object.entries(filters).map(([key, value]) =>
            value && (
              <span key={key} className="badge bg-primary d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
                {key === 'company' ? 'name' : key}: {value}
                <button
                  className="btn-close btn-close-white"
                  style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }}
                  onClick={() => handleFilterChange(key as any, '')}
                />
              </span>
            )
          )}

          {/* global search shown as name: */}
          {search && (
            <span className="badge bg-primary d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
              name: {search}
              <button className="btn-close btn-close-white" style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }} onClick={() => setSearch('')} />
            </span>
          )}

          {/* contract date range badge */}
          {(contractDateFrom || contractDateTo) && (
            <span className="badge bg-primary d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
              contract: {contractDateFrom ? formatToDDMMYYYY(contractDateFrom) : ''}{(contractDateFrom && contractDateTo) ? ` - ${formatToDDMMYYYY(contractDateTo)}` : (contractDateTo ? formatToDDMMYYYY(contractDateTo) : '')}
              <button className="btn-close btn-close-white" style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }} onClick={() => { setContractDateFrom(''); setContractDateTo(''); setActiveFilter(null); }} />
            </span>
          )}

          {/* notification/billing date range badge */}
          {(notifyDateFrom || notifyDateTo) && (
            <span className="badge bg-primary d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
              notification: {notifyDateFrom ? formatToDDMMYYYY(notifyDateFrom) : ''}{(notifyDateFrom && notifyDateTo) ? ` - ${formatToDDMMYYYY(notifyDateTo)}` : (notifyDateTo ? formatToDDMMYYYY(notifyDateTo) : '')}
              <button className="btn-close btn-close-white" style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }} onClick={() => { setNotifyDateFrom(''); setNotifyDateTo(''); setActiveFilter(null); }} />
            </span>
          )}

          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setFilters({ company: '', amount: '', status: '' }); setSearch(''); setContractDateFrom(''); setContractDateTo(''); setNotifyDateFrom(''); setNotifyDateTo(''); setActiveFilter(null); }}>
            Clear All
          </button>
        </div>
      )}

      {/* (date range filter moved into table header) */}

      <div className="card shadow-lg border-0">
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 table-borderless invoice-table">
              <thead>
                <tr>
                  <th className="col-company">{renderFilterDropdown('company', 'Company')}</th>
                  <th>Contact</th>
                  <th>{renderFilterDropdown('amount', 'Amount')}</th>

                  <th>{renderDateRangeDropdown('Date of this contract', 'contract')}</th>
                  <th>Billing interval</th>
                  <th className="col-notify">{renderDateRangeDropdown('Notification date', 'notify')}</th>
                  <th style={{ width: '100px' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedRecords.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="text-center">No billing records found.</td>
                  </tr>
                )}
                {displayedRecords.map((r: any) => {
                  const fmt = formatToDDMMYYYY;
                  const toDisplayDate = (val: any) => {
                    if (!val && val !== 0) return '-';

                    // Handle Firestore-like timestamp objects: { seconds, nanoseconds } or { _seconds, _nanoseconds }
                    try {
                      const seconds = val?.seconds ?? val?._seconds;
                      const nanos = val?.nanoseconds ?? val?._nanoseconds;
                      if (seconds !== undefined && seconds !== null) {
                        const s = Number(seconds || 0);
                        const ms = s * 1000 + Math.round((nanos ?? 0) / 1e6);
                        return fmt(new Date(ms));
                      }
                    } catch (e) {
                      // ignore and continue
                    }

                    // If it's a number, decide whether it's seconds or milliseconds
                    if (typeof val === 'number') {
                      // heuristic: timestamps in ms are > 1e12
                      const ms = val > 1e12 ? val : val * 1000;
                      return fmt(new Date(ms));
                    }

                    // If it's a string, try to parse YYYY-MM-DD or ISO and construct a local Date to avoid timezone shifts
                    if (typeof val === 'string') {
                      const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
                      if (m) {
                        const y = Number(m[1]);
                        const mon = Number(m[2]);
                        const d = Number(m[3]);
                        // construct local date (year, monthIndex, day)
                        return fmt(new Date(y, mon - 1, d));
                      }
                      // fallback to Date parsing
                      const parsed = Date.parse(val);
                      if (!isNaN(parsed)) return fmt(new Date(parsed));
                    }

                    // Fallback: let the formatter try its best
                    return fmt(val);
                  };

                  const contractDate = (r.contractStartDate || r.contractEndDate)
                    ? `${r.contractStartDate ? toDisplayDate(r.contractStartDate) : '-'}${r.contractEndDate ? ` - ${toDisplayDate(r.contractEndDate)}` : ''}`
                    : (r.contractDate ? toDisplayDate(r.contractDate) : '-');
                  const billingIntervalText = r.billingIntervalMonths
                    ? `ทุกๆ ${r.billingIntervalMonths} เดือน`
                    : (r.billingCycle || '-');
                  const rawNotify = r.notificationDate ?? r.notificationDay ?? r.notificationTime ?? r.billingDate ?? '-';
                  const notifyDate = rawNotify === '-' ? '-' : toDisplayDate(rawNotify);

                  // Determine Bangkok today and whether billingDate matches today
                  const now = new Date();
                  const bangkokToday = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
                  const bangkokTodayIso = bangkokToday.toISOString().split('T')[0];
                  const billingDateIso = r.billingDate ? (r.billingDate + '').split('T')[0] : null;
                  const isNotifyToday = billingDateIso === bangkokTodayIso;

                  return (
                    <tr key={r.id || `${r.companyId}-${r.billingDate}-${r.amount}`}>
                      <td className="col-company">{r.companyName || r.companyId || '-'}</td>
                      <td>{
                        (() => {
                          // prefer explicit fields on the record
                          const nameFromCombined = r.contactName;
                          const first = r.contactFirstName || r.contactFirst || r.firstName;
                          const last = r.contactLastName || r.contactLast || r.lastName;
                          if (nameFromCombined) return nameFromCombined;
                          if (first || last) return `${(first || '').trim()} ${(last || '').trim()}`.trim();

                          // also check nested contact object on the record (r.contact)
                          const nested = r.contact || r.contactObj || null;
                          if (nested) {
                            const nFirst = nested.firstName || nested.firstname || nested.givenName;
                            const nLast = nested.lastName || nested.lastname || nested.familyName;
                            const nName = nested.name || nested.fullName || nested.displayName || nested.email;
                            if (nFirst || nLast) return `${(nFirst || '').trim()} ${(nLast || '').trim()}`.trim();
                            if (nName) return nName;
                          }

                          // then try to resolve from contactsById fetched from /cruds
                          const contactObj = (r.contactId && contactsById[String(r.contactId)]) || (r.contact && (contactsById[String(r.contact?.id || r.contact?._id || r.contact?._ref)])) || null;
                          if (contactObj) {
                            const cFirst = contactObj.firstName || contactObj.firstname || contactObj.givenName;
                            const cLast = contactObj.lastName || contactObj.lastname || contactObj.familyName;
                            const cName = contactObj.name || contactObj.fullName || contactObj.displayName || contactObj.email;
                            if (cFirst || cLast) return `${(cFirst || '').trim()} ${(cLast || '').trim()}`.trim();
                            if (cName) return cName;
                          }

                          return r.contactId || (r.contact && (r.contact.id || r.contact._id || r.contact._ref)) || '-';
                        })()
                      }</td>
                      <td>{typeof r.amount === 'number' ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(r.amount) : (r.amount ?? '-')}</td>
                      <td>{contractDate}</td>
                      <td>{billingIntervalText}</td>
                      <td className="col-notify">{notifyDate}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2 justify-content-center">
                          {/* keep send-now button even if we don't show a "notify today" column */}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            title="Share"
                            aria-label="Share"
                            onClick={() => handleSendNow(r.id)}
                          >
                            <CiShare1 size={20} style={{ width: 20, height: 20, display: 'inline-block' ,color: '#6b7280 ' ,strokeWidth: 0.8  }} className="action-share" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn edit"
                            title="ดินสอ"
                            aria-label="ดินสอ"
                            onClick={() => navigate(`/billing/create?editId=${r.id}`)}
                          >
                            <FiEdit2 className="action-pencil" />
                          </button>
                          <DeleteConfirmPopover onConfirm={() => handleDelete(r.id)}>
                            <button
                              type="button"
                              className="icon-btn delete"
                              title="ถังขยะ"
                              aria-label="ถังขยะ"
                            >
                              <FiTrash2 />
                            </button>
                          </DeleteConfirmPopover>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
