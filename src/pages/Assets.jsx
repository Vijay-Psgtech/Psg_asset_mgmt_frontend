import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import client from '../api/client.js';
import StatusChip from '../components/StatusChip.jsx';
import { Spinner, ErrorBanner, EmptyState } from '../components/Common.jsx';

const CATEGORIES = ['Laptop', 'Desktop', 'Monitor', 'Phone', 'Tablet', 'Server', 'Networking', 'Peripheral', 'Software License', 'Other'];
const STATUSES = ['available', 'assigned', 'in_maintenance', 'retired', 'lost', 'byod', 'deleted'];

export default function Assets() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState(() => searchParams.get('status') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAssets = useCallback(
    (page = 1) => {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (status) params.status = status;

      client
        .get('/assets', { params })
        .then(({ data }) => {
          setItems(data.items);
          setPagination(data.pagination);
          setError('');
        })
        .catch((err) => setError(err.response?.data?.message || 'Failed to load assets'))
        .finally(() => setLoading(false));
    },
    [search, category, status]
  );

  const remove = async (asset) => {
    if (!window.confirm(`Delete ${asset.name}? This cannot be undone.`)) return;
    try { await client.delete(`/assets/${asset._id}`); fetchAssets(pagination.page); } catch (err) { setError(err.response?.data?.message || 'Could not delete asset.'); }
  };

  const clone = async (asset) => {
    try {
      const payload = {
        name: `${asset.name} (copy)`, category: asset.category, brand: asset.brand,
        model: asset.model, purchaseCost: asset.purchaseCost, vendor: asset.vendor,
        warrantyExpiry: asset.warrantyExpiry, location: asset.location, notes: asset.notes,
      };
      await client.post('/assets', payload);
      fetchAssets(pagination.page);
    } catch (err) { setError(err.response?.data?.message || 'Could not clone asset.'); }
  };

  useEffect(() => {
    setStatus(searchParams.get('status') || '');
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => fetchAssets(1), 300);
    return () => clearTimeout(t);
  }, [fetchAssets]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="stencil text-2xl font-bold text-zinc-50">Assets</h1>
          <p className="text-sm text-muted mt-1">{pagination.total} total in inventory</p>
        </div>
        <Link to="/assets/new" className="btn-primary">+ New Asset</Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          className="input max-w-xs"
          placeholder="Search tag, name, serial…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-[180px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner label="LOADING ASSETS" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No assets found"
          subtitle="Try adjusting your filters, or add your first asset."
          action={<Link to="/assets/new" className="btn-primary">+ New Asset</Link>}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-[820px] w-full text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-mono uppercase tracking-wider text-muted">
                <th className="text-left px-4 py-3">Tag</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Serial</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a._id} className="border-b border-line last:border-0 hover:bg-panel2/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/assets/${a._id}`} className="font-mono text-accent hover:underline">
                      {a.assetTag}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-100">{a.name}</td>
                  <td className="px-4 py-3 text-muted">{a.category}</td>
                  <td className="px-4 py-3"><StatusChip status={a.status} /></td>
                  <td className="px-4 py-3 text-muted">{a.location || '—'}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{a.serialNumber || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/assets/${a._id}/edit`} className="btn-outline px-2 py-1 text-[10px]">Edit</Link>
                      <button onClick={() => clone(a)} className="btn-outline px-2 py-1 text-[10px]">Clone</button>
                      <button onClick={() => remove(a)} className="rounded border border-red-200 px-2 py-1 text-[10px] text-red-500 hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            className="btn-outline text-xs py-1.5"
            disabled={pagination.page <= 1}
            onClick={() => fetchAssets(pagination.page - 1)}
          >
            ← Prev
          </button>
          <span className="text-xs font-mono text-muted">
            Page {pagination.page} / {pagination.pages}
          </span>
          <button
            className="btn-outline text-xs py-1.5"
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchAssets(pagination.page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
