import React, { useEffect, useState } from 'react';
import { formatToDDMMYYYY } from '../utils/formatDate';
import DeleteConfirmPopover from '../components/DeleteConfirmPopover';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const formatCurrency = (v: number | undefined | null) => {
  if (typeof v !== 'number') return '-';
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v);
};

const formatDate = (d?: string | null) => {
  if (!d) return '-';
  return formatToDDMMYYYY(d);
};

export const BillingPreviewPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success'|'error'|'info'; text: string } | null>(null);
  const [emailTemplate, setEmailTemplate] = useState<string>('');
  const [localDraft, setLocalDraft] = useState<string | null>(null);
  const [templateChecked, setTemplateChecked] = useState(false);
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

  // fetch notification settings to get saved email template
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/notification-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (data && typeof data.emailTemplate === 'string') setEmailTemplate(data.emailTemplate || '');
      } catch (err) {
        // ignore template fetch errors silently
        console.debug('Could not fetch notification settings', err);
      }
      finally {
        setTemplateChecked(true);
      }
    };
    fetchTemplate();
  }, [token]);

  // Read any local draft and listen for storage changes so preview reflects edits in Notification Settings
  useEffect(() => {
    try {
      const draft = typeof window !== 'undefined' ? localStorage.getItem('app_email_template_draft') : null;
      setLocalDraft(draft && draft.trim().length > 0 ? draft : null);
    } catch (e) {
      setLocalDraft(null);
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'app_email_template_draft') {
        try {
          const v = e.newValue;
          setLocalDraft(v && v.trim().length > 0 ? v : null);
        } catch (err) {
          setLocalDraft(null);
        }
      }
      if (e.key === null && e.storageArea === localStorage) {
        // storage.clear()
        try { setLocalDraft(localStorage.getItem('app_email_template_draft')); } catch (_) { setLocalDraft(null); }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const renderEmailTemplate = () => {
    const sampleValues: Record<string, string> = {
      companyName: record?.companyName || 'Customer',
      billingDate: formatDate(record?.billingDate || record?.createdAt) || new Date().toLocaleDateString(),
      billingCycle: record?.billingCycle || 'Monthly',
      daysUntilBilling: '0',
    };
    // prefer local draft if present
    const source = localDraft && localDraft.trim().length > 0
      ? localDraft
      : (emailTemplate && emailTemplate.trim().length > 0 ? emailTemplate : '');

    let tpl = source && source.trim().length > 0
      ? source
      : `<p>Dear {{companyName}},<br/>Your billing date is {{billingDate}} ({{billingCycle}}).</p>`;

    // compute invoice-specific values
    const amountStr = formatCurrency(total);
    const invoiceId = (record && (record.id || record._id || record.invoiceId || '')) as string;
    const invoiceNote = (record && record.note) ? String(record.note) : '';

    // render items as small HTML table if placeholder present
    let itemsHtml = '';
    try {
      if (items && items.length > 0) {
        itemsHtml = `<table style="width:100%;border-collapse:collapse;font-family:inherit">`;
        itemsHtml += `<thead><tr><th style="text-align:left;padding:6px;border-bottom:1px solid #e5e7eb">Description</th><th style="text-align:right;padding:6px;border-bottom:1px solid #e5e7eb">Qty</th><th style="text-align:right;padding:6px;border-bottom:1px solid #e5e7eb">Unit</th><th style="text-align:right;padding:6px;border-bottom:1px solid #e5e7eb">Total</th></tr></thead><tbody>`;
        items.forEach((it) => {
          const up = typeof it.unitPrice === 'number' ? formatCurrency(it.unitPrice) : String(it.unitPrice || '-');
          itemsHtml += `<tr><td style="padding:8px 6px;border-bottom:1px solid #f3f4f6">${it.description}</td><td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:right">${it.qty}</td><td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:right">${up}</td><td style="padding:8px 6px;border-bottom:1px solid #f3f4f6;text-align:right">${formatCurrency(it.total)}</td></tr>`;
        });
        itemsHtml += `</tbody></table>`;
      }
    } catch (err) {
      itemsHtml = '';
    }

    // Additionally, if the template contains a <tbody>...</tbody> block (like the provided email template),
    // replace its inner rows with the invoice items so the table renders actual items.
    try {
      if (items && items.length > 0 && /<tbody[\s\S]*?>[\s\S]*?<\/tbody>/i.test(tpl)) {
        // detect number of header columns in the template to inject matching rows
        let thCount = 0;
        try {
          const theadMatch = tpl.match(/<thead[\s\S]*?>[\s\S]*?<tr[\s\S]*?>([\s\S]*?)<\/tr>[\s\S]*?<\/thead>/i);
          if (theadMatch && theadMatch[1]) {
            const ths = theadMatch[1].match(/<th[\s\S]*?>/gi);
            thCount = ths ? ths.length : 0;
          }
        } catch (e) {
          thCount = 0;
        }

        let rowsHtml = '';
        items.forEach((it) => {
          const up = typeof it.unitPrice === 'number' ? formatCurrency(it.unitPrice) : String(it.unitPrice || '-');
          if (thCount > 0 && thCount <= 2) {
            // Template has 2 columns (Item | Total) — render item+qty in first column and total in second
            rowsHtml += `<tr>` +
              `<td style="padding: 20px; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 15px; font-weight: 500;">${it.description}` +
                `${it.qty ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px; font-weight: 400;">Qty: ${it.qty}</div>` : ''}` +
              `</td>` +
              `<td style="padding: 20px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 700; color: #111827; font-size: 15px;">${formatCurrency(it.total)}</td>` +
            `</tr>`;
          } else {
            // Default: render 4-column layout (Description | Qty | Unit | Total)
            rowsHtml += `<tr>` +
              `<td style="padding: 20px; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 15px; font-weight: 500;">${it.description}` +
                `${it.qty ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px; font-weight: 400;">Qty: ${it.qty}</div>` : ''}` +
              `</td>` +
              `<td style="padding: 20px; border-bottom: 1px solid #f3f4f6; text-align: right; color: #4b5563; font-size: 14px;">${it.qty}</td>` +
              `<td style="padding: 20px; border-bottom: 1px solid #f3f4f6; text-align: right; color: #4b5563; font-size: 14px;">${up}</td>` +
              `<td style="padding: 20px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 700; color: #111827; font-size: 15px;">${formatCurrency(it.total)}</td>` +
            `</tr>`;
          }
        });
        // replace all tbody blocks so templates with multiple tables work
        tpl = tpl.replace(/<tbody[\s\S]*?>[\s\S]*?<\/tbody>/gmi, `<tbody>${rowsHtml}</tbody>`);
      }
    } catch (err) {
      // ignore replacement errors
    }

    // placeholder replacements — include invoice-specific ones
    tpl = tpl.replace(/{{\s*companyName\s*}}/gi, sampleValues.companyName)
             .replace(/{{\s*billingDate\s*}}/gi, sampleValues.billingDate)
             .replace(/{{\s*billingCycle\s*}}/gi, sampleValues.billingCycle)
             .replace(/{{\s*daysUntilBilling\s*}}/gi, sampleValues.daysUntilBilling)
             .replace(/{{\s*amountDue\s*}}/gi, amountStr)
             .replace(/{{\s*amount\s*}}/gi, amountStr)
             .replace(/{{\s*price\s*}}/gi, amountStr)
             .replace(/{{\s*unitPrice\s*}}/gi, amountStr)
             .replace(/{{\s*total\s*}}/gi, amountStr)
             .replace(/{{\s*invoiceId\s*}}/gi, invoiceId)
             .replace(/{{\s*invoiceNote\s*}}/gi, invoiceNote)
             .replace(/{{\s*items\s*}}/gi, itemsHtml);

    return tpl;
  };

  const handleSend = async () => {
    if (!id) return;
    if (!token) {
      alert('Please login to perform this action');
      return;
    }
    setSending(true);
    try {
      // prefer unsaved local draft template if present
      const localDraft = typeof window !== 'undefined' ? localStorage.getItem('app_email_template_draft') : null;
      const templateToSend = localDraft && localDraft.trim().length > 0 ? localDraft : emailTemplate;

      const res = await fetch(`${API_BASE_URL}/billing-records/${id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'preview', template: templateToSend }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || (await res.text()).slice(0, 200);
        // ensure UI updates before showing message
        setSending(false);
        setMessage({ type: 'error', text: `Send failed: ${res.status} ${msg}` });
        return;
      }
      // success — update UI then notify and navigate
      setSending(false);
      setMessage({ type: 'success', text: data?.message || 'Send requested. Check server logs.' });
      // navigate after short delay so user sees the message
      setTimeout(() => navigate('/billing'), 1200);
    } catch (err: any) {
      setSending(false);
      setMessage({ type: 'error', text: err.message || 'Failed to send billing reminder' });
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

  const finalTemplateHtml = renderEmailTemplate();

  const hasTemplate = (localDraft && localDraft.trim().length > 0) || (emailTemplate && emailTemplate.trim().length > 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Invoice Preview</h2>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm" onClick={() => navigate(-1)}>Back</button>
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm" onClick={handlePrint}>Print / Download</button>
          <DeleteConfirmPopover
            onConfirm={handleSend}
            title="Confirm Send?"
            confirmText="Send"
            confirmBtnStyle={{ background: '#2563eb', borderColor: '#2563eb', color: 'white' }}
          >
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm flex items-center justify-center min-w-[100px]"
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </DeleteConfirmPopover>
        </div>
      </div>

      {/* If a template (local draft or saved) is present, render that HTML here so Invoice Preview matches Notification Settings.
          Note: we insert raw HTML via dangerouslySetInnerHTML. If you want sanitization, add DOMPurify before inserting. */}
      {(!templateChecked && !hasTemplate) ? (
        // Still checking whether there's a server template; avoid showing the fallback layout to prevent a visual flash.
        <div className="max-w-4xl mx-auto p-24 text-center text-gray-500">Loading preview...</div>
      ) : hasTemplate ? (
        // When rendering a full custom email template, avoid our outer white/shadow frame
        // so the template's own invoice card is the only visible frame.
        <div className="max-w-4xl mx-auto" id="invoice-root" dangerouslySetInnerHTML={{ __html: finalTemplateHtml }} />
      ) : (
        <div className="bg-white rounded-xl shadow-xl overflow-hidden max-w-4xl mx-auto border-t-4 border-[#0d6efd]" id="invoice-root">
          <div className="p-8 md:p-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between mb-12">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{record.companyName || record.companyId}</h1>
                <div className="text-gray-600 leading-relaxed text-sm">
                  {record.companyAddress && <div>{record.companyAddress}</div>}
                  {record.companyEmail && <div>{record.companyEmail}</div>}
                </div>
              </div>
              <div className="text-right mt-6 md:mt-0">
                <h2 className="text-4xl font-black text-gray-200 tracking-wide uppercase mb-2">INVOICE</h2>
                <div className="flex flex-col items-end">
                  {/* ID Removed per request */}
                  <div className="mt-2 text-gray-600 font-medium">Date</div>
                  <div className="text-lg font-bold text-gray-900">{formatDate(record.billingDate || record.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="mb-10 overflow-hidden border border-gray-100 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Qty</th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Unit Price</th>
                    <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-gray-900 font-medium">{it.description}</td>
                      <td className="py-4 px-6 text-gray-600 text-right">{it.qty}</td>
                      <td className="py-4 px-6 text-gray-600 text-right">{typeof it.unitPrice === 'number' ? formatCurrency(it.unitPrice) : it.unitPrice}</td>
                      <td className="py-4 px-6 text-gray-900 font-semibold text-right">{formatCurrency(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-12">
              <div className="w-full md:w-1/3 bg-gray-50 rounded-lg p-6 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600 border-b border-gray-200 pb-3">
                  <span>Tax</span>
                  <span className="font-medium text-gray-900">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between items-center text-lg pt-1">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-[#0d6efd] text-xl">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 pt-8">
              {record.note ? (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Notes</h4>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{record.note}</p>
                </div>
              ) : null}

              <p className="text-gray-400 text-xs text-center mt-8">
                This is a preview. Sending will trigger an email with this invoice link.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-root, #invoice-root * { visibility: visible; }
          #invoice-root { position: absolute; left: 0; top: 0; width: 100%; margin: 0; border: none; shadow: none; }
          /* Ensure colors print */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
};

export default BillingPreviewPage;
