import { useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import AssignmentModal from '../components/AssignmentModal.jsx';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'assigned', label: 'Active' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'returned', label: 'Returned' },
];

export default function Assignments() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { mode: 'checkout' | 'checkin', assignment? }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/assignments', {
        params: { status: tab, search: search || undefined },
      });
      setRows(res.data?.data || res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load assignments.');
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = () => {
    setModal(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="stencil text-lg font-semibold uppercase tracking-widest text-white">
            Assignments
          </h1>
          <p className="text-xs text-muted">Track which asset is out with whom, and when it is due back.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'checkout' })}
          className="border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-400 hover:bg-amber-500/20"
        >
          + New Checkout
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex gap-1">
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
          placeholder="Search by name, email, department…"
          className="w-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none sm:w-64"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="overflow-x-auto border border-white/10">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-widest text-muted stencil">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Checked Out</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted stencil">
                  LOADING…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted">
                  No assignments here. Check something out to get started.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-white">
                    <div className="font-medium">{row.asset?.name || '—'}</div>
                    <div className="text-xs text-muted">{row.asset?.assetTag}</div>
                  </td>
                  <td className="px-4 py-3 text-white">{row.assignedTo?.name}</td>
                  <td className="px-4 py-3 text-muted">{row.assignedTo?.department || '—'}</td>
                  <td className="px-4 py-3 text-muted">
                    {row.checkoutDate ? new Date(row.checkoutDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.status !== 'returned' ? (
                      <button
                        onClick={() => setModal({ mode: 'checkin', assignment: row })}
                        className="border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted hover:border-emerald-500/40 hover:text-emerald-400"
                      >
                        Check In
                      </button>
                    ) : (
                      <span className="text-[10px] text-muted">
                        {row.checkinDate ? new Date(row.checkinDate).toLocaleDateString() : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <AssignmentModal
          mode={modal.mode}
          assignment={modal.assignment}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}