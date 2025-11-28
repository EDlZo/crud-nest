import { FormEvent, useState } from 'react';
import '../App.css';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../utils/api';

export const CompaniesPage = () => {
  const { token } = useAuth();
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    fax: '',
    taxId: '',
    branchName: '',
    branchNumber: '',
    website: '',
    contactEmail: '',
    // Socials
    lineId: '',
    facebook: '',
    instagram: '',
    avatarUrl: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.name) {
      setError('Please enter company name');
      return;
    }

    setSubmitting(true);
    try {
      // Construct payload matching Backend DTO
      const payload = {
        name: form.name,
        address: form.address,
        phone: form.phone,
        fax: form.fax,
        taxId: form.taxId,
        branchName: form.branchName,
        branchNumber: form.branchNumber,
        avatarUrl: form.avatarUrl,
        // Map flat social fields to socials object
        socials: {
          line: form.lineId,
          facebook: form.facebook,
          instagram: form.instagram,
          website: form.website, // Assuming we put website in socials or keep it separate if backend supports it. 
          // Based on DTO, socials is Record<string, string>. I'll put website there too if it's not a direct field.
          // But wait, previous code had website in form. I'll keep it in socials for now as DTO didn't show website field.
        },
        // contactEmail: form.contactEmail // DTO didn't show this, but I'll send it just in case or maybe it's unused.
      };

      await apiFetch('/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      setSuccess('Company submitted successfully. Thank you');
      setForm({
        name: '', address: '', phone: '', fax: '', taxId: '', branchName: '', branchNumber: '',
        website: '', contactEmail: '', lineId: '', facebook: '', instagram: '', avatarUrl: ''
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid">
      <h1 className="h3 mb-4 text-gray-800">Submit Company / Organization</h1>

      <div className="card shadow mb-4">
        <div className="card-header py-3">
          <h6 className="m-0 font-weight-bold text-primary">General Information</h6>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Company Name <span className="text-danger">*</span></label>
                <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Tax ID</label>
                <input className="form-control" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Branch Name</label>
                <input className="form-control" value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Branch Code</label>
                <input className="form-control" value={form.branchNumber} onChange={(e) => setForm({ ...form, branchNumber: e.target.value })} />
              </div>

              <div className="col-md-12 mb-3">
                <label className="form-label">Address</label>
                <textarea className="form-control" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Fax</label>
                <input className="form-control" value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })} />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Contact Email</label>
                <input type="email" className="form-control" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Avatar URL</label>
                <input className="form-control" value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://example.com/logo.png" />
              </div>
            </div>

            <hr />
            <h6 className="m-0 font-weight-bold text-primary mb-3">Social Media</h6>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Website</label>
                <input className="form-control" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">LINE ID</label>
                <input className="form-control" value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Facebook</label>
                <input className="form-control" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Instagram</label>
                <input className="form-control" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
              </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Save'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
