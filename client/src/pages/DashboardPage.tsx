import { useEffect, useState } from 'react';
import { formatToDDMMYYYY } from '../utils/formatDate';
import { FaBuilding, FaUsers, FaTasks, FaDollarSign, FaChartLine } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const withBase = (path: string) => `${API_BASE_URL}${path}`;

type DashboardStats = {
  totalCompanies: number;
  totalContacts: number;
  totalActivities: number;
  pendingActivities: number;
  totalDeals: number;
  pipelineValue: number;
  wonDeals: number;
  recentActivities: any[];
  billingDueToday: any[];
  totalBills: number;
  totalBillAmount: number;
};

export const DashboardPage = () => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalContacts: 0,
    totalActivities: 0,
    pendingActivities: 0,
    totalDeals: 0,
    pipelineValue: 0,
    wonDeals: 0,
    recentActivities: [],

    billingDueToday: [],
    totalBills: 0,
    totalBillAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [
        companiesRes,
        contactsRes,
        activitiesRes,
        dealsRes,
        billingRes,
        settingsRes,
      ] = await Promise.all([
        fetch(withBase('/companies'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(withBase('/cruds'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(withBase('/activities'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(withBase('/deals'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(withBase('/billing-records'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(withBase('/notification-settings'), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const companies = companiesRes.ok ? await companiesRes.json() : [];
      const contacts = contactsRes.ok ? await contactsRes.json() : [];
      const settings = settingsRes.ok ? await settingsRes.json() : {};

      let activities: any[] = [];
      let deals: any[] = [];

      try {
        if (activitiesRes.ok) {
          const contentType = activitiesRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            activities = await activitiesRes.json();
          }
        }
      } catch (err) {
        console.warn('Error parsing activities:', err);
      }

      try {
        if (dealsRes.ok) {
          const contentType = dealsRes.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            deals = await dealsRes.json();
          }
        }
      } catch (err) {
        console.warn('Error parsing deals:', err);
      }

      const pendingActivities = activities.filter((a: any) =>
        a.status === 'pending' || a.status === 'in_progress'
      );

      // Parse billing records before using them
      let billingRecords: any[] = [];
      try {
        if (billingRes && billingRes.ok) {
          billingRecords = await billingRes.json();
        }
      } catch (err) {
        console.warn('Error parsing billing records:', err);
      }

      // Timezone-safe today (Asia/Bangkok)
      const nowBangkok = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const todayIso = nowBangkok.toISOString().split('T')[0];

      // Date logic helpers for alignment
      const addMonths = (iso: string, months: number) => {
        try {
          const d = new Date(iso);
          d.setMonth(d.getMonth() + months);
          return d.toISOString().split('T')[0];
        } catch (e) { return iso; }
      };

      const alignOccurrence = (anchor: string, interval: number, today: string) => {
        let current = anchor;
        const anchorDate = new Date(anchor);
        const todayDate = new Date(today);

        if (anchorDate > todayDate) {
          while (true) {
            const prev = addMonths(current, -interval);
            if (new Date(prev) < todayDate) break;
            current = prev;
          }
        } else {
          while (new Date(current) < todayDate) {
            current = addMonths(current, interval);
          }
        }
        return current;
      };

      // Enrich and filter billing records
      const billingDueToday = (Array.isArray(billingRecords) ? billingRecords : []).map((rec: any) => {
        const copy = { ...rec };
        if (!copy.billingDate) return null;

        const interval = Number(copy.billingIntervalMonths || 0);
        let alignedDate = copy.billingDate.split('T')[0];

        if (interval > 0) {
          alignedDate = alignOccurrence(alignedDate, interval, todayIso);
        }

        copy.alignedBillingDate = alignedDate;

        // Contact name enrichment
        if (!copy.contactName) {
          try {
            const cid = copy.contactId || (copy.contact && (copy.contact.id || copy.contact._id || copy.contact)) || null;
            if (cid && Array.isArray(contacts)) {
              const found = contacts.find((c: any) => String(c.id) === String(cid) || String(c._id) === String(cid));
              if (found) {
                copy.contactName = ((found.firstName || found.lastName) ? `${(found.firstName || '').trim()} ${(found.lastName || '').trim()}`.trim() :
                  found.name || found.fullName || found.displayName || found.email || String(found.id));
              }
            }
          } catch (e) { }
        }
        return copy;
      }).filter((rec: any) => {
        if (!rec) return false;

        const alignedDate = rec.alignedBillingDate;

        // Exact match for today
        if (alignedDate === todayIso) return true;

        // Advance notification logic
        if (settings.advanceDays > 0) {
          try {
            const dAligned = new Date(alignedDate);
            const dToday = new Date(todayIso);
            const diffMs = dAligned.getTime() - dToday.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays > 0 && diffDays <= settings.advanceDays) return true;
          } catch (e) { }
        }

        return false;
      });

      const pipelineValue = deals
        .filter((d: any) => d.stage !== 'lost')
        .reduce((sum: number, deal: any) => sum + (deal.amount || 0), 0);

      const wonDeals = deals.filter((d: any) => d.stage === 'won').length;

      const totalBills = Array.isArray(billingRecords) ? billingRecords.length : 0;
      const totalBillAmount = Array.isArray(billingRecords)
        ? billingRecords.reduce((sum: number, r: any) => {
          const amt = typeof r.amount === 'number' ? r.amount : (r.amount ? Number(r.amount) : 0);
          return sum + (isNaN(amt) ? 0 : amt);
        }, 0)
        : 0;

      setStats({
        totalCompanies: Array.isArray(companies) ? companies.length : 0,
        totalContacts: Array.isArray(contacts) ? contacts.length : 0,
        totalActivities: Array.isArray(activities) ? activities.length : 0,
        pendingActivities: pendingActivities.length,
        totalDeals: Array.isArray(deals) ? deals.length : 0,
        pipelineValue,
        wonDeals,
        recentActivities: activities.slice(0, 3),
        billingDueToday: billingDueToday.slice(0, 3),
        totalBills,
        totalBillAmount,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { class: string; label: string }> = {
      pending: { class: 'bg-gray-100 text-gray-700 border border-gray-200', label: 'Pending' },
      in_progress: { class: 'bg-blue-50 text-blue-700 border border-blue-100', label: 'In Progress' },
      completed: { class: 'bg-emerald-50 text-emerald-700 border border-emerald-100', label: 'Completed' },
      cancelled: { class: 'bg-gray-50 text-gray-500 border border-gray-200', label: 'Cancelled' },
    };
    return badges[status] || { class: 'bg-gray-50 text-gray-600 border border-gray-200', label: status };
  };

  // use shared formatter from utils

  /* Calendar widget removed per request */

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Dashboard</h1>
        <div>
          <button className="btn-refresh" onClick={fetchDashboardData}>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon"><FaBuilding /></div>
          <div className="stat-body">
            <div className="stat-title">Total Companies</div>
            <div className="stat-value">{new Intl.NumberFormat().format(stats.totalCompanies)}</div>
          </div>
          <div className="muted-badge">Companies</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><FaUsers /></div>
          <div className="stat-body">
            <div className="stat-title">Total Contacts</div>
            <div className="stat-value">{new Intl.NumberFormat().format(stats.totalContacts)}</div>
          </div>
          <div className="muted-badge">Contacts</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><FaTasks /></div>
          <div className="stat-body">
            <div className="stat-title">Pending Activities</div>
            <div className="stat-value">{stats.pendingActivities} / {stats.totalActivities}</div>
          </div>
          <div className="muted-badge">Activities</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><FaDollarSign /></div>
          <div className="stat-body">
            <div className="stat-title">Invoice</div>
            <div className="stat-value">{new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(stats.totalBillAmount || 0)}</div>
          </div>
          <div className="muted-badge">{new Intl.NumberFormat().format(stats.totalBills)} Bill</div>
        </div>
      </div>

      {/* Calendar removed */}

      {/* Charts and Lists */}
      <div className="row">
        {/* Billing Due Today */}
        <div className="col-xl-6 col-lg-6">
          <div className="card shadow mb-4 dashboard-gray">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary">Upcoming & Due Today</h6>
              <Link to="/billing" className="view-all-btn no-hover-shadow small">
                View All
              </Link>
            </div>
            <div className="card-body">
              {stats.billingDueToday.length === 0 ? (
                <div>
                  <p className="text-center text-muted">No billing due today</p>
                </div>
              ) : (
                <div className="list-group">
                  {stats.billingDueToday.map((rec: any) => (
                    <div key={rec.id} className="list-group-item clean dashboard-item">
                      <div>
                        <h6 className="mb-1">
                          <Link to={rec.companyId ? `/companies/${rec.companyId}` : '#'} className="text-decoration-none text-dark fw-semibold">
                            {rec.companyName || 'Unknown Company'}
                          </Link>
                        </h6>
                        <div className="text-muted small">Date of this contract: <span className="fw-bold">{
                          (rec.contractStartDate || rec.contractEndDate)
                            ? `${rec.contractStartDate ? formatToDDMMYYYY(rec.contractStartDate) : '-'}${rec.contractEndDate ? ` - ${formatToDDMMYYYY(rec.contractEndDate)}` : ''}`
                            : (rec.contractDate ? formatToDDMMYYYY(rec.contractDate) : '-')
                        }</span></div>
                        {(rec.contactName) && (
                          <div className="text-muted small">Contact: <span className="fw-bold">{rec.contactName}</span></div>
                        )}
                        <div className="text-muted small">Amount Due: <span className="fw-bold">฿{typeof rec.amount === 'number'
                          ? rec.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : (rec.amount ? Number(rec.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')}</span></div>

                        {/* Show billing date or day-of-month */}
                        <div className="text-muted small">Billing Date: <span className="fw-bold">{
                          formatToDDMMYYYY(rec.alignedBillingDate || rec.billingDate)
                        }</span></div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        {(() => {
                          const nowBangkok = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
                          const tIso = nowBangkok.toISOString().split('T')[0];
                          if (rec.alignedBillingDate === tIso) {
                            return <span className="muted-badge pill" style={{ color: '#0D6EFD' }}>Due Today</span>;
                          }
                          try {
                            const dAligned = new Date(rec.alignedBillingDate);
                            const dToday = new Date(tIso);
                            const diffMs = dAligned.getTime() - dToday.getTime();
                            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                            if (diffDays > 0) return <span className="muted-badge pill" style={{ color: '#198754' }}>Upcoming ({diffDays} Day)</span>;
                            if (diffDays < 0) return <span className="muted-badge pill" style={{ color: '#dc3545' }}>Overdue ({Math.abs(diffDays)} Day)</span>;
                          } catch (e) { }
                          return <span className="muted-badge" style={{ color: '#198754' }}>Upcoming</span>;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* debug view removed */}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="col-xl-6 col-lg-6">
          <div className="card shadow mb-4 dashboard-gray">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary">Recent Activities</h6>
              <Link to="/activities" className="view-all-btn no-hover-shadow small">
                View All
              </Link>
            </div>
            <div className="card-body">
              {stats.recentActivities.length === 0 ? (
                <p className="text-center text-muted">No recent activities</p>
              ) : (
                <div className="list-group">
                  {stats.recentActivities.map((activity: any) => {
                    const s = getStatusBadge(activity.status);
                    return (
                      <div key={activity.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{activity.title}</h6>
                          <small className="text-muted">{activity.type} • {formatToDDMMYYYY(activity.createdAt)}</small>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${s.class}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow mb-4 dashboard-gray">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Quick Actions</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 mb-3">
                  <Link to="/contacts" className="btn btn-success w-100 quick-action-btn">
                    <FaUsers className="btn-icon" />
                    Contact
                  </Link>
                </div>
                <div className="col-md-3 mb-3">
                  <Link to="/companies" className="btn btn-primary w-100 quick-action-btn">
                    <FaBuilding className="btn-icon" />
                    Companies
                  </Link>
                </div>
                <div className="col-md-3 mb-3">
                  <Link to="/billing" className="btn btn-warning w-100 quick-action-btn">
                    <FaDollarSign className="btn-icon" />
                    Invoice
                  </Link>
                </div>
                <div className="col-md-3 mb-3">
                  <Link to="/activities" className="btn btn-info w-100 quick-action-btn">
                    <FaTasks className="btn-icon" />
                    Activities
                  </Link>
                </div>
                {/* Deals Pipeline - Hidden temporarily */}
                {/* <div className="col-md-4 mb-3">
                  <Link to="/deals" className="btn btn-warning w-100">
                    <FaChartLine className="me-2" />
                    View Deals
                  </Link>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

