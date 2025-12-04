import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { FaBuilding, FaUsers, FaTasks, FaDollarSign, FaChartLine } from 'react-icons/fa';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
const withBase = (path) => `${API_BASE_URL}${path}`;
export const DashboardPage = () => {
    const { token, user } = useAuth();
    const [stats, setStats] = useState({
        totalCompanies: 0,
        totalContacts: 0,
        totalActivities: 0,
        pendingActivities: 0,
        totalDeals: 0,
        pipelineValue: 0,
        wonDeals: 0,
        recentActivities: [],
        upcomingTasks: [],
    });
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!token)
            return;
        fetchDashboardData();
    }, [token]);
    const fetchDashboardData = async () => {
        if (!token)
            return;
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
            let activities = [];
            let deals = [];
            try {
                if (activitiesRes.ok) {
                    const contentType = activitiesRes.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        activities = await activitiesRes.json();
                    }
                }
            }
            catch (err) {
                console.warn('Error parsing activities:', err);
            }
            try {
                if (dealsRes.ok) {
                    const contentType = dealsRes.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        deals = await dealsRes.json();
                    }
                }
            }
            catch (err) {
                console.warn('Error parsing deals:', err);
            }
            const pendingActivities = activities.filter((a) => a.status === 'pending' || a.status === 'in_progress');
            const upcomingTasks = activities
                .filter((a) => a.dueDate && new Date(a.dueDate) >= new Date())
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 5);
            const pipelineValue = deals
                .filter((d) => d.stage !== 'lost')
                .reduce((sum, deal) => sum + (deal.amount || 0), 0);
            const wonDeals = deals.filter((d) => d.stage === 'won').length;
            setStats({
                totalCompanies: Array.isArray(companies) ? companies.length : 0,
                totalContacts: Array.isArray(contacts) ? contacts.length : 0,
                totalActivities: Array.isArray(activities) ? activities.length : 0,
                pendingActivities: pendingActivities.length,
                totalDeals: Array.isArray(deals) ? deals.length : 0,
                pipelineValue,
                wonDeals,
                recentActivities: activities.slice(0, 5),
                upcomingTasks,
            });
        }
        catch (err) {
            console.error('Error fetching dashboard data:', err);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "container-fluid", children: _jsx("div", { className: "d-flex justify-content-center align-items-center", style: { minHeight: '400px' }, children: _jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Loading..." }) }) }) }));
    }
    return (_jsxs("div", { className: "container-fluid", children: [_jsxs("div", { className: "d-sm-flex align-items-center justify-content-between mb-4", children: [_jsx("h1", { className: "h3 mb-0 text-gray-800", children: "Dashboard" }), _jsx("div", { children: _jsx("button", { className: "btn btn-sm btn-info", onClick: fetchDashboardData, children: "Refresh" }) })] }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-xl-4 col-md-6 mb-4", children: _jsx("div", { className: "card border-left-primary shadow h-100 py-2", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row no-gutters align-items-center", children: [_jsxs("div", { className: "col mr-2", children: [_jsx("div", { className: "text-xs font-weight-bold text-primary text-uppercase mb-1", children: "Total Companies" }), _jsx("div", { className: "h5 mb-0 font-weight-bold text-gray-800", children: stats.totalCompanies })] }), _jsx("div", { className: "col-auto", children: _jsx(FaBuilding, { className: "fa-2x text-gray-300" }) })] }) }) }) }), _jsx("div", { className: "col-xl-4 col-md-6 mb-4", children: _jsx("div", { className: "card border-left-success shadow h-100 py-2", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row no-gutters align-items-center", children: [_jsxs("div", { className: "col mr-2", children: [_jsx("div", { className: "text-xs font-weight-bold text-success text-uppercase mb-1", children: "Total Contacts" }), _jsx("div", { className: "h5 mb-0 font-weight-bold text-gray-800", children: stats.totalContacts })] }), _jsx("div", { className: "col-auto", children: _jsx(FaUsers, { className: "fa-2x text-gray-300" }) })] }) }) }) }), _jsx("div", { className: "col-xl-4 col-md-6 mb-4", children: _jsx("div", { className: "card border-left-info shadow h-100 py-2", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row no-gutters align-items-center", children: [_jsxs("div", { className: "col mr-2", children: [_jsx("div", { className: "text-xs font-weight-bold text-info text-uppercase mb-1", children: "Pending Activities" }), _jsxs("div", { className: "h5 mb-0 font-weight-bold text-gray-800", children: [stats.pendingActivities, " / ", stats.totalActivities] })] }), _jsx("div", { className: "col-auto", children: _jsx(FaTasks, { className: "fa-2x text-gray-300" }) })] }) }) }) })] }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-xl-6 col-lg-6", children: _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex flex-row align-items-center justify-content-between", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Upcoming Tasks" }), _jsx(Link, { to: "/activities", className: "btn btn-sm btn-primary", children: "View All" })] }), _jsx("div", { className: "card-body", children: stats.upcomingTasks.length === 0 ? (_jsx("p", { className: "text-center text-muted", children: "No upcoming tasks" })) : (_jsx("div", { className: "list-group", children: stats.upcomingTasks.map((task) => (_jsx("div", { className: "list-group-item", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("h6", { className: "mb-1", children: task.title }), _jsxs("small", { className: "text-muted", children: ["Due: ", new Date(task.dueDate).toLocaleString('th-TH', {
                                                                        year: 'numeric',
                                                                        month: '2-digit',
                                                                        day: '2-digit',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                    })] })] }), _jsx("span", { className: `badge ${task.priority === 'high' ? 'bg-danger' :
                                                            task.priority === 'medium' ? 'bg-warning' : 'bg-success'}`, children: task.priority || 'medium' })] }) }, task.id))) })) })] }) }), _jsx("div", { className: "col-xl-6 col-lg-6", children: _jsxs("div", { className: "card shadow mb-4", children: [_jsxs("div", { className: "card-header py-3 d-flex flex-row align-items-center justify-content-between", children: [_jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Recent Activities" }), _jsx(Link, { to: "/activities", className: "btn btn-sm btn-primary", children: "View All" })] }), _jsx("div", { className: "card-body", children: stats.recentActivities.length === 0 ? (_jsx("p", { className: "text-center text-muted", children: "No recent activities" })) : (_jsx("div", { className: "list-group", children: stats.recentActivities.map((activity) => (_jsx("div", { className: "list-group-item", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("h6", { className: "mb-1", children: activity.title }), _jsxs("small", { className: "text-muted", children: [activity.type, " \u2022 ", new Date(activity.createdAt).toLocaleDateString()] })] }), _jsx("span", { className: `badge ${activity.status === 'completed' ? 'bg-success' :
                                                            activity.status === 'in_progress' ? 'bg-info' :
                                                                activity.status === 'cancelled' ? 'bg-secondary' : 'bg-warning'}`, children: activity.status })] }) }, activity.id))) })) })] }) })] }), _jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card shadow mb-4", children: [_jsx("div", { className: "card-header py-3", children: _jsx("h6", { className: "m-0 font-weight-bold text-primary", children: "Quick Actions" }) }), _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-md-4 mb-3", children: _jsxs(Link, { to: "/companies", className: "btn btn-primary w-100", children: [_jsx(FaBuilding, { className: "me-2" }), "Manage Companies"] }) }), _jsx("div", { className: "col-md-4 mb-3", children: _jsxs(Link, { to: "/contacts", className: "btn btn-success w-100", children: [_jsx(FaUsers, { className: "me-2" }), "Manage Contacts"] }) }), _jsx("div", { className: "col-md-4 mb-3", children: _jsxs(Link, { to: "/activities", className: "btn btn-info w-100", children: [_jsx(FaTasks, { className: "me-2" }), "View Activities"] }) })] }) })] }) }) })] }));
};
