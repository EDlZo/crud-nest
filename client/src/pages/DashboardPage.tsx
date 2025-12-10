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
      const [companiesRes, contactsRes, activitiesRes, dealsRes] = await Promise.all([
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

      const todayDay = new Date().getDate().toString();


      const billingDueToday = Array.isArray(companies)
        ? companies.filter((c: any) => String(c.billingDate) === todayDay)
        : [];

      const pipelineValue = deals
        .filter((d: any) => d.stage !== 'lost')
        .reduce((sum: number, deal: any) => sum + (deal.amount || 0), 0);

      const wonDeals = deals.filter((d: any) => d.stage === 'won').length;

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
      <div className="row">
        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Companies
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.totalCompanies}
                  </div>
                </div>
                <div className="col-auto">
                  <FaBuilding className="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Total Contacts
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.totalContacts}
                  </div>
                </div>
                <div className="col-auto">
                  <FaUsers className="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Pending Activities
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.pendingActivities} / {stats.totalActivities}
                  </div>
                </div>
                <div className="col-auto">
                  <FaTasks className="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Value - Hidden temporarily */}
        {/* <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Pipeline Value
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(stats.pipelineValue)}
                  </div>
                </div>
                <div className="col-auto">
                  <FaDollarSign className="fa-2x text-gray-300" />
                </div>
              </div>
            </div>
          </div>
        </div> */}
      </div>

      {/* Charts and Lists */}
      <div className="row">
        {/* Billing Due Today */}
        <div className="col-xl-6 col-lg-6">
          <div className="card shadow mb-4">
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
                  {stats.billingDueToday.map((company: any) => (
                    <div key={company.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">
                            <Link to={`/companies/${company.id}`} className="text-decoration-none text-dark">
                              {company.name}
                            </Link>
                          </h6>
                          <small className="text-muted">
                            Amount Due: ฿{typeof company.amountDue === 'number'
                              ? company.amountDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '0.00'}
                          </small>
                        </div>
                        <span className="badge bg-warning text-dark">
                          Due Today
                        </span>
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
          <div className="card shadow mb-4">
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
                    <div key={activity.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{activity.title}</h6>
                          <small className="text-muted">
                            {activity.type} • {new Date(activity.createdAt).toLocaleDateString()}
                          </small>
                        </div>
                        <span className={`badge ${activity.status === 'completed' ? 'bg-success' :
                          activity.status === 'in_progress' ? 'bg-info' :
                            activity.status === 'cancelled' ? 'bg-secondary' : 'bg-warning'
                          }`}>
                          {activity.status}
                        </span>
                      </div>
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
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Quick Actions</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <Link to="/companies" className="btn btn-primary w-100">
                    <FaBuilding className="me-2" />
                    Manage Companies
                  </Link>
                </div>
                <div className="col-md-4 mb-3">
                  <Link to="/contacts" className="btn btn-success w-100">
                    <FaUsers className="me-2" />
                    Manage Contacts
                  </Link>
                </div>
                <div className="col-md-4 mb-3">
                  <Link to="/activities" className="btn btn-info w-100">
                    <FaTasks className="me-2" />
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

