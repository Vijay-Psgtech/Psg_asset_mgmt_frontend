import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { ErrorBanner, Spinner } from '../components/Common.jsx';

const TYPE_OPTIONS = [
  ['maintenance', 'Maintenance'],
  ['assignment', 'Expected checkin'],
  ['license', 'License expiry'],
  ['warranty', 'Warranty expiry'],
];
const STATUS_OPTIONS = ['all', 'Open', 'Scheduled', 'In Progress', 'Completed', 'overdue', 'Expired', 'Active'];
const EVENT_COLORS = {
  maintenance: 'bg-amber-500 text-white',
  assignment: 'bg-blue-600 text-white',
  license: 'bg-rose-600 text-white',
  warranty: 'bg-emerald-600 text-white',
  overdue: 'bg-red-700 text-white',
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

function addDays(date, count) {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
}

function dateKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function rangeFor(viewDate, view) {
  if (view === 'week') {
    const start = startOfWeek(viewDate);
    return { start, end: addDays(start, 7) };
  }
  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = startOfWeek(start);
  return { start: gridStart, end: addDays(gridStart, view === 'month' ? 42 : 42) };
}

function formatApiDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatMonth(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatEventDate(date) {
  return new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function EventItem({ event, onClick, compact = false }) {
  return (
    <button type="button" onClick={() => onClick(event)} className={`calendar-event ${EVENT_COLORS[event.colorKey] || EVENT_COLORS[event.type]} ${compact ? 'calendar-event-compact' : ''}`} title={event.title}>
      <span className="truncate">{event.title}</span>
    </button>
  );
}

export default function Calendar() {
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [types, setTypes] = useState(TYPE_OPTIONS.map(([value]) => value));
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const range = useMemo(() => rangeFor(viewDate, view), [viewDate, view]);
  const visibleEvents = useMemo(() => status === 'all' ? events : events.filter((event) => event.status === status), [events, status]);
  const days = useMemo(() => Array.from({ length: view === 'week' ? 7 : 42 }, (_, index) => addDays(range.start, index)), [range.start, view]);
  const eventsByDate = useMemo(() => visibleEvents.reduce((map, event) => {
    const key = dateKey(event.start);
    map[key] = map[key] || [];
    map[key].push(event);
    return map;
  }, {}), [visibleEvents]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/calendar/events', {
      params: { start: formatApiDate(range.start), end: formatApiDate(range.end), types: types.join(','), search: search || undefined },
    }).then(({ data }) => {
      if (active) setEvents(data.events || []);
    }).catch((err) => {
      if (active) setError(err?.response?.data?.message || 'Could not load calendar events.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [range.start, range.end, search, types]);

  const move = (amount) => setViewDate((date) => new Date(date.getFullYear(), date.getMonth() + amount, date.getDate()));
  const handleEventClick = (event) => {
    if (event.sourcePath) navigate(event.sourcePath, { state: event.asset?.id ? { assetId: event.asset.id } : undefined });
  };
  const toggleType = (type) => setTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Workspace / planning</p>
          <h1 className="stencil text-2xl font-bold text-ink">Calendar</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-outline px-3 py-2 text-xs" onClick={() => setViewDate(new Date())}>Today</button>
          <div className="flex overflow-hidden rounded-md border border-line">
            <button type="button" aria-label="Previous period" className="bg-panel px-3 py-2 text-ink hover:bg-panel2" onClick={() => move(-1)}>‹</button>
            <button type="button" aria-label="Next period" className="border-l border-line bg-panel px-3 py-2 text-ink hover:bg-panel2" onClick={() => move(1)}>›</button>
          </div>
        </div>
      </div>

      <div className="card space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
          {TYPE_OPTIONS.map(([type, label]) => (
            <button key={type} type="button" onClick={() => toggleType(type)} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${types.includes(type) ? `${EVENT_COLORS[type]} border-transparent` : 'border-line bg-panel text-muted'}`}>
              {label}
            </button>
          ))}
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input ml-auto w-auto min-w-[140px] py-2 text-xs">
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option === 'all' ? 'All statuses' : option}</option>)}
          </select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events..." className="input w-full py-2 text-xs sm:w-56" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">{formatMonth(viewDate)}</h2>
          <div className="flex rounded-md border border-line text-xs">
            {['month', 'week', 'list'].map((option) => <button key={option} type="button" onClick={() => setView(option)} className={`px-3 py-2 capitalize ${view === option ? 'bg-ink text-white' : 'bg-panel text-muted hover:text-ink'}`}>{option}</button>)}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      {loading ? <Spinner label="LOADING CALENDAR" /> : view === 'list' ? (
        <div className="card divide-y divide-line overflow-hidden">
          {visibleEvents.length === 0 ? <p className="p-8 text-center text-sm text-muted">No events in this period.</p> : visibleEvents.map((event) => <button type="button" key={event.id} onClick={() => handleEventClick(event)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-panel2"><span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${EVENT_COLORS[event.colorKey] || EVENT_COLORS[event.type]}`} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink">{event.title}</strong><span className="text-xs text-muted">{formatEventDate(event.start)} · {event.status}</span></span></button>)}
        </div>
      ) : (
        <div className={`calendar-shell card overflow-hidden ${view === 'week' ? 'calendar-week-view' : ''}`}>
          <div className="calendar-weekdays">{days.slice(0, 7).map((day, index) => <div key={WEEKDAYS[index]}>{WEEKDAYS[index]}</div>)}</div>
          <div className="calendar-grid">
            {days.map((day) => {
              const dayEvents = eventsByDate[dateKey(day)] || [];
              const outsideMonth = view === 'month' && day.getMonth() !== viewDate.getMonth();
              return <div key={dateKey(day)} className={`calendar-day ${outsideMonth ? 'calendar-day-outside' : ''}`}><div className={`calendar-day-number ${dateKey(day) === dateKey(new Date()) ? 'calendar-today' : ''}`}>{day.getDate()}</div><div className="calendar-day-events">{dayEvents.slice(0, view === 'week' ? 8 : 4).map((event) => <EventItem key={event.id} event={event} onClick={handleEventClick} compact={view === 'week'} />)}{dayEvents.length > (view === 'week' ? 8 : 4) && <span className="calendar-more">+{dayEvents.length - (view === 'week' ? 8 : 4)} more</span>}</div></div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
