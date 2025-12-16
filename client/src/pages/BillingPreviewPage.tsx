import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const formatCurrency = (v: number | undefined | null) => {
  if (typeof v !== 'number') return '-';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v);
};

const formatDate = (d?: string | null) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('th-TH'); } catch { return d; }
};

export const BillingPreviewPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('crud-token') : null;

  const fetchRecord = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/billing-records/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
      const data = await res.json();
      setRecord(data || null);
    } catch (err: any) {
      alert(err.message || 'Failed to load billing record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecord(); }, [id]);

  const handleSend = async () => {
    if (!id) return;
    if (!token) {
      alert('Please login to perform this action');
      return;
    }
    const confirmed = window.confirm('Send billing reminder email for this invoice?');
    if (!confirmed) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/billing-records/${id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'preview' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || (await res.text()).slice(0, 200);
        alert(`Send failed: ${res.status} ${msg}`);
        return;
      }
      alert(data?.message || 'Send requested. Check server logs.');
      navigate('/billing');
    } catch (err: any) {
      alert(err.message || 'Failed to send billing reminder');
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="container p-4">Loading invoice...</div>;
  if (!record) return <div className="container p-4">No invoice found.</div>;

  // Prepare line items with robust number parsing and multiple possible field names
  const items: Array<{ description: string; qty: number; unitPrice: number; total: number }> = [];
  const safeNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  if (Array.isArray(record.services) && record.services.length > 0) {
    record.services.forEach((s: any) => {
      const unit = safeNum(s.amount ?? s.price ?? s.unitPrice ?? s.cost ?? s.value);
      const qty = safeNum(s.qty ?? s.quantity) || 1;
      const total = safeNum(s.total ?? unit * qty);
      items.push({ description: s.name || s.description || 'Service', qty, unitPrice: unit, total });
    });
  } else if (Array.isArray(record.items) && record.items.length > 0) {
    record.items.forEach((it: any) => {
      const unit = safeNum(it.unitPrice ?? it.price ?? it.amount ?? it.cost);
      const qty = safeNum(it.qty ?? it.quantity) || 1;
      const total = safeNum(it.total ?? unit * qty);
      items.push({ description: it.description || it.name || 'Item', qty, unitPrice: unit, total });
    });
  } else {
    // Fallback to commonly used single-value fields
    const amt = safeNum(record.amount ?? record.amountDue ?? record.total ?? record.subtotal ?? record.price);
    const qty = 1;
    items.push({ description: record.description || record.note || 'Invoice Amount', qty, unitPrice: amt, total: amt });
  }

  const subtotal = items.reduce((s, it) => s + (safeNum(it.total) || 0), 0);
  const tax = safeNum(record.taxAmount ?? record.tax ?? 0);
  const total = subtotal + tax;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h4 m-0">Invoice Preview</h2>
        <div>
          <button className="btn btn-light me-2" onClick={() => navigate(-1)}>Back</button>
          <button className="btn btn-outline-secondary me-2" onClick={handlePrint}>Print / Download</button>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending}>{sending ? 'Sending...' : 'Send Email'}</button>
        </div>
      </div>

      <div className="card" id="invoice-root" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="card-body p-4" style={{ background: '#fff' }}>
          <div className="d-flex justify-content-between mb-4">
            <div>
              <h4 style={{ margin: 0 }}>{record.companyName || record.companyId}</h4>
              <div className="text-muted">{record.companyAddress || ''}</div>
              <div className="text-muted">{record.companyEmail || ''}</div>
            </div>
            <div className="text-end">
              <h5 style={{ margin: 0 }}>Invoice</h5>
              <div>#{record.id || record.invoiceNumber || ''}</div>
              <div className="text-muted">{formatDate(record.billingDate || record.createdAt)}</div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-borderless">
              <thead>
                <tr className="border-bottom">
                  <th>Description</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Unit</th>
                  <th className="text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className={idx < items.length - 1 ? 'border-bottom' : ''}>
                    <td>{it.description}</td>
                    <td className="text-end">{it.qty}</td>
                    <td className="text-end">{typeof it.unitPrice === 'number' ? formatCurrency(it.unitPrice) : it.unitPrice}</td>
                    <td className="text-end">{formatCurrency(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-end mt-3">
            <div style={{ width: 320 }}>
              <div className="d-flex justify-content-between py-1 border-bottom"><div>Subtotal</div><div>{formatCurrency(subtotal)}</div></div>
              <div className="d-flex justify-content-between py-1 border-bottom"><div>Tax</div><div>{formatCurrency(tax)}</div></div>
              <div className="d-flex justify-content-between py-2"><strong>Total</strong><strong>{formatCurrency(total)}</strong></div>
            </div>
          </div>

          <div className="mt-4">
            <h6>Notes</h6>
            <div style={{ whiteSpace: 'pre-wrap' }}>{record.note || record.message || '-'}</div>
          </div>

          <div className="mt-4 text-muted small">This is a preview. Sending will trigger an email with this invoice link.</div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-root, #invoice-root * { visibility: visible; }
          #invoice-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default BillingPreviewPage;
