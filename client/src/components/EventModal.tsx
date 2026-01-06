import React, { useEffect, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaLink } from 'react-icons/fa';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import DeleteConfirmPopover from './DeleteConfirmPopover';

// Format date for display: dd/Mon/yyyy where Mon is English short month like 'Dec'
const formatDisplayDate = (isoOrDate?: string | null) => {
  try {
    if (!isoOrDate) return '';
    // Accept YYYY-MM-DD or full ISO
    const s = String(isoOrDate).trim();
    const parts = s.includes('T') ? s.split('T')[0] : (s.includes('/') ? s.split(' ')[0] : s);
    const [y, m, d] = parts.split('-').map(Number);
    if (!y || !m || !d) return s;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mon = months[(m - 1) % 12] || '';
    const dd = String(d).padStart(2, '0');
    return `${dd} ${mon} ${y}`;
  } catch (err) { return isoOrDate || ''; }
};

type EventItem = {
  id: string;
  date: string; // yyyy-MM-dd
  title: string;
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  description?: string;
  reminder?: string; // none | 15m | 1h | 1d
  ownerEmail?: string;
};

type Props = {
  show: boolean;
  onHide: () => void;
  onSave: (ev: EventItem) => void;
  onDelete?: (id: string) => void;
  initial?: Partial<EventItem> | null;
};

const EventModal: React.FC<Props> = ({ show, onHide, onSave, onDelete, initial }) => {
  // Prevent rendering content when `show` is true but `initial` is still undefined or intentionally cleared (null).
  // This avoids a brief render in edit mode before the `initial` prop arrives or after parent clears it which causes flicker.
  if (show && (initial === undefined || initial === null)) return null;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [reminder, setReminder] = useState('none');

  const [userRequestedEdit, setUserRequestedEdit] = useState(false);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '');
      setDate(initial.date || '');
      setStartTime(initial.startTime || '');
      setEndTime(initial.endTime || '');
      setDescription(initial.description || '');
      setReminder(initial.reminder || 'none');
      setUserRequestedEdit(false);
    } else {
      setTitle('');
      setDate('');
      setStartTime('');
      setEndTime('');
      setDescription('');
      setReminder('none');
      setUserRequestedEdit(false);
    }
  }, [initial, show]);

  // Determine if this is a new event (no id) -> default to edit mode.
  const isNew = !(initial && (initial as any).id);
  const editing = userRequestedEdit || isNew;

  const handleSave = () => {
    if (!title || !date) {
      alert('Please enter title and date');
      return;
    }
    const ev: EventItem = {
      id: (initial && (initial.id as string)) || String(Date.now()),
      date,
      title,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      description: description || undefined,
      reminder: reminder || undefined,
    };
    onSave(ev);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <div className="px-8 py-6 flex justify-between items-center border-b border-gray-100">
        <h5 className="text-xl font-bold text-gray-900 m-0">{initial ? (initial.title || 'Event') : (title || 'New Event')}</h5>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Icons: pencil (edit) and trash (delete) */}
          {initial && initial.id && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button
                type="button"
                className="icon-btn edit"
                title="Edit"
                aria-label={`Edit ${initial.title || 'event'}`}
                onClick={() => setUserRequestedEdit(true)}
              >
                <FiEdit2 className="action-pencil" />
              </button>
              {onDelete && (
                <DeleteConfirmPopover onConfirm={() => { if (initial && initial.id) { onDelete(initial.id as string); onHide(); } }} placement="top">
                  <button
                    type="button"
                    className="icon-btn delete"
                    title="Delete"
                    aria-label={`Delete ${initial.title || 'event'}`}
                  >
                    <FiTrash2 />
                  </button>
                </DeleteConfirmPopover>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal.Body className="px-8 py-8 overflow-y-auto max-h-[85vh]">
        {initial && !editing ? (
          // View mode: show details similar to attachment
          <div>
            <div style={{ marginBottom: 8, color: '#6c757d', fontSize: 13 }}>{formatDisplayDate(date || initial.date)} {startTime || initial.startTime ? `• ${startTime || initial.startTime}${initial.endTime ? ' - ' + (endTime || initial.endTime) : ''}` : ''}</div>
            <div style={{ marginBottom: 12 }}>{description || initial.description || <span className="text-muted">No description</span>}</div>
            {/* show join link if description contains http */}
            {((description || initial.description) || '').toString().match(/https?:\/\//) ? (
              <div className="mb-2">
                <a className="btn btn-primary btn-sm" href={((description || initial.description) || '').toString().match(/https?:\/\/[\S]+/)?.[0]} target="_blank" rel="noreferrer"><FaLink style={{ marginRight: 6 }} /> เข้าร่วม</a>
              </div>
            ) : null}
            <div style={{ marginTop: 12, color: '#6c757d', fontSize: 13 }}>
              <div>เตือน : {reminder || initial.reminder || 'None'}</div>
            </div>
          </div>
        ) : (
          // Edit/create form styled like Add Contact
          <form>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input
                    type="time"
                    className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <input
                    type="time"
                    className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder</label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all"
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="15m">15 minutes before</option>
                  <option value="1h">1 hour before</option>
                  <option value="1d">1 day before</option>
                </select>
              </div>
            </div>
          </form>
        )}
      </Modal.Body>

      <div className="px-8 py-6 flex justify-end gap-4 border-t border-gray-100">
        <button
          type="button"
          className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center leading-none"
          onClick={() => { onHide(); setUserRequestedEdit(false); }}
          style={{ lineHeight: 1 }}
        >
          Close
        </button>

        {editing && (
          <button
            type="button"
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center leading-none"
            onClick={handleSave}
            disabled={false}
            style={{ lineHeight: 1 }}
          >
            {initial ? 'Save' : 'Create'}
          </button>
        )}
      </div>
    </Modal>
  );
};

export default EventModal;
