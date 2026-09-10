import { useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import LicenseStatusBadge from '../components/LicenseStatusBadge.jsx';
import LicenseModal from '../components/LicenseModal.jsx';
import LicenseSeatsModal from '../components/LicenseSeatsModal.jsx';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'Active', label: 'Active' },
  { key: 'Expiring Soon', label: 'Expiring Soon' },
  { key: 'Expired', label: 'Expired' },
];

export default function Licenses() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState(null); // license or null/undefined for "new"
  const [showCreate, setShowCreate] = useState(false);
  const [seatsModal, setSeatsModal] = useState(null); // license

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/licenses', {
        params: { status: tab, search: search || undefined },
      });
      setRows(res.data?.data || res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load licenses.');
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the seats panel's data fresh after an assign/revoke without a full page refetch flicker.
  const refreshSeatsModal = async () => {
    if (!seatsModal) return;
    const res = await api.get(`/licenses/${seatsModal._id}`);
    setSeatsModal(res.data);
    load();
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.name}? This cannot be undone.`)) return;
    try { await api.delete(`/licenses/${row._id}`); load(); } catch (err) { setError(err.response?.data?.message || 'Could not delete license.'); }
  };

  const clone = async (row) => {
    try {
      await api.post('/licenses', {
        name: `${row.name} (copy)`, licenseKey: row.licenseKey, vendor: row.vendor,
        category: row.category, seats: row.seats, purchaseDate: row.purchaseDate,
        expirationDate: row.expirationDate, cost: row.cost, notes: row.notes,
      });
      load();
    } catch (err) { setError(err.response?.data?.message || 'Could not clone license.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="stencil text-lg font-semibold uppercase tracking-widest text-white">Licenses</h1>
          <p className="text-xs text-muted">Software seats, expiries, and who is using what.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-400 hover:bg-amber-500/20"
        >
          + New License
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
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
          placeholder="Search by name or vendor…"
          className="w-64 border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="overflow-x-auto border border-white/10">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-widest text-muted stencil">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted stencil">
                  LOADING…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted">
                  No licenses here. Add one to get started.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-white">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted">{row.category || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.vendor || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="mb-1 text-xs text-muted">
                      {row.seatsUsed}/{row.seats} used
                    </div>
                    <div className="h-1 w-24 bg-white/5">
                      <div
                        className="h-1 bg-amber-500"
                        style={{ width: `${Math.min(100, (row.seatsUsed / row.seats) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.expirationDate ? new Date(row.expirationDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <LicenseStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSeatsModal(row)}
                        className="border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted hover:border-amber-500/40 hover:text-amber-400"
                      >
                        Seats
                      </button>
                      <button
                        onClick={() => setEditModal(row)}
                        className="border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted hover:border-white/30 hover:text-white"
                      >
                        Edit
                      </button>
                      <button onClick={() => clone(row)} className="border border-white/10 px-3 py-1 text-[10px] text-muted hover:text-white">Clone</button>
                      <button onClick={() => remove(row)} className="border border-red-500/30 px-3 py-1 text-[10px] text-red-400 hover:bg-red-500/10">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <LicenseModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {editModal && (
        <LicenseModal
          license={editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => {
            setEditModal(null);
            load();
          }}
        />
      )}

      {seatsModal && (
        <LicenseSeatsModal license={seatsModal} onClose={() => setSeatsModal(null)} onChanged={refreshSeatsModal} />
      )}
    </div>
  );
}