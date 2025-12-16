import { useEffect, useState } from 'react';
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
      ]);

      const companies = companiesRes.ok ? await companiesRes.json() : [];
      const contacts = contactsRes.ok ? await contactsRes.json() : [];

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

      // compute today's date in Asia/Bangkok and match billing-records due today
      const nowBangkok = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const todayStr = nowBangkok.toISOString().split('T')[0];

      const billingDueToday = Array.isArray(billingRecords)
        ? billingRecords.filter((rec: any) => {
            if (!rec) return false;
            // If billingDate is an ISO-ish string or a timestamp, try parsing to YYYY-MM-DD
            try {
              const maybeDate = new Date(rec.billingDate);
              if (!isNaN(maybeDate.getTime())) {
                const iso = maybeDate.toISOString().split('T')[0];
                if (iso === todayStr) return true;
              }
            } catch (err) {
              // ignore
            }

            // Fallback: if billingDate is a day-of-month number (1..31), compare day only
            const dayNum = Number(String(rec.billingDate));
            if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
              return dayNum === nowBangkok.getDate();
            }

            return false;
          })
        : [];

      const pipelineValue = deals
        .filter((d: any) => d.stage !== 'lost')
        .reduce((sum: number, deal: any) => sum + (deal.amount || 0), 0);

      const wonDeals = deals.filter((d: any) => d.stage === 'won').length;

      const totalBills = Array.isArray(billingRecords) ? billingRecords.length : 0;

      setStats({
        totalCompanies: Array.isArray(companies) ? companies.length : 0,
        totalContacts: Array.isArray(contacts) ? contacts.length : 0,
        totalActivities: Array.isArray(activities) ? activities.length : 0,
        pendingActivities: pendingActivities.length,
        totalDeals: Array.isArray(deals) ? deals.length : 0,
        pipelineValue,
        wonDeals,
        recentActivities: activities.slice(0, 5),
        billingDueToday,
        totalBills,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

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
          <button className="btn btn-sm btn-info" onClick={fetchDashboardData}>
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
            <div className="stat-title">Bill</div>
            <div className="stat-value">{new Intl.NumberFormat().format(stats.totalBills)}</div>
          </div>
          <div className="muted-badge">Bill</div>
        </div>
      </div>

      {/* Charts and Lists */}
      <div className="row">
        {/* Billing Due Today */}
        <div className="col-xl-6 col-lg-6">
          <div className="card shadow mb-4 dashboard-gray">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary">Billing Due Today</h6>
              <Link to="/companies" className="btn btn-sm btn-primary">
                View All
              </Link>
            </div>
            <div className="card-body">
              {stats.billingDueToday.length === 0 ? (
                <p className="text-center text-muted">No billing due today</p>
              ) : (
                <div className="list-group">
                  {stats.billingDueToday.map((rec: any) => (
                    <div key={rec.id} className="list-group-item clean">
                      <div>
                        <h6 className="mb-1">
                          <Link to={rec.companyId ? `/companies/${rec.companyId}` : '#'} className="text-decoration-none text-dark fw-semibold">
                            {rec.companyName || 'Unknown Company'}
                          </Link>
                        </h6>
                        <div className="text-muted small">Bill ID: <span className="fw-bold">{rec.id}</span></div>
                        <div className="text-muted small">Amount Due: <span className="fw-bold">฿{typeof rec.amount === 'number'
                          ? rec.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : (rec.amount ? Number(rec.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')}</span></div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        <span className="muted-badge">Due Today</span>
                        <Link to={`/billing/preview/${rec.id}`} className="btn btn-sm btn-outline-primary">Preview</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="col-xl-6 col-lg-6">
          <div className="card shadow mb-4 dashboard-gray">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
              <h6 className="m-0 font-weight-bold text-primary">Recent Activities</h6>
              <Link to="/activities" className="btn btn-sm btn-primary">
                View All
              </Link>
            </div>
            <div className="card-body">
              {stats.recentActivities.length === 0 ? (
                <p className="text-center text-muted">No recent activities</p>
              ) : (
                <div className="list-group">
                  {stats.recentActivities.map((activity: any) => (
                    <div key={activity.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">{activity.title}</h6>
                        <small className="text-muted">{activity.type} • {new Date(activity.createdAt).toLocaleDateString()}</small>
                      </div>
                      <span className={`badge rounded-pill ${activity.status === 'completed' ? 'bg-success' :
                        activity.status === 'in_progress' ? 'bg-info text-white' :
                          activity.status === 'cancelled' ? 'bg-secondary' : 'bg-warning text-dark'
                        } small`}>{activity.status}</span>
                    </div>
                  ))}
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
                <div className="col-md-4 mb-3">
                  <Link to="/companies" className="btn btn-primary w-100 quick-action-btn">
                    <FaBuilding className="btn-icon" />
                    Manage Companies
                  </Link>
                </div>
                <div className="col-md-4 mb-3">
                  <Link to="/contacts" className="btn btn-success w-100 quick-action-btn">
                    <FaUsers className="btn-icon" />
                    Manage Contacts
                  </Link>
                </div>
                <div className="col-md-4 mb-3">
                  <Link to="/activities" className="btn btn-info w-100 quick-action-btn">
                    <FaTasks className="btn-icon" />
                    View Activities
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

