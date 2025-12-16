import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { FaPaperPlane } from 'react-icons/fa';
import { API_BASE_URL } from '../config';
// read token directly to avoid circular import/runtime issues

export const BillingPage: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const token = typeof window !== 'undefined' ? localStorage.getItem('crud-token') : null;

    const handleDelete = async (id?: string) => {
      if (!id) return;
      if (!token) {
        alert('Please login to perform this action');
        return;
      }
      const confirmed = window.confirm('Are you sure you want to delete this billing record?');
      if (!confirmed) return;
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

  const handleSendNow = async (id?: string) => {
    if (!id) return;
    // navigate to preview page where user can inspect and send
    navigate(`/billing/preview/${id}`);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Bill</h1>
      </div>

      <div className="card shadow mb-4">
        <div className="card-body">
          <p className="mb-3">This page lists billing records. You can trigger billing jobs from the backend scheduler or create records via the Companies subscription flow.</p>

          <div className="mb-3">
            <button className="btn btn-primary me-2" onClick={fetchRecords} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button className="btn btn-success me-2" onClick={() => navigate('/billing/create')}>
              Create Invoice
            </button>
            <button className="btn btn-outline-secondary"
              onClick={async () => {
                try {
                  if (!token) {
                    alert('Please login as admin to trigger scheduler');
                    return;
                  }
                  const doRun = window.confirm('Run scheduler now?\nOK = run and send emails. Cancel = dry-run (no emails, just show what would be sent).');
                  const payload = { dryRun: !doRun };
                  const headers: any = { 'Content-Type': 'application/json' };
                  if (token) headers.Authorization = `Bearer ${token}`;
                  const resp = await fetch(`${API_BASE_URL}/email/trigger-scheduler`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                  });
                  const data = await resp.json().catch(() => ({}));
                  if (!resp.ok) {
                    const msg = data?.message || (await resp.text()).slice(0, 200);
                    alert(`Trigger failed: ${resp.status} ${msg}`);
                    return;
                  }
                  if (payload.dryRun) {
                    const candidates = data?.result?.candidates || [];
                    alert(`Dry-run complete. ${candidates.length} notification(s) would be sent. Check server response for details.`);
                    console.debug('Dry-run candidates:', candidates);
                  } else {
                    alert(data?.message || 'Scheduler triggered (check server logs)');
                  }
                } catch (err: any) {
                  alert(`Trigger error: ${err.message || err}`);
                }
              }}
            >
              Trigger Scheduler
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>บริษัท</th>
                  <th>ยอดรวม</th>
                  <th>วันที่ของสัญญานี้</th>
                  <th>วันที่แจ้งเตือน</th>
                  <th>แจ้งวันนี้</th>
                  <th>สถานะ</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-center">No billing records found.</td>
                  </tr>
                )}
                {records.map((r: any) => {
                  const contractDate = r.contractStartDate || r.contractEndDate
                    ? `${r.contractStartDate || '-'}${r.contractEndDate ? ` - ${r.contractEndDate}` : ''}`
                    : (r.contractDate || '-');
                  const notifyDate = r.notificationDate || r.notificationDay || r.notificationTime || r.billingDate || '-';

                  // Determine Bangkok today and whether billingDate matches today
                  const now = new Date();
                  const bangkokToday = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
                  const bangkokTodayIso = bangkokToday.toISOString().split('T')[0];
                  const billingDateIso = r.billingDate ? (r.billingDate + '').split('T')[0] : null;
                  const isNotifyToday = billingDateIso === bangkokTodayIso;

                  return (
                    <tr key={r.id || `${r.companyId}-${r.billingDate}-${r.amount}`}>
                      <td>{r.companyName || r.companyId || '-'}</td>
                      <td>{typeof r.amount === 'number' ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(r.amount) : (r.amount ?? '-')}</td>
                      <td>{contractDate}</td>
                      <td>{notifyDate}</td>
                      <td>{isNotifyToday ? <span className="badge bg-success">แจ้งวันนี้</span> : '-'}</td>
                      <td>{r.status || '-'}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {isNotifyToday && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              title="กระดาษจรวด"
                              aria-label="กระดาษจรวด"
                              onClick={() => handleSendNow(r.id)}
                            >
                              <FaPaperPlane />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-light"
                            title="ดินสอ"
                            aria-label="ดินสอ"
                            onClick={() => navigate(`/billing/create?editId=${r.id}`)}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-light text-danger"
                            title="ถังขยะ"
                            aria-label="ถังขยะ"
                            onClick={() => handleDelete(r.id)}
                          >
                            <FiTrash2 />
                          </button>
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
