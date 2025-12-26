import React, { useMemo, useState, useEffect, useRef } from 'react';
import '../App.css';
import { Calendar as RBCalendar, Views, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FaChevronLeft, FaChevronRight, FaPlus } from 'react-icons/fa';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { parse as parseDate, startOfWeek, getDay, format, addHours, isSameDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import enUS from 'date-fns/locale/en-US';
import EventModal from '../components/EventModal';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  // value: string, formatString: string => Date
  parse: (value: string, formatString: string) => parseDate(value, formatString, new Date()),
  startOfWeek: () => startOfWeek(new Date()),
  getDay,
  locales,
});

// Custom toolbar to show arrows instead of "Back/Next" buttons and an Add button
const CustomToolbar: React.FC<any & { onAdd?: () => void }> = ({ label, onNavigate, onView, views, view, onAdd }) => {
  const handlePrev = () => onNavigate('PREV');
  const handleNext = () => onNavigate('NEXT');
  const handleToday = () => onNavigate('TODAY');

  return (
    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
      <div className="flex items-center gap-3 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
        <button
          className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
          onClick={handlePrev}
          aria-label="Previous"
        >
          <FaChevronLeft className="w-4 h-4" />
        </button>
        <button
          className="px-3 py-1 font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-sm"
          onClick={handleToday}
        >
          Today
        </button>
        <button
          className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
          onClick={handleNext}
          aria-label="Next"
        >
          <FaChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="text-xl font-bold text-gray-800 tracking-tight">
        {label}
      </div>

      <div className="flex items-center gap-4">
        {views && Object.keys(views).length !== 0 && (
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['month', 'week', 'day'].map(v => (
              <button
                key={v}
                type="button"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${v === String(view)
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                onClick={() => onView(v)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm flex items-center justify-center min-w-[100px] gap-2"
          onClick={() => onAdd && onAdd()}
          aria-label="Add event"
        >
          
          <span>+ Add Event</span>
        </button>
      </div>
    </div>
  );
};

const DnDCalendar = withDragAndDrop(RBCalendar);

const CalendarPage: React.FC = () => {
  const today = new Date();
  const STORAGE_KEY = 'app_calendar_events_v1';
  const { token } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<Array<any>>([]);
  const [billingEvents, setBillingEvents] = useState<Array<any>>([]);
  const [activityEvents, setActivityEvents] = useState<Array<any>>([]);
  const ACTIVITY_STORAGE_KEY = 'app_activity_events_v1';

  // restore cached activity events from localStorage so they persist across refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (raw) setActivityEvents(JSON.parse(raw));
    } catch (e) { /* ignore */ }
    // run only once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  // activity preview is handled by navigating to Activities detail page
  const handleActivitySave = async (updated: any) => {
    try {
      const id = updated.id;
      const exists = activityEvents.find((a: any) => String(a.raw?.id || a.id).replace(/^activity-/, '') === String(id) || String(a.id).replace(/^activity-/, '') === String(id));
      if (token) {
        const res = await fetch(`${API_BASE_URL}/activities/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(updated),
        });
        if (res.ok) {
          const data = await res.json();
          // update activityEvents
          const next = activityEvents.map((a: any) => {
            const aid = String(a.raw?.id || a.id).replace(/^activity-/, '');
            if (String(aid) === String(id)) return { ...a, raw: { ...a.raw, ...data }, title: data.title || a.title };
            return a;
          });
          setActivityEvents(next);
          try { localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
          return;
        }
      }
      // fallback local update
      const nextLocal = activityEvents.map((a: any) => {
        const aid = String(a.raw?.id || a.id).replace(/^activity-/, '');
        if (String(aid) === String(id)) return { ...a, raw: { ...a.raw, ...updated }, title: updated.title || a.title };
        return a;
      });
      setActivityEvents(nextLocal);
      try { localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(nextLocal)); } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('handleActivitySave error', err);
      throw err;
    }
  };

  const handleActivityDelete = async (id: string) => {
    try {
      if (token) {
        const res = await fetch(`${API_BASE_URL}/activities/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const next = activityEvents.filter((a: any) => String(a.raw?.id || a.id).replace(/^activity-/, '') !== String(id) && String(a.id).replace(/^activity-/, '') !== String(id));
          setActivityEvents(next);
          try { localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
          return;
        }
      }
      // fallback local removal
      const nextLocal = activityEvents.filter((a: any) => String(a.raw?.id || a.id).replace(/^activity-/, '') !== String(id) && String(a.id).replace(/^activity-/, '') !== String(id));
      setActivityEvents(nextLocal);
      try { localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(nextLocal)); } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('handleActivityDelete error', err);
      throw err;
    }
  };
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // load events
  useEffect(() => {
    const load = async () => {
      try {
        if (token) {
          const res = await fetch(`${API_BASE_URL}/events`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            setEvents(Array.isArray(data) ? data : []);
            return;
          }
        }
      } catch (e) {
        // ignore
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setEvents(JSON.parse(raw));
        } else {
          const seed = [
            { id: '1', title: 'Call with client', date: format(today, 'yyyy-MM-dd'), startTime: '09:00' },
            { id: '2', title: 'Invoice due', date: format(new Date(today.getFullYear(), today.getMonth(), Math.min(10, today.getDate() + 3)), 'yyyy-MM-dd'), startTime: '10:00' },
          ];
          setEvents(seed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        }
      } catch (e) { console.error(e); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // load billing records as calendar-only events (don't persist with user events)
  useEffect(() => {
    let mounted = true;
    const loadBilling = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/billing-records`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const mapped = data.map((r: any) => {
          // billingDate may be ISO or just YYYY-MM-DD
          const raw = r.billingDate ?? r.notificationDate ?? r.nextBillingDate ?? null;
          const dateIso = raw ? String(raw).split('T')[0] : null;
          if (!dateIso) return null;
          // determine time: prefer time in billingDate if present, else notificationTime, else default 09:00
          let timePart = '09:00:00';
          try {
            const rawStr = String(raw);
            if (rawStr.includes('T')) {
              const t = rawStr.split('T')[1];
              timePart = (t.split('Z')[0].split('.')[0]) || '09:00:00';
            } else if (r.notificationTime) {
              const nt = String(r.notificationTime).trim();
              // if format HH:mm or HH:mm:ss
              timePart = nt.length === 5 ? `${nt}:00` : nt;
            }
          } catch (e) {
            // fallback
            timePart = '09:00:00';
          }
          const startIso = `${dateIso}T${timePart}`;
          return {
            id: `billing-${r.id || (r.companyId ? `${r.companyId}-${dateIso}` : Math.random().toString(36).slice(2))}`,
            title: r.companyName ? `Invoice: ${r.companyName}` : r.title || 'Invoice',
            start: startIso,
            end: null,
            date: dateIso,
            source: 'billing',
            raw: r,
          };
        }).filter(Boolean) as any[];
        if (mounted) {
          setBillingEvents(mapped as any[]);
          console.debug('CalendarPage loaded billing events', mapped.map((m: any) => ({ id: m?.id, start: m?.start, raw: m?.raw })));
          // Do not dispatch any local notification here based on billing fetch.
          // Notification dispatch is handled by the client-side scheduler (useEffect)
          // which will fire notifications at the correct time. This prevents
          // showing notifications before their scheduled time.
        }
      } catch (err) {
        // ignore
      }
    };
    loadBilling();
    return () => { mounted = false; };
  }, []);

  // load activities as calendar-only events (map dueDate to calendar)
  useEffect(() => {
    let mounted = true;
    const loadActivities = async () => {
      try {
        // If activities are protected, include Authorization header when token exists
        const init: RequestInit = { credentials: 'include' };
        if (token) {
          init.headers = { Authorization: `Bearer ${token}` } as any;
        }
        const url = `${API_BASE_URL}/activities`;
        console.debug('Calendar: fetching activities', { url, hasToken: !!token });
        const res = await fetch(url, init);
        console.debug('Calendar: activities fetch status', { status: res.status, ok: res.ok });
        if (!res.ok) {
          // log body for debugging when possible
          try { const txt = await res.text(); console.debug('Calendar: activities fetch body', txt); } catch (e) { /* ignore */ }
          return;
        }
        const data = await res.json();
        console.debug('Calendar: activities fetch returned', { length: Array.isArray(data) ? data.length : 'not-array' });
        if (!Array.isArray(data)) return;
        const mapped = data.map((a: any) => {
          // Accept multiple possible fields for date/time
          const rawDateTime = a.dueDate || a.start || a.datetime || a.date || a.createdAt || a.updatedAt || null;
          const separateTime = a.startTime || a.time || null;
          if (!rawDateTime && !separateTime) return null;

          // Normalize to date and time
          let dateIso: string | null = null;
          let timePart = '09:00:00';

          try {
            if (rawDateTime) {
              const s = String(rawDateTime);
              // If ISO-like, split
              if (s.includes('T')) {
                dateIso = s.split('T')[0];
                const t = s.split('T')[1];
                timePart = (t.split('Z')[0].split('.')[0]) || timePart;
              } else if (s.includes('-') && s.split('-')[0].length === 4) {
                // probably YYYY-MM-DD
                dateIso = s.split(' ')[0];
              } else {
                // try Date parsing fallback
                const dt = new Date(s);
                if (!isNaN(dt.getTime())) {
                  const yyyy = dt.getFullYear();
                  const mm = String(dt.getMonth() + 1).padStart(2, '0');
                  const dd = String(dt.getDate()).padStart(2, '0');
                  dateIso = `${yyyy}-${mm}-${dd}`;
                  const hh = String(dt.getHours()).padStart(2, '0');
                  const mi = String(dt.getMinutes()).padStart(2, '0');
                  const ss = String(dt.getSeconds()).padStart(2, '0');
                  timePart = `${hh}:${mi}:${ss}`;
                }
              }
            }
          } catch (e) { dateIso = null; }

          // If separate time provided and dateIso exists, use it
          if (separateTime && dateIso) {
            const t = String(separateTime).trim();
            timePart = t.length === 5 ? `${t}:00` : t;
          }

          if (!dateIso) return null;
          const startIso = `${dateIso}T${timePart}`;
          return {
            id: `activity-${a.id || Math.random().toString(36).slice(2)}`,
            title: a.title || (a.type ? `${a.type}` : 'Activity'),
            start: startIso,
            end: null,
            date: dateIso,
            source: 'activity',
            raw: a,
          };
        }).filter(Boolean) as any[];
        console.debug('Calendar: mapped activity events', { count: mapped.length, sample: mapped.slice(0, 3) });
        if (mounted) {
          setActivityEvents(mapped as any[]);
          try { localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(mapped)); } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.error('Calendar: failed to load activities', err);
      }
    };
    // Only attempt fetch when we have a token to avoid wiping activityEvents
    // during transient unauthenticated state on page reload.
    if (token) loadActivities();
    return () => { mounted = false; };
  }, [token]);

  // helper: parse an ISO-like local date/time into a local Date (avoid implicit UTC conversions)
  const parseLocalISO = (s: string) => {
    try {
      const [datePart, timePartRaw] = String(s).split('T');
      const [y, m, d] = datePart.split('-').map(Number);
      let timePart = timePartRaw || '00:00:00';
      // strip timezone designator if present
      timePart = timePart.split('Z')[0].split('+')[0].split('-')[0];
      const [hh = '0', mm = '0', ss = '0'] = timePart.split(':');
      const sec = Number(ss) || 0;
      return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), sec);
    } catch (err) {
      return new Date(s);
    }
  };

  // helper: format a Date into a local ISO-like string `YYYY-MM-DDTHH:mm:SS` (no Z)
  const formatLocalISO = (d: Date) => {
    try {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const sec = String(d.getSeconds()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}`;
    } catch (err) {
      return d.toISOString();
    }
  };

  const persist = async (next: any[]) => {
    // normalize events before storing so all views receive consistent `start`/`end` values
    const normalize = (ev: any) => {
      try {
        const copy = { ...ev } as any;
        // if start is a Date instance -> store as local ISO (avoid UTC shift)
        if (copy.start && copy.start instanceof Date) {
          copy.start = formatLocalISO(copy.start as Date);
        }
        // if end is a Date instance -> store as local ISO (avoid UTC shift)
        if (copy.end && copy.end instanceof Date) {
          copy.end = formatLocalISO(copy.end as Date);
        }
        // derive date and startTime from start if missing
        try {
          if (copy.start && (!copy.date || !copy.startTime)) {
            const d = new Date(copy.start);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            copy.date = copy.date || `${yyyy}-${mm}-${dd}`;
            copy.startTime = copy.startTime || `${hh}:${min}`;
            // derive endTime from end if available
            if (copy.end && !copy.endTime) {
              try {
                const de = new Date(copy.end);
                const eh = String(de.getHours()).padStart(2, '0');
                const emin = String(de.getMinutes()).padStart(2, '0');
                copy.endTime = `${eh}:${emin}`;
              } catch (err) { /* ignore */ }
            }
          }
        } catch (err) { /* ignore */ }
        // if there's an endTime but no end ISO, derive end from date + endTime
        try {
          if (!copy.end && copy.endTime && copy.date) {
            const endTimeNorm = copy.endTime.length === 5 ? `${copy.endTime}:00` : copy.endTime;
            copy.end = `${copy.date}T${endTimeNorm}`;
          }
        } catch (err) { /* ignore */ }
        // if no explicit start but have date + startTime, build ISO
        if ((!copy.start || copy.start === '') && copy.date) {
          const time = copy.startTime ? (copy.startTime.length === 5 ? `${copy.startTime}:00` : copy.startTime) : '09:00:00';
          copy.start = `${copy.date}T${time}`;
          if (!copy.end) {
            // default 1 hour duration (compute using local parsing and store as local ISO)
            try {
              const s = parseLocalISO(copy.start);
              const e = new Date(s.getTime() + 60 * 60 * 1000);
              copy.end = formatLocalISO(e);
            } catch (err) { /* ignore */ }
          }
        }
        return copy;
      } catch (err) { return ev; }
    };

    const normalized = next.map(normalize);
    // clear dispatched flags for events whose start changed so scheduler can reschedule
    try {
      const prev = prevEventsRef.current || [];
      const prevMap: Record<string, any> = {};
      for (const p of prev) if (p && p.id) prevMap[String(p.id)] = p;
      const offsets = [0, 15, 60, 1440];

      const getStartMs = (x: any) => {
        try {
          if (!x) return null;
          if (x.start) {
            const t = typeof x.start === 'string' ? parseLocalISO(x.start) : new Date(x.start);
            if (!isNaN(t.getTime())) return t.getTime();
          }
          if (x.date && x.startTime) {
            const iso = `${x.date}T${x.startTime.length === 5 ? x.startTime + ':00' : x.startTime}`;
            const s = parseLocalISO(iso);
            if (!isNaN(s.getTime())) return s.getTime();
          }
          // fallback: try date only
          if (x.date) {
            const s = new Date(`${x.date}T09:00:00`);
            if (!isNaN(s.getTime())) return s.getTime();
          }
          return null;
        } catch (err) { return null; }
      };

      for (const ev of normalized) {
        try {
          if (!ev || !ev.id) continue;
          const id = String(ev.id);
          const prevEv = prevMap[id];
          if (!prevEv) continue;
          const prevMs = getStartMs(prevEv);
          const nextMs = getStartMs(ev);
          if (prevMs !== null && nextMs !== null && prevMs !== nextMs) {
            console.debug('persist: start changed for', { id, prevMs, nextMs });
            // remove any dispatched flags for this event so it can be re-scheduled
            try {
              for (const off of offsets) {
                try {
                  localStorage.removeItem(`local_notif_dispatched_${id}_${off}`);
                  console.debug('persist: removed dispatched flag', `local_notif_dispatched_${id}_${off}`);
                } catch (e) { /* ignore */ }
              }
            } catch (e) { /* ignore */ }
          }
        } catch (err) { /* per-event ignore */ }
      }
    } catch (err) { /* ignore */ }

    setEvents(normalized);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch (e) { console.error(e); }
    // update prevEventsRef
    prevEventsRef.current = normalized;
    console.debug('persist: updated prevEventsRef', prevEventsRef.current.map((p: any) => ({ id: p.id, start: p.start || `${p.date}T${p.startTime}` })));
    // trigger scheduler to reschedule immediately after we've cleared flags
    try {
      window.dispatchEvent(new Event('rescheduleNotifications'));
      console.debug('persist: dispatched rescheduleNotifications');
    } catch (err) { /* ignore */ }

    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/events/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(next),
      });
    } catch (e) { /* ignore */ }
  };

  const toRBCEvents = useMemo(() => {
    // combine user events + billingEvents + activityEvents (billing/activity are calendar-only)
    const combined = [...events, ...billingEvents, ...activityEvents];
    // reuse outer parseLocalISO helper

    return combined.map(e => {
      // Prefer canonical date + startTime when available (this is what the Month view uses)
      if (e.date) {
        const datePart = e.date;
        const startTime = e.startTime || (typeof e.start === 'string' && e.start.includes('T') ? String(e.start).split('T')[1].split('Z')[0].split('+')[0].split('-')[0] : '09:00');
        const startTimeNorm = startTime.length === 5 ? `${startTime}:00` : startTime;
        const start = parseLocalISO(`${datePart}T${startTimeNorm}`);
        // prefer endTime when available
        let end;
        if (e.endTime) {
          const endTimeNorm = e.endTime.length === 5 ? `${e.endTime}:00` : e.endTime;
          end = parseLocalISO(`${datePart}T${endTimeNorm}`);
        } else if (e.end) {
          end = typeof e.end === 'string' ? parseLocalISO(e.end) : new Date(e.end);
        } else {
          end = addHours(start, 1);
        }
        console.debug('toRBCEvents constructed start/end (from date+startTime)', { id: e.id, start: start.toString(), end: end.toString(), source: e.source });
        return { ...e, start, end };
      }

      // If event already has explicit start/end as Date instances, use them
      if (e.start instanceof Date && e.end instanceof Date) return { ...e };

      // If start/end are present as strings, parse them to local Date (avoid timezone conversion)
      if (e.start && e.end) {
        const start = typeof e.start === 'string' ? parseLocalISO(e.start) : new Date(e.start);
        const end = typeof e.end === 'string' ? parseLocalISO(e.end) : new Date(e.end);
        console.debug('toRBCEvents parsed start/end (explicit)', { id: e.id, start: start.toString(), end: end.toString() });
        return { ...e, start, end };
      }
      // fallback: try to construct start and end using available fields
      const datePart = e.date || (e.start ? String(e.start).split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
      const startTime = e.startTime || (typeof e.start === 'string' && e.start.includes('T') ? String(e.start).split('T')[1].split('Z')[0].split('+')[0].split('-')[0] : '09:00');
      const startTimeNorm = startTime.length === 5 ? `${startTime}:00` : startTime;
      const start = parseLocalISO(`${datePart}T${startTimeNorm}`);
      const end = e.end ? (typeof e.end === 'string' ? parseLocalISO(e.end) : new Date(e.end)) : addHours(start, 1);
      console.debug('toRBCEvents constructed start/end', { id: e.id, start: start.toString(), end: end.toString(), source: e.source });
      return { ...e, start, end };
    });
  }, [events, billingEvents]);

  // Debug: log events being passed to the calendar so we can inspect in the browser console
  useEffect(() => {
    try {
      console.debug('CalendarPage: toRBCEvents count', toRBCEvents.length, toRBCEvents.slice(0, 6));
    } catch (e) { /* ignore */ }
  }, [toRBCEvents]);

  // Helper to format times: omit ":00" when minutes are zero (e.g. "12 AM" instead of "12:00 AM")
  const formatTimeSmart = (date: Date) => {
    try {
      const m = date.getMinutes();
      return m === 0 ? format(date, 'h a') : format(date, 'h:mm a');
    } catch (e) {
      return String(date);
    }
  };

  const calendarFormats = {
    timeGutterFormat: (date: Date) => formatTimeSmart(date),
    agendaTimeFormat: (date: Date) => formatTimeSmart(date),
    eventTimeRangeFormat: ({ start, end }: any) => `${formatTimeSmart(start)} - ${formatTimeSmart(end)}`,
  } as any;

  // ref to track last click time for double-click detection on slots
  const lastSlotClickRef = useRef<{ time: number; date: string }>({ time: 0, date: '' });

  const handleSelectSlot = ({ start }: { start: Date }) => {
    const now = Date.now();
    const dateStr = start.toISOString();

    // Check for double click (within 300ms on same date)
    if (now - lastSlotClickRef.current.time < 300 && lastSlotClickRef.current.date === dateStr) {
      // Double click detected -> Open Add Event Modal
      const ev = { date: format(start, 'yyyy-MM-dd'), startTime: '09:00', title: '' };
      setEditingEvent(ev);
      setSelectedDate(start); // ensure selected date is updated too
      // open modal
      setTimeout(() => setShowModal(true), 0);

      // reset click tracker
      lastSlotClickRef.current = { time: 0, date: '' };
      return;
    }

    // Single click behavior
    lastSlotClickRef.current = { time: now, date: dateStr };

    // When a date cell is clicked, select the date and show events in the right panel.
    setSelectedDate(start);
    // do not open modal on single click
    setEditingEvent(null);
    setShowModal(false);
  };

  const handleAddClick = () => {
    const d = selectedDate || today;
    const ev = { date: format(d, 'yyyy-MM-dd'), startTime: '09:00', title: '' };
    setEditingEvent(ev);
    // ensure `initial` is set before opening modal
    setTimeout(() => setShowModal(true), 0);
  };

  const handleSelectEvent = (ev: any) => {
    // if activity event, navigate to Activities page and open detail
    if (ev.source === 'activity' || (ev.id && ev.id.toString().startsWith('activity-'))) {
      // navigate to Activities page and request it open the activity detail
      const raw = ev.raw || ev;
      // prefer raw.id; otherwise strip prefix from generated id
      const id = (raw && (raw.id || raw._id)) || (ev.id ? String(ev.id).replace(/^activity-/, '') : null);
      if (id) {
        navigate('/activities', { state: { openActivityId: String(id) } });
        return;
      }
      return;
    }

    // if this is a billing event, navigate to billing preview
    if (ev.source === 'billing' || (ev.id && ev.id.toString().startsWith('billing-'))) {
      const recId = (ev.id && ev.id.toString().replace(/^billing-/, '')) || ev.raw?.id;
      if (recId) {
        navigate(`/billing/preview/${recId}`);
        return;
      }
    }

    // find original event
    const orig = events.find((e: any) => `${e.id}` === `${ev.id}`) || ev;
    setEditingEvent(orig);
    // set selected date to event date
    const s = orig.start ? (typeof orig.start === 'string' ? parseLocalISO(orig.start) : new Date(orig.start)) : (orig.date ? parseLocalISO(`${orig.date}T00:00:00`) : new Date());
    setSelectedDate(s);
    // ensure `initial` is available to modal before showing
    setTimeout(() => setShowModal(true), 0);
  };

  const handleSaveEvent = (ev: any) => {
    (async () => {
      const exists = events.find(e => e.id === ev.id);
      if (!token) {
        // offline/local fallback
        if (exists) {
          const next = events.map(e => e.id === ev.id ? { ...e, ...ev } : e);
          persist(next);
        } else {
          const id = ev.id || Date.now().toString();
          const next = [...events, { ...ev, id }];
          persist(next);
        }
      } else {
        try {
          if (exists) {
            const res = await fetch(`${API_BASE_URL}/events/${ev.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(ev),
            });
            if (res.ok) {
              const updated = await res.json();
              const next = events.map(e => e.id === ev.id ? { ...e, ...updated } : e);
              persist(next);
            } else {
              // fallback to local
              const next = events.map(e => e.id === ev.id ? { ...e, ...ev } : e);
              persist(next);
            }
          } else {
            const res = await fetch(`${API_BASE_URL}/events`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(ev),
            });
            if (res.ok) {
              const created = await res.json();
              const id = created.id || created.name || Date.now().toString();
              const next = [...events, { ...created, id }];
              persist(next);
            } else {
              // fallback local
              const id = ev.id || Date.now().toString();
              const next = [...events, { ...ev, id }];
              persist(next);
            }
          }
        } catch (err) {
          // network error -> fallback local
          if (exists) {
            const next = events.map(e => e.id === ev.id ? { ...e, ...ev } : e);
            persist(next);
          } else {
            const id = ev.id || Date.now().toString();
            const next = [...events, { ...ev, id }];
            persist(next);
          }
        }
      }
      setShowModal(false);
      setEditingEvent(null);
    })();
  };

  const handleDeleteEvent = (id: string) => {
    (async () => {
      if (!token) {
        const next = events.filter(e => e.id !== id);
        persist(next);
      } else {
        try {
          const res = await fetch(`${API_BASE_URL}/events/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const next = events.filter(e => e.id !== id);
            persist(next);
          } else {
            // fallback local removal
            const next = events.filter(e => e.id !== id);
            persist(next);
          }
        } catch (err) {
          const next = events.filter(e => e.id !== id);
          persist(next);
        }
      }
      setShowModal(false);
      setEditingEvent(null);
    })();
  };



  // Client-side scheduler: schedule local notifications for events while the app is open.
  // This sets timeouts to dispatch `localNotification` at event start or at reminder offset.
  const notifTimersRef = useRef<Record<string, number>>({});
  const prevEventsRef = useRef<any[]>([]);
  useEffect(() => {
    const clearAll = () => {
      try {
        const map = notifTimersRef.current || {};
        Object.values(map).forEach((tid) => {
          try { clearTimeout(tid as unknown as number); } catch (e) { /* ignore */ }
        });
        notifTimersRef.current = {};
      } catch (err) { /* ignore */ }
    };

    const schedule = () => {
      console.debug('scheduler: running schedule() with toRBCEvents count', toRBCEvents.length);
      clearAll();
      const now = new Date();
      const reminderOffsets: Record<string, number> = { '15m': 15, '1h': 60, '1d': 1440 };

      for (const ev of toRBCEvents) {
        try {
          const id = ev.id ? String(ev.id) : `evt-${Math.random().toString(36).slice(2)}`;
          const start: Date = ev.start instanceof Date ? ev.start : new Date(ev.start);
          if (!start || Number.isNaN(start.getTime())) continue;

          const reminderKey = ev.reminder || (ev.raw && ev.raw.reminder) || 'none';
          const offsetMin = reminderOffsets[reminderKey] || 0;
          const notifyAt = new Date(start.getTime() - offsetMin * 60000);
          const msUntil = notifyAt.getTime() - now.getTime();
          const dispatchedKey = `local_notif_dispatched_${id}_${offsetMin}`;
          const alreadyDispatched = !!localStorage.getItem(dispatchedKey);
          console.debug('scheduler: event check', { id, offsetMin, start: start.toString(), notifyAt: notifyAt.toString(), msUntil, dispatched: alreadyDispatched });

          const doDispatch = () => {
            try {
              const payload = {
                id: `local-${id}-${offsetMin}`,
                title: ev.title || 'Event',
                body: `${format(start, 'HH:mm')} ${ev.title || ''}`.trim(),
                createdAt: new Date().toISOString(),
                read: false,
                raw: ev.raw || null,
              };
              console.debug('Client scheduler dispatching localNotification', { id, offsetMin, payload });
              window.dispatchEvent(new CustomEvent('localNotification', { detail: payload }));
              try { localStorage.setItem(dispatchedKey, '1'); } catch (e) { /* ignore */ }
            } catch (err) { console.error('Failed to dispatch scheduled notification', err); }
          };

          // if already dispatched, skip
          if (localStorage.getItem(dispatchedKey)) continue;

          // avoid scheduling duplicate timers for same id+offset
          const timerKey = `${id}_${offsetMin}`;
          if (notifTimersRef.current[timerKey]) {
            // already scheduled
            console.debug('scheduler: timer already exists, skipping', { timerKey });
            continue;
          }

          if (msUntil <= 0) {
            // if passed more than 5 minutes ago, do not notify, just mark as dispatched
            if (msUntil < -5 * 60000) {
              console.debug('scheduler: notify time passed significantly, skipping dispatch', { id, offsetMin, msUntil });
              try { localStorage.setItem(dispatchedKey, '1'); } catch (e) { /* ignore */ }
              continue;
            }
            console.debug('scheduler: notify time passed or immediate, dispatching now', { id, offsetMin, msUntil });
            doDispatch();
          } else {
            const tid = window.setTimeout(() => {
              doDispatch();
              // clear timer record after execution
              try { delete notifTimersRef.current[timerKey]; } catch (e) { /* ignore */ }
            }, msUntil) as unknown as number;
            notifTimersRef.current[timerKey] = tid;
            console.debug('Scheduled notification', { id, msUntil, offsetMin, timerKey });
          }
        } catch (err) { /* per-event ignore */ }
      }
    };

    schedule();
    // allow external triggers to force reschedule (useful when persist removes flags)
    const onReschedule = () => {
      console.debug('scheduler: received reschedule event');
      schedule();
    };
    window.addEventListener('rescheduleNotifications', onReschedule);
    return () => clearAll();
  }, [toRBCEvents]);

  const handleEventDrop = ({ event, start, end }: any) => {
    (async () => {
      const nextLocal = events.map((e: any) => {
        if (`${e.id}` === `${event.id}`) {
          return {
            ...e,
            start: formatLocalISO(start),
            end: end ? formatLocalISO(end) : undefined,
            date: format(start, 'yyyy-MM-dd'),
            startTime: format(start, 'HH:mm'),
          };
        }
        return e;
      });
      persist(nextLocal);

      if (token) {
        try {
          await fetch(`${API_BASE_URL}/events/${event.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              date: format(start, 'yyyy-MM-dd'),
              startTime: format(start, 'HH:mm'),
            }),
          });
        } catch (e) { /* ignore */ }
      }
    })();
  };

  return (
    <div className="flex flex-col gap-6 px-8 py-6 bg-gray-50 h-[calc(100vh-100px)] overflow-hidden">
      <style>
        {`
          .rbc-calendar {
            background-color: white;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            border: none;
          }
          .rbc-month-view {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          .rbc-header {
            padding: 12px;
            font-weight: 600;
            color: #4b5563;
            border-bottom: 1px solid #e5e7eb;
            background-color: #f9fafb;
          }
          .rbc-month-row {
            border-top: 1px solid #e5e7eb;
          }
          .rbc-day-bg + .rbc-day-bg {
            border-left: 1px solid #e5e7eb;
          }
          .rbc-off-range-bg {
            background-color: #f9fafb;
          }
          .rbc-today {
            background-color: #eff6ff;
          }
          .rbc-event {
            border-radius: 6px;
            padding: 2px 8px;
            font-size: 0.85rem;
            border: none;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          .rbc-event.rbc-selected {
            background-color: #2563eb;
          }
          /* Now/current time indicator (timeline) - make it red */
          .rbc-current-time-indicator {
            background: #fa3d3dff !important;
           
          }
          .rbc-now {
            
          }
          .rbc-toolbar button {
            display: none; /* Hide default toolbar buttons */
          }
          /* Remove strong hover/box-shadow on the small date pills in month/week headers */
          .rbc-date,
          .rbc-header .rbc-date,
          .rbc-header .rbc-label,
          .rbc-month-view .rbc-header .rbc-date {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
          }
          .rbc-date:hover {
            background: transparent !important;
            box-shadow: none !important;
          }
          /* Remove leftover pill/box-shadow from react-big-calendar header buttons */
          .rbc-button-link,
          .rbc-header .rbc-button-link,
          .rbc-time-header .rbc-button-link,
          .rbc-time-header .rbc-button-link:focus,
          .rbc-header .rbc-button-link:hover {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            outline: none !important;
            color: inherit !important;
          }
          /* Ensure any pseudo-element highlight is removed */
          .rbc-button-link::before,
          .rbc-button-link::after {
            display: none !important;
            content: none !important;
          }
          /* Center time gutter labels and event times */
          .rbc-time-gutter,
          .rbc-time-gutter .rbc-label,
          .rbc-time-view .rbc-time-gutter .rbc-label {
            text-align: center !important;
            padding-right: 0 !important;
            padding-left: 6px !important;
          }
          /* Center time text inside event boxes (where applicable) */
          .rbc-event .rbc-event-label,
          .rbc-event .rbc-time,
          .rbc-event .rbc-event-content {
            text-align: center !important;
          }
          /* Hide the All-day row in time views (Week/Day) */
          .rbc-time-view .rbc-allday,
          .rbc-time-view .rbc-allday-section,
          .rbc-time-view .rbc-allday-cell {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            visibility: hidden !important;
          }
          /* Selected day highlight */
          .rbc-day-selected {
            background-color: #f3f4f6 !important;
          }
        `}
      </style>



      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 flex-1 flex flex-col overflow-auto">
        <DndProvider backend={HTML5Backend}>
          <DnDCalendar
            localizer={localizer}
            events={toRBCEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ flex: 1, minHeight: 0 }}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            views={['month', 'week', 'day']}
            popup
            components={{
              toolbar: (props) => (
                <CustomToolbar {...props} onAdd={handleAddClick} />
              ),
            }}
              formats={calendarFormats}
            dayPropGetter={(date: Date) => {
              if (selectedDate && isSameDay(date, selectedDate)) {
                return {
                  style: {
                    backgroundColor: '#f3f4f6',
                    // ensure the highlight covers the whole cell area
                    border: '1px solid rgba(0,0,0,0.04)',
                  },
                  className: 'rbc-day-selected',
                };
              }
              return {};
            }}
            eventPropGetter={(event: any) => {
              let backgroundColor = '#2563eb';
              if (event.source === 'billing') backgroundColor = '#f4b548ff'; // yellow for billing
              if (event.source === 'activity') backgroundColor = '#10b981'; // green for activities

              // Ensure event boxes have a visible min height and proper layout
              return {
                style: {
                  backgroundColor,
                  border: '1px solid white',
                  color: '#ffffff',
                  display: 'block',
                  minHeight: '26px',
                  padding: '6px 8px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }
              };
            }}
          />
        </DndProvider>
      </div>

      {showModal && (
        <EventModal
          show={showModal}
          onHide={() => { setShowModal(false); setEditingEvent(null); }}
          onSave={handleSaveEvent}
          onDelete={
            editingEvent && editingEvent.id
              ? () => handleDeleteEvent(editingEvent.id!)
              : undefined
          }
          initial={editingEvent || {
            date: format(selectedDate || new Date(), 'yyyy-MM-dd'),
            startTime: '09:00'
          }}
        // If viewing an activity-sourced event, we might want to pass different props or handle it elsewhere, 
        // but here we just reuse the modal or let it be read-only if desired. 
        // For now, if activity, we do pass it, but maybe disable editing in the modal?
        // Actually, our logic above navigates away for billing/activity, so this modal is mostly for user manual events.
        />
      )}
    </div>
  );
};

export default CalendarPage;
