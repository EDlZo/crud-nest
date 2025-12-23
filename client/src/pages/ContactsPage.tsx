import { FormEvent, useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiFilter } from 'react-icons/fi';
import { FaPen } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import provincesFallback from '../data/thailand-provinces.json';
import localThailandHierarchy from '../data/thailand-hierarchy.json';
import fullThailandHierarchy from '../data/thailand-hierarchy-full.json';
import thailandFlat from '../data/thailand-hierarchy-full.flat.json';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatDate';
import { getAvatarColor } from '../utils/avatarColor';

type Contact = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  zipcode?: string;
  province?: string;
  amphoe?: string;
  tambon?: string;
  photo?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  userEmail?: string;
  updatedByEmail?: string;
};

const emptyContact: Contact = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  zipcode: '',
  province: '',
  amphoe: '',
  tambon: '',
  photo: '',
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

type FilterState = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export const ContactsPage = () => {
  // Helper: extract tambon/amphoe/province from free-text address if explicit fields are missing.
  const extractThaiPartsFromAddress = (addr?: string) => {
    if (!addr || typeof addr !== 'string') return { tambon: '', amphoe: '', province: '' };
    const s = addr.replace(/\s+/g, ' ').trim();
    // Patterns: ต. / ตำบล ; อ. / อำเภอ ; จ. / จังหวัด
    const tambonMatch = s.match(/(?:ต(?:\.|ำบล)?\s*)([ก-๙\-\s\u0E00-\u0E7F]+)/);
    const amphoeMatch = s.match(/(?:อ(?:\.|ำเภอ)?\s*)([ก-๙\-\s\u0E00-\u0E7F]+)/);
    const provinceMatch = s.match(/(?:จ(?:\.|ังหวัด)?\s*)([ก-๙\-\s\u0E00-\u0E7F]+)/);
    const clean = (m?: RegExpMatchArray | null) => (m && m[1] ? m[1].trim().replace(/\s+/g, ' ') : '');
    return { tambon: clean(tambonMatch), amphoe: clean(amphoeMatch), province: clean(provinceMatch) };
  };

  // Try to infer tambon/amphoe/province by looking up known names in the loaded hierarchy
  const inferPartsByLookup = (addr?: string) => {
    if (!addr || !Array.isArray(thailandHierarchy)) return { tambon: '', amphoe: '', province: '' };
    const s = addr.replace(/\s+/g, ''); // remove spaces for matching
    for (const prov of thailandHierarchy) {
      const pname = (prov.name || prov.province || prov.province_name || '').toString();
      const provClean = pname.replace(/\s+/g, '');
      if (provClean && s.includes(provClean)) {
        // try amphoe / tambon inside this province
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
  const { token, user, logout } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const companyDropdownRef = useRef<HTMLDivElement | null>(null);
  const companyToggleRef = useRef<HTMLButtonElement | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const [hoveredCompanyId, setHoveredCompanyId] = useState<string | null>(null);
  const [openCompaniesFor, setOpenCompaniesFor] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Contact>(emptyContact);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [popupCompanies, setPopupCompanies] = useState<any[] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [thailandHierarchy, setThailandHierarchy] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [avatarHover, setAvatarHover] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [filters, setFilters] = useState<FilterState>({ name: '', email: '', phone: '', address: '' });
  const [activeFilter, setActiveFilter] = useState<keyof FilterState | null>(null);

  const performLogout = () => {
    setContacts([]);
    logout();
  };

  const handleUnauthorized = () => {
    setError('Session expired. Please log in again');
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
        throw new Error('You do not have permission to access this resource');
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

  const fetchCompanies = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(withBase('/companies'), { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const data = await response.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      // ignore companies fetch errors for now
    }
  }, [token]);

  const fetchThailandHierarchy = useCallback(async () => {
    setThailandHierarchy(null); // loading
    try {
      const response = await fetch(withBase('/thailand/hierarchy'));
      if (!response.ok) {
        console.warn('thailand/hierarchy fetch failed', response.status, '— falling back to embedded full hierarchy');
        // If the embedded full hierarchy is a flat array, convert it to hierarchical form
        let fallback: any = Array.isArray(fullThailandHierarchy) ? fullThailandHierarchy : (Array.isArray(localThailandHierarchy) ? localThailandHierarchy : provincesFallback);
        if (Array.isArray(fallback) && fallback.length > 0 && fallback[0].province && fallback[0].amphoe && fallback[0].district) {
          // convert flat to hierarchical
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
        console.log('Loaded thailand hierarchy from backend, provinces:', data.length);
        return;
      }
      // Backend returned empty -> try embedded full hierarchy
      setThailandHierarchy(Array.isArray(fullThailandHierarchy) ? fullThailandHierarchy : (Array.isArray(localThailandHierarchy) ? localThailandHierarchy : provincesFallback));
      console.log('Backend returned empty hierarchy — used embedded fallback');
    } catch (err) {
      console.error('thailand/hierarchy fetch error', err, '— using embedded fallback');
      setThailandHierarchy(Array.isArray(fullThailandHierarchy) ? fullThailandHierarchy : (Array.isArray(localThailandHierarchy) ? localThailandHierarchy : provincesFallback));
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    fetchCompanies();
    fetchThailandHierarchy();
  }, [fetchContacts, fetchCompanies, fetchThailandHierarchy]);

  // Close popup when clicking outside or pressing Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!openCompaniesFor) return;
      const el = popupRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpenCompaniesFor(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCompaniesFor(null);
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openCompaniesFor]);

  // Close company dropdown in modal when clicking outside or pressing Escape
  // Also compute a fixed position so dropdown can open upwards when needed
  useEffect(() => {
    if (!companyDropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const el = companyDropdownRef.current;
      const btn = companyToggleRef.current;
      if (el && !el.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setCompanyDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCompanyDropdownOpen(false);
    };

    // compute position for fixed dropdown
    const btn = companyToggleRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const maxHeight = 260;
      const estimatedHeight = Math.min(maxHeight, (companies.length * 44) + 12);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      let top = rect.bottom + 8;
      if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
        // open upwards
        top = rect.top - estimatedHeight - 8;
      }
      setDropdownPos({ left: rect.left, top, width: rect.width });
    }

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
      setDropdownPos(null);
    };
  }, [companyDropdownOpen, companies.length]);

  const toggleCompany = (id: string) => {
    setSelectedCompanyIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const renderSelectedCompaniesLabel = () => {
    if (selectedCompanyIds.length === 0) return 'Select companies';
    const found = companies.filter(c => selectedCompanyIds.includes(c.id));
    if (found.length === 0) return `${selectedCompanyIds.length} selected`;
    if (found.length === 1) return found[0].name || found[0].branchName || found[0].id;
    if (found.length === 2) return `${found[0].name || found[0].branchName || found[0].id}, ${found[1].name || found[1].branchName || found[1].id}`;
    return `${found[0].name || found[0].branchName || found[0].id} +${found.length - 1}`;
  };

  const handleChange = (key: keyof Contact, value: string) => {
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

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyContact);
    setPhotoPreview('');
    setSelectedCompanyIds([]);
  };

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

    // Build payload and infer missing address parts from free-text address when necessary
    const inferredFromText = (() => {
      const addrText = (formData.address || '').trim();
      const explicit = { tambon: formData.tambon || '', amphoe: formData.amphoe || '', province: formData.province || '' };
      // If explicit fields exist, prefer them. Otherwise try parser and lookup.
      if (explicit.tambon && explicit.amphoe && explicit.province) return explicit;
      const parsed = extractThaiPartsFromAddress(addrText);
      let tambon = explicit.tambon || parsed.tambon;
      let amphoe = explicit.amphoe || parsed.amphoe;
      let province = explicit.province || parsed.province;
      if ((!tambon || !amphoe || !province) && thailandHierarchy) {
        const inferred = inferPartsByLookup(addrText);
        tambon = tambon || inferred.tambon;
        amphoe = amphoe || inferred.amphoe;
        province = province || inferred.province;
      }
      return { tambon: tambon || '', amphoe: amphoe || '', province: province || '' };
    })();

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      province: formData.province || inferredFromText.province || '',
      amphoe: formData.amphoe || inferredFromText.amphoe || '',
      tambon: formData.tambon || inferredFromText.tambon || '',
      zipcode: formData.zipcode || '',
      photo: formData.photo || '',
      companyIds: selectedCompanyIds,
    };

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.phone || !payload.address) {
      setError('Please fill out all fields');
      setSubmitting(false);
      return;
    }

    console.log('Submitting payload:', { ...payload, photo: payload.photo ? `[base64 ${payload.photo.length} chars]` : 'empty' });

    // If photo is present, check approximate size to avoid exceeding server body limits
    if (payload.photo) {
      // base64 string like 'data:image/jpeg;base64,/9j/...' -> estimate bytes from length
      const base64data = payload.photo.split(',')[1] ?? payload.photo;
      const approxBytes = Math.ceil((base64data.length * 3) / 4);
      const approxKB = Math.round(approxBytes / 1024);
      console.log(`Photo approx size: ${approxKB} KB`);
      const MAX_KB = 300; // client-side limit to avoid large payloads
      if (approxKB > MAX_KB) {
        const proceed = window.confirm(
          `The selected photo is large (~${approxKB} KB). Sending it may fail. Continue without photo? (OK = yes, Cancel = keep photo)`,
        );
        if (proceed) {
          delete (payload as any).photo;
          setPhotoPreview('');
        }
      }
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

      console.log('Response status:', response.status);

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (response.status === 403) {
        throw new Error('You do not have permission to edit this record');
      }

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        console.error('Error response:', body);
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }

      const saved = (await response.json()) as Contact;
      console.log('Saved contact:', saved);

      // Ensure UI shows the selected address parts even if backend didn't return them
      try {
        if (saved) {
          (saved as any).province = (saved as any).province || payload.province || '';
          (saved as any).amphoe = (saved as any).amphoe || payload.amphoe || '';
          (saved as any).tambon = (saved as any).tambon || payload.tambon || '';
          (saved as any).address = (saved as any).address || payload.address || '';
        }
      } catch (e) {
        // ignore
      }

      // Update contacts list
      if (isEdit) {
        setContacts((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      } else {
        setContacts((prev) => [saved, ...prev]);
      }

      // Optimistically update companies state so selected companies reflect the saved contact immediately
      try {
        const contactId = saved.id;
        if (contactId) {
          setCompanies((prev) => prev.map((c) => {
            const contactsArr: string[] = Array.isArray(c.contacts) ? [...c.contacts] : [];
            const shouldInclude = selectedCompanyIds.includes(c.id);
            const currentlyIncludes = contactsArr.includes(contactId);
            if (shouldInclude && !currentlyIncludes) {
              return { ...c, contacts: [...contactsArr, contactId] };
            }
            if (!shouldInclude && currentlyIncludes) {
              return { ...c, contacts: contactsArr.filter((x) => x !== contactId) };
            }
            return c;
          }));
        }
      } catch (e) {
        // ignore optimistic update errors
      }
      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error('Submit error:', err);
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
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      province: (contact as any).province || '',
      amphoe: (contact as any).amphoe || '',
      tambon: (contact as any).tambon || '',
      zipcode: (contact as any).zipcode || '',
      photo: contact.photo,
      id: contact.id,
    });
    setPhotoPreview(contact.photo || '');
    // prefill selected companies that include this contact
    try {
      const ids = companies.filter(c => Array.isArray(c.contacts) && c.contacts.includes(contact.id)).map(c => c.id);
      setSelectedCompanyIds(ids);
    } catch (e) {
      setSelectedCompanyIds([]);
    }
    setShowModal(true);
  };

  const handleDelete = async (id?: string) => {
    if (!token || !id) return;
    const confirmed = window.confirm('Are you sure you want to delete this record?');
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
        throw new Error('You do not have permission to delete this record');
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
      // Notify other pages that contacts have changed so they can refresh related lists
      try {
        window.dispatchEvent(new CustomEvent('contacts:changed'));
      } catch (e) {
        // ignore in non-browser environments
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Filter contacts based on search and column filters
  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();

    // Column filters
    if (filters.name && !fullName.includes(filters.name.toLowerCase())) return false;
    if (filters.email && !contact.email?.toLowerCase().includes(filters.email.toLowerCase())) return false;
    if (filters.phone && !contact.phone?.toLowerCase().includes(filters.phone.toLowerCase())) return false;
    if (filters.address && !contact.address?.toLowerCase().includes(filters.address.toLowerCase())) return false;

    // Global search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        fullName.includes(searchLower) ||
        contact.phone?.toLowerCase().includes(searchLower) ||
        contact.address?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearFilter = (field: keyof FilterState) => {
    setFilters(prev => ({ ...prev, [field]: '' }));
    setActiveFilter(null);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({ name: '', email: '', phone: '', address: '' });
    setActiveFilter(null);
    setCurrentPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const renderFilterDropdown = (field: keyof FilterState, label: string) => {
    const isActive = activeFilter === field;
    const hasValue = filters[field] !== '';

    return (
      <div className="position-relative d-inline-block">
        <div
          className="d-flex align-items-center gap-2"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveFilter(isActive ? null : field)}
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
            className="position-fixed bg-white shadow-lg rounded p-3"
            style={{
              zIndex: 9999,
              minWidth: '220px',
              border: '1px solid #e5e7eb',
              marginTop: '8px'
            }}
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
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => clearFilter(field)}
              >
                Clear
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setActiveFilter(null)}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Pagination
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContacts = filteredContacts.slice(startIndex, startIndex + itemsPerPage);

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="d-flex justify-content-between align-items-center mt-4">
        <div className="text-muted">
          {filteredContacts.length} contacts in total
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          {startPage > 1 && (
            <>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(1)}>1</button>
              {startPage > 2 && <span className="px-2">...</span>}
            </>
          )}
          {pages.map(page => (
            <button
              key={page}
              className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-2">...</span>}
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
            </>
          )}
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
          >
            <option value={10}>10 / page</option>
            <option value={12}>12 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container-fluid">
        {/* Page Heading */}
        <div className="d-sm-flex align-items-center justify-content-between mb-4">
          <h1 className="h3 mb-0 text-gray-800">Contacts</h1>
          <div>
            <button className="btn btn-add me-2" onClick={openAddModal}>+ Add New Contact</button>
            <button className="btn-refresh" onClick={fetchContacts} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mb-3 d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted">Filters:</span>
            {Object.entries(filters).map(([key, value]) =>
              value && (
                <span key={key} className="badge bg-primary d-flex align-items-center gap-1" style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}>
                  {key}: {value}
                  <button
                    className="btn-close btn-close-white"
                    style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }}
                    onClick={() => clearFilter(key as keyof FilterState)}
                  />
                </span>
              )
            )}
            <button className="btn btn-sm btn-outline-secondary" onClick={clearAllFilters}>
              Clear All
            </button>
          </div>
        )}

        {/* Contact Table */}
        <div className="card shadow-lg border-0">
          <div className="card-body p-0">
            {contacts.length === 0 && !loading ? (
              <p className="text-center py-5">No contacts yet. Try adding a new one.</p>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fafafa' }}>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          {renderFilterDropdown('name', 'Name')}
                        </th>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          {renderFilterDropdown('email', 'Email')}
                        </th>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          {renderFilterDropdown('phone', 'Phone')}
                        </th>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          {renderFilterDropdown('address', 'Address')}
                        </th>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          Company
                        </th>
                        <th className="border-0 py-3 px-4" style={{ fontWeight: 500, color: '#374151' }}>
                          Last Updated
                        </th>
                        <th className="border-0 py-3 px-4 text-center" style={{ fontWeight: 500, color: '#374151' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedContacts.map((contact) => {
                        const canModify =
                          user?.role === 'admin' || user?.role === 'superadmin' || contact.userId === user?.userId;

                        // Generate pastel avatar color using shared util
                        const avatarColor = getAvatarColor(contact.firstName || contact.email || '');

                        return (
                          <tr key={contact.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td className="py-3 px-4 border-0">
                              <div className="d-flex align-items-center">
                                {contact.photo ? (
                                  <img
                                    src={contact.photo}
                                    alt={`${contact.firstName} ${contact.lastName}`}
                                    className="rounded-circle me-3"
                                    style={{ width: 40, height: 40, objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center me-3 text-white fw-semibold"
                                    style={{
                                      width: 40,
                                      height: 40,
                                      backgroundColor: avatarColor,
                                      fontSize: 16,
                                    }}
                                  >
                                    {contact.firstName?.charAt(0).toUpperCase() || 'C'}
                                  </div>
                                )}
                                <span style={{ fontWeight: 500, color: '#111827' }}>
                                  {contact.firstName} {contact.lastName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 border-0" style={{ color: '#6b7280' }}>
                              {contact.email ?? '-'}
                            </td>
                            <td className="py-3 px-4 border-0" style={{ color: '#6b7280' }}>
                              {contact.phone ?? '-'}
                            </td>
                            <td className="py-3 px-4 border-0" style={{ color: '#6b7280' }}>
                              {(() => {
                                // prefer explicit fields; if missing, try to parse from free-text address
                                const addrText = contact.address ?? '';
                                let tambon = (contact as any).tambon || (contact as any).subdistrict || '';
                                let amphoe = (contact as any).amphoe || (contact as any).district || '';
                                let province = (contact as any).province || (contact as any).province_name || '';
                                if (!tambon || !amphoe || !province) {
                                  const parsed = extractThaiPartsFromAddress(addrText);
                                  tambon = tambon || parsed.tambon;
                                  amphoe = amphoe || parsed.amphoe;
                                  province = province || parsed.province;
                                }
                                // If still missing, attempt lookup against loaded hierarchy
                                if ((!tambon || !amphoe || !province) && thailandHierarchy) {
                                  const inferred = inferPartsByLookup(addrText);
                                  tambon = tambon || inferred.tambon;
                                  amphoe = amphoe || inferred.amphoe;
                                  province = province || inferred.province;
                                }
                                const segments: string[] = [];
                                if (addrText) segments.push(String(addrText).trim());
                                if (tambon) segments.push(`ต.${String(tambon).trim()}`);
                                if (amphoe) segments.push(`อ.${String(amphoe).trim()}`);
                                if (province) segments.push(`จ.${String(province).trim()}`);
                                if ((contact as any).zipcode) segments.push(String((contact as any).zipcode).trim());
                                return segments.length ? segments.join(' ') : '-';
                              })()}
                            </td>
                            <td className="py-3 px-4 border-0" style={{ color: '#6b7280', position: 'relative' }}>
                              {(() => {
                                // find all companies that list this contact in their contacts array
                                const found = companies.filter(c => Array.isArray(c.contacts) && c.contacts.includes(contact.id));
                                if (!found || found.length === 0) return '-';
                                const first = found[0];
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span
                                      role="button"
                                      onClick={() => navigate(`/companies/${first.id}`)}
                                      style={{ cursor: 'pointer', color: '#6b7280', textDecoration: 'none', fontWeight: 500 }}
                                    >
                                      {first.name || first.branchName || first.id}
                                    </span>
                                    {found.length > 1 && (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const next: string | null = openCompaniesFor === contact.id ? null : (contact.id ?? null);
                                          const el = e.currentTarget as HTMLElement;
                                          const rect = el.getBoundingClientRect();
                                          setPopupPosition({ x: rect.left + rect.width / 2, y: rect.bottom });
                                          setPopupCompanies(found);
                                          setOpenCompaniesFor(next);
                                        }}
                                        aria-expanded={openCompaniesFor === contact.id}
                                      >
                                        +{found.length - 1}
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-4 border-0" style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                              <span title={typeof contact.updatedAt === 'string' ? contact.updatedAt : JSON.stringify(contact.updatedAt)}>
                                {formatDateTime(contact.updatedAt)}
                              </span>
                            </td>
                            <td className="py-3 px-4 border-0 text-center">
                              {canModify ? (
                                <div className="d-flex justify-content-center gap-1">
                                  <button className="icon-btn edit" aria-label="edit" title="Edit" onClick={() => handleEdit(contact)}>
                                    <FiEdit2 className="action-pencil" />
                                  </button>
                                  <button className="icon-btn delete" aria-label="delete" title="Delete" onClick={() => handleDelete(contact.id)}>
                                    <FiTrash2 />
                                  </button>
                                </div>
                              ) : (
                                <span className="badge bg-secondary">No permission</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {renderPagination()}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Portal popup rendered at body so it's not affected by card stacking contexts */}
      {openCompaniesFor && popupCompanies && popupPosition && createPortal(
        <div
          ref={popupRef}
          className="shadow-lg bg-white rounded"
          style={{
            position: 'fixed',
            top: popupPosition.y + 8,
            left: popupPosition.x - 110,
            zIndex: 2147483647,
            minWidth: 220,
            border: '1px solid #e5e7eb',
            padding: 8,
          }}
        >
          {popupCompanies.map((c, idx) => (
            <div key={c.id || idx} style={{ padding: '6px 8px', cursor: 'pointer' }}
              onClick={() => { navigate(`/companies/${c.id}`); setOpenCompaniesFor(null); setPopupCompanies(null); }}
            >
              {c.name || c.branchName || c.id}
            </div>
          ))}
        </div>,
        document.body
      )}
      {/* Modal for Add/Edit contact (styled like Activities modal) */}
      {showModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            style={{ animation: 'slideUp 0.18s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100">
              <h5 className="text-xl font-bold text-gray-900 m-0">{editingId ? 'Edit Contact' : 'Add New Contact'}</h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors border-0 bg-transparent p-1 rounded-full hover:bg-gray-100 flex items-center justify-center"
                onClick={closeModal}
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            <div className="px-8 py-8 overflow-y-auto max-h-[85vh]">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Photo Upload */}
                  <div className="md:col-span-2 text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                    <div
                      style={{ display: 'inline-block', marginBottom: 8, position: 'relative' }}
                      onMouseEnter={() => setAvatarHover(true)}
                      onMouseLeave={() => setAvatarHover(false)}
                    >
                      <input
                        id="contact-photo-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_WIDTH = 400;
                                const MAX_HEIGHT = 400;
                                let width = img.width;
                                let height = img.height;
                                if (width > height) {
                                  if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                  }
                                } else {
                                  if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                  }
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx?.drawImage(img, 0, 0, width, height);
                                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                                handleChange('photo', base64String);
                                setPhotoPreview(base64String);
                              };
                              img.src = event.target?.result as string;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="rounded-full"
                          style={{ width: 100, height: 100, objectFit: 'cover', border: '2px solid #ddd', display: 'block' }}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center rounded-full text-white font-semibold"
                          style={{ width: 100, height: 100, backgroundColor: getAvatarColor(formData.firstName || formData.email || ''), fontSize: 36, border: '2px solid #ddd' }}
                        >
                          {formData.firstName?.charAt(0).toUpperCase() || (formData.email ? formData.email.charAt(0).toUpperCase() : 'C')}
                        </div>
                      )}
                      <label
                        htmlFor="contact-photo-input"
                        aria-label="Change profile photo"
                        style={{
                          position: 'absolute',
                          right: -6,
                          top: -6,
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: '#ffffff',
                          display: avatarHover ? 'inline-flex' : 'none',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(2,6,23,0.12)',
                          cursor: 'pointer',
                        }}
                      >
                        <FaPen size={14} className="action-pencil" />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all mb-2"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                        value={formData.province || ''}
                        onChange={(e) => {
                          const prov = e.target.value;
                          handleChange('province', prov);
                          handleChange('amphoe', '');
                          handleChange('tambon', '');
                          handleChange('zipcode', '');
                        }}
                        style={{ flex: 1 }}
                      >
                        {thailandHierarchy === null ? (
                          <option value="">Loading provinces...</option>
                        ) : Array.isArray(thailandHierarchy) && thailandHierarchy.length === 0 ? (
                          <option value="">No provinces loaded</option>
                        ) : (
                          <>
                            <option value="">Select province</option>
                            {Array.isArray(thailandHierarchy) && thailandHierarchy.map((p: any) => (
                              <option key={p.id || p.code || p.province || p.name} value={p.name || p.province || p.name_th || p.province_name || p.code}>
                                {p.name || p.province || p.name_th || p.province_name || p.code}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      {Array.isArray(thailandHierarchy) && thailandHierarchy.length === 0 && (
                        <button type="button" className="px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all shadow-sm" onClick={() => fetchThailandHierarchy()} style={{ whiteSpace: 'nowrap' }}>Retry</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amphoe</label>
                    <select
                      className={`w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all ${!formData.province || !Array.isArray(thailandHierarchy) ? 'text-gray-600' : 'text-gray-700'}`}
                      value={formData.amphoe || ''}
                      onChange={(e) => {
                        handleChange('amphoe', e.target.value);
                        handleChange('tambon', '');
                        handleChange('zipcode', '');
                      }}
                      disabled={!formData.province || !Array.isArray(thailandHierarchy)}
                    >
                      <option value="">Select amphoe</option>
                      {Array.isArray(thailandHierarchy) && formData.province && (() => {
                        const prov = thailandHierarchy.find((x: any) => (x.name || x.province || x.province_name || x.name_th) === formData.province);
                        const amphoes = prov && Array.isArray(prov.amphoes) ? prov.amphoes : (prov && Array.isArray(prov.districts) ? prov.districts : []);
                        return amphoes.map((a: any) => (
                          <option key={a.id || a.code || a.amphoe || a.name} value={a.name || a.amphoe || a.name_th || a.code}>
                            {a.name || a.amphoe || a.name_th || a.code}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tambon</label>
                    <select
                      className={`w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all ${!formData.amphoe || !Array.isArray(thailandHierarchy) ? 'text-gray-600' : 'text-gray-700'}`}
                      value={formData.tambon || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleChange('tambon', val);
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
                      disabled={!formData.amphoe || !Array.isArray(thailandHierarchy)}
                    >
                      <option value="">Select tambon</option>
                      {Array.isArray(thailandHierarchy) && formData.province && formData.amphoe && (() => {
                        const prov = thailandHierarchy.find((x: any) => (x.name || x.province || x.province_name || x.name_th) === formData.province);
                        const amphoes = prov && Array.isArray(prov.amphoes) ? prov.amphoes : (prov && Array.isArray(prov.districts) ? prov.districts : []);
                        const a = amphoes && amphoes.find((aa: any) => (aa.name || aa.amphoe || aa.name_th) === formData.amphoe);
                        const tambons = a && Array.isArray(a.tambons) ? a.tambons : (a && Array.isArray(a.subdistricts) ? a.subdistricts : []);
                        return (tambons || []).map((t: any) => {
                          const display = (typeof t === 'string') ? t : (t.name || t.tambon || t.name_th || t.code || '');
                          const key = (typeof t === 'string') ? display : (t.id || t.code || t.tambon || t.name || display);
                          const value = display;
                          return (
                            <option key={key} value={value}>{display}</option>
                          );
                        });
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zipcode</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                      value={formData.zipcode || ''}
                      onChange={(e) => handleZipcodeChange(e.target.value)}
                      placeholder="Zipcode"
                    />
                  </div>
                </div>

                <div className="mb-4 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Companies</label>
                  <div>
                    <button
                      ref={companyToggleRef}
                      type="button"
                      className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm bg-white flex items-center justify-between"
                      onClick={(e) => { e.stopPropagation(); setCompanyDropdownOpen(prev => !prev); }}
                    >
                      <div style={{ color: selectedCompanyIds.length ? '#111827' : '#6b7280' }}>{renderSelectedCompaniesLabel()}</div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: companyDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 120ms' }}>
                          <path d="M6 9l6 6 6-6" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>
                  </div>
                  {companyDropdownOpen && (
                    <div
                      ref={companyDropdownRef}
                      onClick={(e) => e.stopPropagation()}
                      className="shadow-sm bg-white rounded companies-dropdown mt-2"
                      style={(() => {
                        const base: any = { position: 'fixed', zIndex: 2000, maxHeight: 260, overflow: 'auto', border: '1px solid #e5e7eb', padding: 6, borderRadius: 6 };
                        if (dropdownPos) {
                          return { ...base, left: dropdownPos.left, top: dropdownPos.top, width: dropdownPos.width };
                        }
                        return { ...base, position: 'absolute', left: 0, top: '58px', width: '100%' };
                      })()}
                    >
                      {companies.length === 0 ? (
                        <div className="text-muted px-2">No companies available</div>
                      ) : (
                        companies.map((c) => {
                          const checked = selectedCompanyIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center gap-2 w-100 px-2 py-2 companies-item ${checked ? 'checked' : ''}`}
                              style={{ cursor: 'pointer', borderRadius: 6, marginBottom: 6 }}
                              onClick={() => toggleCompany(c.id)}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                readOnly
                                style={{ width: 16, height: 16 }}
                              />
                              <div style={{ flex: 1 }}>{c.name || c.branchName || c.id}</div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all shadow-sm"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Add contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};