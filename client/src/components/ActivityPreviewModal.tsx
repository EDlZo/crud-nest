import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FiEdit2, FiEye } from 'react-icons/fi';
import { FaClock } from 'react-icons/fa';
import formatDateTime from '../utils/formatDate';

// Small UI helpers to mirror ActivitiesPage badges/layout
const getStatusBadge = (status: string | undefined) => {
  const badges: Record<string, { class: string; label: string }> = {
    pending: { class: 'bg-gray-100 text-gray-700 border border-gray-200', label: 'Pending' },
    in_progress: { class: 'bg-blue-50 text-blue-700 border border-blue-100', label: 'In Progress' },
    completed: { class: 'bg-emerald-50 text-emerald-700 border border-emerald-100', label: 'Completed' },
    cancelled: { class: 'bg-gray-50 text-gray-500 border border-gray-200', label: 'Cancelled' },
  };
  return badges[(status as string) || 'pending'] || { class: 'bg-gray-50 text-gray-600 border border-gray-200', label: status || '' };
};

const getPriorityBadge = (priority?: string) => {
  const badges: Record<string, { class: string; label: string }> = {
    low: { class: 'bg-emerald-50 text-emerald-700 border border-emerald-100', label: 'Low' },
    medium: { class: 'bg-amber-50 text-amber-700 border border-amber-100', label: 'Medium' },
    high: { class: 'bg-rose-50 text-rose-700 border border-rose-100', label: 'High' },
  };
  return badges[priority || 'medium'] || badges.medium;
};

const getTypeIcon = (type?: string) => {
  switch (type) {
    case 'task': return { label: 'Task', bg: 'bg-blue-50 text-blue-600' };
    case 'call': return { label: 'Call', bg: 'bg-emerald-50 text-emerald-600' };
    case 'email': return { label: 'Email', bg: 'bg-indigo-50 text-indigo-600' };
    case 'meeting': return { label: 'Meeting', bg: 'bg-purple-50 text-purple-600' };
    default: return { label: type || 'Task', bg: 'bg-gray-50 text-gray-600' };
  }
};

type Props = {
  show: boolean;
  onHide: () => void;
  activity: any | null;
  onSave?: (updated: any) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
};

const ActivityPreviewModal: React.FC<Props> = ({ show, onHide, activity, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (activity) {
      setForm({
        id: activity.id,
        title: activity.title || '',
        description: activity.description || '',
        dueDate: activity.dueDate || activity.start || activity.createdAt || '',
        status: activity.status || 'pending',
        priority: activity.priority || 'medium',
        type: activity.type || 'task',
        assignedTo: activity.assignedTo || '',
        assignedToEmail: activity.assignedToEmail || '',
      });
    } else {
      setForm(null);
    }
  }, [activity]);

  if (!activity) return null;

  const handleChange = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const doSave = async () => {
    try {
      if (onSave) await onSave(form);
      setEditing(false);
      onHide();
    } catch (e) {
      console.error('Failed to save activity from preview', e);
      alert('Failed to save activity');
    }
  };

  const doDelete = async () => {
    try {
      if (onDelete && form?.id) await onDelete(form.id);
      onHide();
    } catch (e) {
      console.error('Failed to delete activity from preview', e);
      alert('Failed to delete activity');
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <div className="flex items-center gap-3" style={{ flex: 1 }}>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <FiEye />
          </div>
          <div>
            <div className="text-lg font-semibold">Activity Details</div>
            <div className="text-sm text-gray-500">{activity.title || ''}</div>
          </div>
        </div>
      </Modal.Header>
      <Modal.Body>
        {/* Badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusBadge(activity.status).class}`}>{getStatusBadge(activity.status).label}</span>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getPriorityBadge(activity.priority).class}`}>{getPriorityBadge(activity.priority).label}</span>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getTypeIcon(activity.type).bg}`}>{getTypeIcon(activity.type).label}</span>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl p-5 mb-6 border border-gray-100">
          <h6 className="text-blue-600 font-semibold mb-2">Description</h6>
          <p className="text-gray-700 whitespace-pre-wrap m-0 leading-relaxed">{activity.description || <span className="text-gray-400 italic">No description provided</span>}</p>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <div className="flex items-center gap-2 mb-1 text-yellow-800 font-semibold"><FaClock /> Due Date & Time</div>
            <p className="text-gray-800 font-medium m-0">{activity.dueDate ? formatDateTime(activity.dueDate) : formatDateTime(activity.createdAt)}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="text-gray-500 font-semibold mb-1 text-sm">Assigned To</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">{(activity.assignedToEmail || '').charAt(0).toUpperCase() || 'P'}</div>
              <span className="text-gray-800 font-medium">{activity.assignedToEmail || activity.assignedTo || '-'}</span>
            </div>
          </div>
        </div>

        {activity.relatedTo && activity.relatedId && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-6">
            <div className="text-blue-600 font-semibold mb-1 text-sm">Related To: {activity.relatedTo}</div>
            <div className="text-gray-800 font-bold">{activity.relatedTo === 'company' ? (activity.raw?.companyName || activity.raw?.company?.name || activity.relatedId) : activity.relatedId}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 border-t border-gray-100 pt-4">
          <div>
            <span className="block font-medium mb-1">Created At</span>
            {activity.createdAt ? new Date(activity.createdAt).toLocaleString('th-TH') : '-'}
          </div>
          <div>
            <span className="block font-medium mb-1">Last Updated</span>
            {activity.updatedAt ? new Date(activity.updatedAt).toLocaleString('th-TH') : '-'}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
        {!editing && <Button variant="primary" onClick={() => setEditing(true)}><FiEdit2 />&nbsp; Edit Activity</Button>}
      </Modal.Footer>
    </Modal>
  );
};

export default ActivityPreviewModal;
