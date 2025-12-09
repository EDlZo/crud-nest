import { FormEvent, useCallback, useEffect, useState } from 'react';
import { FaBell, FaEnvelope, FaPlus, FaPaperPlane, FaSave, FaUserShield } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import '../App.css';

interface Recipient {
    email: string;
    active: boolean;
}

interface NotificationSettings {
    recipients: Recipient[];
    advanceNotification: boolean;
    advanceDays: number;
    onBillingDate: boolean;
    notificationTime: string;
    emailTemplate: string;
    sendToAdmins: boolean;
}

const defaultSettings: NotificationSettings = {
    recipients: [],
    advanceNotification: true,
    advanceDays: 7,
    onBillingDate: true,
    notificationTime: '09:00',
    emailTemplate: '',
    sendToAdmins: false,
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const NotificationSettingsPage = () => {
    const { token } = useAuth();
    const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [sendingBillingTest, setSendingBillingTest] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchSettings = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const response = await fetch(withBase('/notification-settings'), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setSettings({ ...defaultSettings, ...data });
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        setMessage(null);
        try {
            const response = await fetch(withBase('/notification-settings'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(settings),
            });
            if (response.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddRecipient = (e: FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim() || !newEmail.includes('@')) return;
        if (settings.recipients.some((r) => r.email === newEmail.trim())) {
            setMessage({ type: 'error', text: 'Email already exists' });
            return;
        }
        setSettings((prev) => ({
            ...prev,
            recipients: [...prev.recipients, { email: newEmail.trim(), active: true }],
        }));
        setNewEmail('');
    };

    const handleRemoveRecipient = (email: string) => {
        setSettings((prev) => ({
            ...prev,
            recipients: prev.recipients.filter((r) => r.email !== email),
        }));
    };

    const handleToggleRecipient = (email: string) => {
        setSettings((prev) => ({
            ...prev,
            recipients: prev.recipients.map((r) =>
                r.email === email ? { ...r, active: !r.active } : r
            ),
        }));
    };

    const handleSendTestEmail = async () => {
        if (!token) return;
        const activeRecipients = settings.recipients.filter((r) => r.active);
        if (activeRecipients.length === 0) {
            setMessage({ type: 'error', text: 'No active recipients to send test email' });
            return;
        }
        setSendingTest(true);
        setMessage(null);
        try {
            const response = await fetch(withBase('/email/test'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email: activeRecipients[0].email }),
            });
            const data = await response.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Test email sent successfully!' });
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to send test email' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error sending test email' });
        } finally {
            setSendingTest(false);
        }
    };

    // ทดสอบส่ง billing notification ไปยังผู้รับทั้งหมด
    const handleSendBillingTest = async () => {
        if (!token) return;
        setSendingBillingTest(true);
        setMessage(null);
        try {
            const response = await fetch(withBase('/email/test-billing'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ companyName: 'Test Company' }),
            });
            const data = await response.json();
            if (data.success) {
                setMessage({ 
                    type: 'success', 
                    text: `Billing test sent to: ${data.recipients.join(', ')}` 
                });
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to send billing test' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error sending billing test email' });
        } finally {
            setSendingBillingTest(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid p-4">
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid p-4">
            <div className="d-flex align-items-center mb-4">
                <FaBell className="me-3 text-primary" size={28} />
                <h1 className="h3 mb-0 text-gray-800">Notification Settings</h1>
            </div>

            {message && (
                <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`}>
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage(null)} />
                </div>
            )}

            <div className="row">
                {/* Email Recipients */}
                <div className="col-lg-6 mb-4">
                    <div className="card shadow h-100">
                        <div className="card-header py-3 bg-white">
                            <h6 className="m-0 font-weight-bold text-dark d-flex align-items-center">
                                <FaEnvelope className="me-2 text-primary" />
                                Email Recipients
                            </h6>
                        </div>
                        <div className="card-body">
                            <div className="list-group mb-3">
                                {settings.recipients.length === 0 ? (
                                    <div className="text-muted text-center py-3">No recipients added yet</div>
                                ) : (
                                    settings.recipients.map((recipient) => (
                                        <div
                                            key={recipient.email}
                                            className="list-group-item d-flex justify-content-between align-items-center"
                                        >
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={recipient.active}
                                                    onChange={() => handleToggleRecipient(recipient.email)}
                                                    id={`recipient-${recipient.email}`}
                                                />
                                                <label
                                                    className={`form-check-label ${!recipient.active ? 'text-muted' : ''}`}
                                                    htmlFor={`recipient-${recipient.email}`}
                                                >
                                                    {recipient.email}
                                                </label>
                                            </div>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => handleRemoveRecipient(recipient.email)}
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form onSubmit={handleAddRecipient} className="d-flex gap-2">
                                <input
                                    type="email"
                                    className="form-control"
                                    placeholder="Enter email address"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary d-flex align-items-center">
                                    <FaPlus className="me-1" /> Add
                                </button>
                            </form>

                            {/* Send to Admins Toggle */}
                            <div className="mt-4 pt-3 border-top">
                                <div className="form-check form-switch">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        checked={settings.sendToAdmins}
                                        onChange={(e) =>
                                            setSettings((prev) => ({ ...prev, sendToAdmins: e.target.checked }))
                                        }
                                        id="sendToAdmins"
                                    />
                                    <label className="form-check-label d-flex align-items-center" htmlFor="sendToAdmins">
                                        <FaUserShield className="me-2 text-success" />
                                        <span>
                                            <strong>ส่งอีเมลไปยัง Admin/Superadmin ทั้งหมด</strong>
                                            <small className="d-block text-muted">
                                                ดึงอีเมลของ Admin และ Superadmin จากระบบอัตโนมัติ
                                            </small>
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="col-lg-6 mb-4">
                    <div className="card shadow h-100">
                        <div className="card-header py-3 bg-white">
                            <h6 className="m-0 font-weight-bold text-dark d-flex align-items-center">
                                <FaBell className="me-2 text-primary" />
                                Notification Options
                            </h6>
                        </div>
                        <div className="card-body">
                            <div className="form-check mb-3">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={settings.advanceNotification}
                                    onChange={(e) =>
                                        setSettings((prev) => ({ ...prev, advanceNotification: e.target.checked }))
                                    }
                                    id="advanceNotification"
                                />
                                <label className="form-check-label" htmlFor="advanceNotification">
                                    Send advance notification (before billing date)
                                </label>
                            </div>
                            {settings.advanceNotification && (
                                <div className="ms-4 mb-3">
                                    <label className="form-label">Notify days before billing:</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        style={{ width: 100 }}
                                        min={1}
                                        max={30}
                                        value={settings.advanceDays}
                                        onChange={(e) =>
                                            setSettings((prev) => ({
                                                ...prev,
                                                advanceDays: parseInt(e.target.value) || 7,
                                            }))
                                        }
                                    />
                                </div>
                            )}

                            <div className="form-check mb-3">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={settings.onBillingDate}
                                    onChange={(e) =>
                                        setSettings((prev) => ({ ...prev, onBillingDate: e.target.checked }))
                                    }
                                    id="onBillingDate"
                                />
                                <label className="form-check-label" htmlFor="onBillingDate">
                                    Send notification on billing date
                                </label>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Send notification at:</label>
                                <input
                                    type="time"
                                    className="form-control"
                                    style={{ width: 150 }}
                                    value={settings.notificationTime}
                                    onChange={(e) =>
                                        setSettings((prev) => ({ ...prev, notificationTime: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Email Template */}
                <div className="col-12 mb-4">
                    <div className="card shadow">
                        <div className="card-header py-3 bg-white">
                            <h6 className="m-0 font-weight-bold text-dark">Email Template (Optional)</h6>
                        </div>
                        <div className="card-body">
                            <p className="text-muted small mb-2">
                                Use these placeholders: {`{{companyName}}`}, {`{{billingDate}}`}, {`{{billingCycle}}`}, {`{{daysUntilBilling}}`}
                            </p>
                            <textarea
                                className="form-control mb-3"
                                rows={6}
                                placeholder="Leave empty to use default template"
                                value={settings.emailTemplate}
                                onChange={(e) =>
                                    setSettings((prev) => ({ ...prev, emailTemplate: e.target.value }))
                                }
                            />
                            <button
                                className="btn btn-outline-primary me-2"
                                onClick={handleSendTestEmail}
                                disabled={sendingTest}
                            >
                                {sendingTest ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-1" />
                                        Sending...
                                    </>
                                ) : (
                                    <span className="d-flex align-items-center">
                                        <FaPaperPlane className="me-1" /> Send Test Email
                                    </span>
                                )}
                            </button>
                            <button
                                className="btn btn-outline-success"
                                onClick={handleSendBillingTest}
                                disabled={sendingBillingTest}
                            >
                                {sendingBillingTest ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-1" />
                                        Sending...
                                    </>
                                ) : (
                                    <span className="d-flex align-items-center">
                                        <FaBell className="me-1" /> Test Billing Notification
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="d-flex justify-content-end">
                <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <span className="d-flex align-items-center">
                            <span className="spinner-border spinner-border-sm me-1" />
                            Saving...
                        </span>
                    ) : (
                        <span className="d-flex align-items-center">
                            <FaSave className="me-1" /> Save Settings
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};
