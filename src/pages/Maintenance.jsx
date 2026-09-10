import { useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import MaintenanceStatusBadge from '../components/MaintenanceStatusBadge.jsx';
import MaintenanceModal from '../components/MaintenanceModal.jsx';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'Open', label: 'Open' },
  { key: 'Scheduled', label: 'Scheduled' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'Completed', label: 'Completed' },
];

const TYPE_OPTIONS = ['all', 'Repair', 'Scheduled Service', 'Inspection', 'Upgrade', 'Other'];
const PRIORITY_OPTIONS = ['all', 'Low', 'Medium', 'High', 'Critical'];

export default function Maintenance() {
  const [tab, setTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/maintenance', {
        params: {
          status: tab,
          type: typeFilter,
          priority: priorityFilter,
          search: search || undefined,
        },
      });
      setRows(res.data?.data || res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load maintenance records.');
    } finally {
      setLoading(false);
    }
  }, [tab, typeFilter, priorityFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = () => {
    setModal(null);
    load();
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.title}? This cannot be undone.`)) return;
    try { await api.delete(`/maintenance/${row._id}`); load(); } catch (err) { setError(err.response?.data?.message || 'Could not delete maintenance record.'); }
  };

  const clone = async (row) => {
    try {
      await api.post('/maintenance', {
        assetId: row.asset?._id || row.asset,
        type: row.type, title: `${row.title} (copy)`, description: row.description,
        vendor: row.vendor, cost: row.cost, dueDate: row.dueDate, status: 'Scheduled', notes: row.notes,
      });
      load();
    } catch (err) { setError(err.response?.data?.message || 'Could not clone maintenance record.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="stencil text-lg font-semibold uppercase tracking-widest text-white">
            Maintenance
          </h1>
          <p className="text-xs text-muted">Repairs, scheduled service, and inspections across your fleet.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-400 hover:bg-amber-500/20"
        >
          + Log Record
        </button>
      </div>

      <div className="space-y-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest stencil ${
                  tab === t.key
                    ? 'border border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'text-muted hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, assignee, vendor…"
            className="w-64 border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted stencil">
            Type
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 w-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-slate-900 text-white">
                  {option === 'all' ? 'All types' : option}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted stencil">
            Priority
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="mt-1 w-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-500/50 focus:outline-none"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-slate-900 text-white">
                  {option === 'all' ? 'All priorities' : option}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setTab('all');
                setTypeFilter('all');
                setPriorityFilter('all');
                setSearch('');
              }}
              className="w-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted hover:text-white"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="overflow-x-auto border border-white/10">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-widest text-muted stencil">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-xs text-muted stencil">
                  LOADING…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-xs text-muted">
                  No maintenance records here. Log one to get started.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-white">
                    <div className="font-medium">{row.asset?.name || '—'}</div>
                    <div className="text-xs text-muted">{row.asset?.assetTag}</div>
                  </td>
                  <td className="px-4 py-3 text-white">
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted">{row.priority || 'Medium'} • {row.assignee || 'Unassigned'}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.type}</td>
                  <td className="px-4 py-3 text-muted">{row.vendor || '—'}</td>
                  <td className="px-4 py-3 text-muted">
                    {row.cost != null ? `₹${Number(row.cost).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <MaintenanceStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setModal({ mode: 'edit', record: row })}
                      className="border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted hover:border-amber-500/40 hover:text-amber-400"
                    >
                      Update
                    </button>
                    <button onClick={() => clone(row)} className="ml-2 border border-white/10 px-3 py-1 text-[10px] text-muted hover:text-white">Clone</button>
                    <button onClick={() => remove(row)} className="ml-2 border border-red-500/30 px-3 py-1 text-[10px] text-red-400 hover:bg-red-500/10">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <MaintenanceModal
          mode={modal.mode}
          record={modal.record}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}