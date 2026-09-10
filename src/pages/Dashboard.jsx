import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';

const statusLabels = {
  available: 'Ready to deploy',
  assigned: 'Assigned',
  in_maintenance: 'In maintenance',
  retired: 'Retired',
  lost: 'Lost',
};

const statusColors = {
  available: '#2563eb',
  assigned: '#0f766e',
  in_maintenance: '#d97706',
  retired: '#94a3b8',
  lost: '#dc2626',
};

const formatNumber = (value) => new Intl.NumberFormat().format(value || 0);

const getGreeting = (date = new Date()) => {
  const hour = date.getHours();

  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
};

function Metric({ label, value, detail, tone = 'blue', to }) {
  const content = <><div className="flex items-start justify-between gap-3"><span className="text-sm font-medium text-muted">{label}</span><span className={`metric-dot metric-dot-${tone}`} /></div><div className="mt-4 text-3xl font-semibold tracking-tight text-ink">{formatNumber(value)}</div><div className="mt-2 text-xs text-muted">{detail}</div></>;
  return to ? <Link to={to} className="dashboard-card block transition hover:-translate-y-0.5 hover:border-[#aebdca]">{content}</Link> : <div className="dashboard-card">{content}</div>;
}

function PanelHeader({ title, detail, action }) {
  return <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4"><div><h2 className="text-base font-semibold text-ink">{title}</h2>{detail && <p className="mt-1 text-xs text-muted">{detail}</p>}</div>{action}</div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [requirementsSummary, setRequirementsSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => Promise.all([
    api.get('/dashboard/summary'),
    api.get('/dashboard/activity', { params: { limit: 8 } }),
    api.get('/requirements/summary'),
  ])
    .then(([summaryRes, activityRes, requirementRes]) => {
      setSummary(summaryRes.data);
      setActivity(activityRes.data?.data || []);
      setRequirementsSummary(requirementRes.data || null);
      setError('');
    })
    .catch((err) => setError(err.response?.data?.message || 'Dashboard data could not be loaded.'))
    .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const statuses = useMemo(() => Object.entries(summary?.byStatus || {}).map(([key, value]) => ({ key, label: statusLabels[key] || key, value, fill: statusColors[key] || '#64748b' })), [summary]);
  const categories = useMemo(() => Object.entries(summary?.byCategory || {}).slice(0, 7).map(([name, value]) => ({ name, value })), [summary]);
  const attentionCount = (summary?.overdueAssignments || 0) + (summary?.maintenanceDue || 0);
  const greeting = getGreeting();
  const lastUpdated = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());

  return <div className="space-y-6">
    <section className="dashboard-intro"><div><div className="dashboard-eyebrow">Operations / overview</div><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{greeting}, {user?.name || 'Administrator'}.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted">A clear view of your equipment estate, the work that needs attention, and the latest changes across your organization.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={load} className="btn-outline text-xs">↻ Refresh</button><Link to="/assets/new" className="btn-primary text-xs">Add an asset</Link></div></section>

    {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total assets" value={summary?.totalAssets} detail="Across every lifecycle state" tone="blue" to="/assets" />
      <Metric label="Active assignments" value={summary?.activeAssignments} detail={`${formatNumber(summary?.overdueAssignments)} overdue return${summary?.overdueAssignments === 1 ? '' : 's'}`} tone="teal" to="/assignments" />
      <Metric label="Maintenance queue" value={summary?.maintenanceDue} detail="Open or scheduled work" tone="amber" to="/maintenance" />
      <Metric label="People with access" value={summary?.totals?.people} detail="Active platform users" tone="slate" to="/profile" />
    </section>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
      <div className="dashboard-panel overflow-hidden"><PanelHeader title="Asset distribution" detail="Current inventory by lifecycle state" action={<Link to="/assets" className="text-xs font-semibold text-accent hover:underline">View inventory →</Link>} /><div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_220px]">{loading ? <div className="dashboard-skeleton h-56" /> : statuses.length ? <div className="h-56 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={statuses} layout="vertical" margin={{ top: 4, right: 14, left: 12, bottom: 4 }} barCategoryGap="24%"><CartesianGrid horizontal={false} stroke="#e7edf2" /><XAxis type="number" hide allowDecimals={false} /><YAxis type="category" dataKey="label" width={116} axisLine={false} tickLine={false} tick={{ fill: '#687675', fontSize: 11 }} /><Tooltip cursor={{ fill: '#f4f7f9' }} contentStyle={{ border: '1px solid #dce5eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,31,53,.08)', fontSize: 12 }} formatter={(value) => [value, 'Assets']} /><Bar dataKey="value" radius={[0, 5, 5, 0]}>{statuses.map((status) => <Cell key={status.key} fill={status.fill} />)}</Bar></BarChart></ResponsiveContainer></div> : <div className="grid h-56 place-items-center text-sm text-muted">No asset distribution yet.</div>}
        <div className="space-y-3 border-l-0 border-line lg:border-l lg:pl-5">{statuses.map((status) => <div className="flex items-center justify-between gap-3" key={status.key}><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: status.fill }} /><span className="truncate text-xs text-muted">{status.label}</span></div><strong className="text-sm text-ink">{formatNumber(status.value)}</strong></div>)}{!statuses.length && <p className="text-xs text-muted">Lifecycle data appears as assets are added.</p>}</div>
      </div></div>

      <div className="dashboard-panel overflow-hidden"><PanelHeader title="Attention queue" detail="Items that may need action" action={<span className={`status-pill ${attentionCount ? 'status-pill-warn' : 'status-pill-ok'}`}>{attentionCount ? 'Review' : 'Clear'}</span>} /><div className="divide-y divide-line"><Link to="/assignments?status=overdue" className="attention-row"><span className="attention-icon attention-icon-red">!</span><span className="min-w-0 flex-1"><strong className="block text-sm text-ink">Overdue returns</strong><small className="text-xs text-muted">Assignments past their due date</small></span><b className="text-lg text-ink">{formatNumber(summary?.overdueAssignments)}</b></Link><Link to="/maintenance" className="attention-row"><span className="attention-icon attention-icon-amber">⌁</span><span className="min-w-0 flex-1"><strong className="block text-sm text-ink">Maintenance due</strong><small className="text-xs text-muted">Open and scheduled work orders</small></span><b className="text-lg text-ink">{formatNumber(summary?.maintenanceDue)}</b></Link><Link to="/licenses" className="attention-row"><span className="attention-icon attention-icon-blue">◷</span><span className="min-w-0 flex-1"><strong className="block text-sm text-ink">License portfolio</strong><small className="text-xs text-muted">Seats across all licenses</small></span><b className="text-lg text-ink">{formatNumber(summary?.totals?.licenses)}</b></Link></div><div className="bg-[#f8fafb] px-5 py-3 text-[11px] text-muted">Last checked at {lastUpdated}. Data refreshes every minute.</div></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
      <div className="dashboard-panel overflow-hidden"><PanelHeader title="Recent activity" detail="The latest changes recorded in the system" action={<Link to="/audit-log" className="text-xs font-semibold text-accent hover:underline">Open audit log →</Link>} /><div className="overflow-x-auto"><table className="data-table w-full min-w-[620px] text-left"><thead><tr><th>Event</th><th>Performed by</th><th>Target</th><th className="text-right">When</th></tr></thead><tbody>{loading ? <tr><td colSpan="4" className="px-5 py-12 text-center text-sm text-muted">Loading recent activity...</td></tr> : activity.length ? activity.map((log) => <tr key={log._id}><td><span className="activity-marker" /><span className="font-medium capitalize text-ink">{log.action?.replace(/_/g, ' ')}</span></td><td className="text-muted">{log.performedBy?.name || 'System'}</td><td className="font-medium text-accent">{log.entityLabel || log.entityType}</td><td className="text-right text-muted">{log.createdAt ? new Date(log.createdAt).toLocaleDateString() : '—'}</td></tr>) : <tr><td colSpan="4" className="px-5 py-12 text-center text-sm text-muted">No recent activity recorded.</td></tr>}</tbody></table></div></div>
      <div className="dashboard-panel overflow-hidden"><PanelHeader title="Inventory mix" detail="Top asset categories" action={<Link to="/assets" className="text-xs font-semibold text-accent hover:underline">Explore →</Link>} /><div className="p-5">{categories.length ? <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={categories} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e7edf2" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#687675', fontSize: 10 }} interval={0} angle={-28} textAnchor="end" height={54} /><YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#9aa8b2', fontSize: 10 }} /><Tooltip cursor={{ fill: '#f4f7f9' }} contentStyle={{ border: '1px solid #dce5eb', borderRadius: 8, fontSize: 12 }} /><Bar dataKey="value" fill="#2563eb" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="grid h-52 place-items-center text-sm text-muted">No category data yet.</div>}</div></div>
    </section>

    <section className="dashboard-panel overflow-hidden"><PanelHeader title="Platform readiness" detail="Progress against the capability catalog" action={<Link to="/requirements" className="text-xs font-semibold text-accent hover:underline">Review requirements →</Link>} /><div className="grid gap-4 p-5 sm:grid-cols-3">{[['Catalog groups', requirementsSummary?.totalGroups, 'Defined capability areas'], ['Core capabilities', requirementsSummary?.coreCount, 'Ready for operations'], ['Advanced capabilities', requirementsSummary?.advancedCount, 'Planned intelligence']].map(([label, value, detail]) => <div key={label} className="rounded-md bg-[#f5f8fa] p-4"><div className="text-xs font-medium text-muted">{label}</div><div className="mt-2 text-2xl font-semibold text-ink">{formatNumber(value)}</div><div className="mt-1 text-[11px] text-muted">{detail}</div></div>)}</div></section>
  </div>;
}
