import { useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import StockStatusBadge from '../components/StockStatusBadge.jsx';
import StockItemModal from '../components/StockItemModal.jsx';
import ConsumableIssueModal from '../components/ConsumableIssueModal.jsx';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'In Stock', label: 'In Stock' },
  { key: 'Low Stock', label: 'Low Stock' },
  { key: 'Out of Stock', label: 'Out of Stock' },
];

export default function Consumables() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [issueItem, setIssueItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/consumables', { params: { status: tab, search: search || undefined } });
      setRows(res.data?.data || res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load consumables.');
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshIssueModal = async () => {
    if (!issueItem) return;
    const res = await api.get(`/consumables/${issueItem._id}`);
    setIssueItem(res.data);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="stencil text-lg font-semibold uppercase tracking-widest text-white">Consumables</h1>
          <p className="text-xs text-muted">Stock that gets used up — toner, cables, cleaning supplies.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-400 hover:bg-amber-500/20"
        >
          + New Consumable
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
          placeholder="Search by name or manufacturer…"
          className="w-64 border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="overflow-x-auto border border-white/10">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-[10px] uppercase tracking-widest text-muted stencil">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Manufacturer</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-xs text-muted stencil">
                  LOADING…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-xs text-muted">
                  No consumables here. Add one to get started.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-white">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted">{row.category || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.manufacturer || '—'}</td>
                  <td className="px-4 py-3 text-muted">
                    {row.qtyRemaining}/{row.totalQty} remaining
                  </td>
                  <td className="px-4 py-3">
                    <StockStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIssueItem(row)}
                        className="border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted hover:border-amber-500/40 hover:text-amber-400"
                      >
                        Issue Log
                      </button>
                      <button
                        onClick={() => setEditItem(row)}
                        className="border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted hover:border-white/30 hover:text-white"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <StockItemModal
          resource="consumables"
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {editItem && (
        <StockItemModal
          resource="consumables"
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            load();
          }}
        />
      )}

      {issueItem && (
        <ConsumableIssueModal
          consumable={issueItem}
          onClose={() => setIssueItem(null)}
          onChanged={refreshIssueModal}
        />
      )}
    </div>
  );
}