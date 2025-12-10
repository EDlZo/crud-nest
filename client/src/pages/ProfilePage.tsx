import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaImage, FaFacebook, FaInstagram } from 'react-icons/fa';
import { SiLine } from 'react-icons/si';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type ProfileData = {
  email: string;
  role?: string;
  avatarUrl?: string;
  socials?: {
    line?: string;
    facebook?: string;
    instagram?: string;
  };
};

const withBase = (path: string) => `${API_BASE_URL}${path}`;

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { token, user, logout, setUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    avatarUrl: '',
    line: '',
    facebook: '',
    instagram: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [token, navigate]);

  const fetchProfile = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(withBase('/auth/profile'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }
      const data = await response.json();
      setProfile(data);
      setFormData({
        avatarUrl: data.avatarUrl || '',
        line: data.socials?.line || '',
        facebook: data.socials?.facebook || '',
        instagram: data.socials?.instagram || '',
      });
      // Set preview if avatarUrl exists and is a data URL or external URL
      if (data.avatarUrl) {
        setAvatarPreview(data.avatarUrl);
      } else {
        setAvatarPreview(null);
      }
      // Sync avatarUrl to user context (for Topbar)
      if (user && data.avatarUrl && user.avatarUrl !== data.avatarUrl) {
        setUser({ ...user, avatarUrl: data.avatarUrl });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resizeImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกรูปภาพเท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    setAvatarFile(file);
    setError(null);

    try {
      // Resize image to max 800x800 and compress to reduce base64 size
      const resizedDataUrl = await resizeImage(file, 800, 800, 0.8);
      setAvatarPreview(resizedDataUrl);
      // Store as data URL for submission
      setFormData((prev) => ({ ...prev, avatarUrl: resizedDataUrl }));
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
      console.error('Image resize error:', err);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setFormData((prev) => ({ ...prev, avatarUrl: '' }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);

    const socials: { line?: string; facebook?: string; instagram?: string } = {
      ...(formData.line.trim() && { line: formData.line.trim() }),
      ...(formData.facebook.trim() && { facebook: formData.facebook.trim() }),
      ...(formData.instagram.trim() && { instagram: formData.instagram.trim() }),
    };

    // Build payload - use type assertion to allow conditional socials
    const payload: {
      avatarUrl?: string;
      socials?: { line?: string; facebook?: string; instagram?: string };
    } = {
      avatarUrl: formData.avatarUrl.trim() || undefined,
      // Send empty object if no socials - backend will delete the field
      socials: Object.keys(socials).length > 0 ? socials : {},
    };

    try {
      const response = await fetch(withBase('/auth/profile'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
      }

      const updated = await response.json();
      setProfile(updated);
      if (updated.avatarUrl) {
        setAvatarPreview(updated.avatarUrl);
      }
      // Trigger custom event to refresh sidebar avatar
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updated }));
      alert('บันทึกข้อมูลสำเร็จ');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
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
        <h1 className="h3 mb-0 text-gray-800">Edit Profile</h1>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Profile Information</h6>
            </div>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              
              <form onSubmit={handleSubmit}>
                {/* Avatar Upload */}
                <div className="mb-4">
                  <label className="form-label d-flex align-items-center">
                    <FaImage className="me-2" />
                    Profile Photo
                  </label>
                  <div className="mb-3">
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                    <small className="form-text text-muted">
                     
                    </small>
                  </div>
                  {avatarPreview && (
                    <div className="mt-3 position-relative d-inline-block">
                      <img
                        src={avatarPreview}
                        alt="Avatar Preview"
                        style={{ 
                          width: '180px',
                          height: '180px',
                          borderRadius: '50%', 
                          objectFit: 'cover',
                          border: '4px solid #dee2e6',
                          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger position-absolute"
                        style={{
                          top: '10px',
                          right: '10px',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onClick={handleRemoveAvatar}
                        title="ลบรูปภาพ"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div className="mb-4">
                  <label className="form-label fw-bold">Social Media</label>
                  
                  <div className="mb-3">
                    <label className="form-label d-flex align-items-center">
                      <SiLine className="me-2" style={{ color: '#00C300' }} />
                      LINE
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="LINE ID หรือ URL"
                      value={formData.line}
                      onChange={(e) => handleChange('line', e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label d-flex align-items-center">
                      <FaFacebook className="me-2" style={{ color: '#1877F2' }} />
                      Facebook
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://facebook.com/yourprofile"
                      value={formData.facebook}
                      onChange={(e) => handleChange('facebook', e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label d-flex align-items-center">
                      <FaInstagram className="me-2" style={{ color: '#E4405F' }} />
                      Instagram
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://instagram.com/yourprofile"
                      value={formData.instagram}
                      onChange={(e) => handleChange('instagram', e.target.value)}
                    />
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={fetchProfile}
                    disabled={submitting}
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Profile Info Sidebar */}
        <div className="col-lg-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Profile Information</h6>
            </div>
            <div className="card-body text-center">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Profile"
                  className="rounded-circle mb-3 d-block mx-auto"
                  style={{ width: '150px', height: '150px', objectFit: 'cover', margin: '0 auto' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
                  }}
                />
              ) : (
                <div
                  className="rounded-circle bg-primary d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: '150px', height: '150px', margin: '0 auto' }}
                >
                  <FaUser size={60} className="text-white" />
                </div>
              )}
              <h5 className="mb-1">{profile?.email || user?.email}</h5>
              <p className="text-muted mb-3">{profile?.role || user?.role || 'Guest'}</p>
              
              {profile?.socials && Object.keys(profile.socials).length > 0 && (
                <div className="mt-4">
                  <h6 className="mb-3">Social Media</h6>
                  <div className="d-flex justify-content-center gap-3">
                    {profile.socials.line && (
                      <a
                        href={profile.socials.line.startsWith('http') ? profile.socials.line : `https://line.me/ti/p/${profile.socials.line}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none"
                      >
                        <SiLine size={24} style={{ color: '#00C300' }} />
                      </a>
                    )}
                    {profile.socials.facebook && (
                      <a
                        href={profile.socials.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none"
                      >
                        <FaFacebook size={24} style={{ color: '#1877F2' }} />
                      </a>
                    )}
                    {profile.socials.instagram && (
                      <a
                        href={profile.socials.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none"
                      >
                        <FaInstagram size={24} style={{ color: '#E4405F' }} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

