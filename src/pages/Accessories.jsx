import { useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import StockStatusBadge from '../components/StockStatusBadge.jsx';
import StockItemModal from '../components/StockItemModal.jsx';
import AccessoryCheckoutModal from '../components/AccessoryCheckoutModal.jsx';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'In Stock', label: 'In Stock' },
  { key: 'Low Stock', label: 'Low Stock' },
  { key: 'Out of Stock', label: 'Out of Stock' },
];

export default function Accessories() {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [checkoutItem, setCheckoutItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/accessories', { params: { status: tab, search: search || undefined } });
      setRows(res.data?.data || res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load accessories.');
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshCheckoutModal = async () => {
    if (!checkoutItem) return;
    const res = await api.get(`/accessories/${checkoutItem._id}`);
    setCheckoutItem(res.data);
    load();
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.name}? This cannot be undone.`)) return;
    try { await api.delete(`/accessories/${row._id}`); load(); } catch (err) { setError(err.response?.data?.message || 'Could not delete accessory.'); }
  };

  const clone = async (row) => {
    try {
      await api.post('/accessories', {
        name: `${row.name} (copy)`, category: row.category, manufacturer: row.manufacturer,
        modelNumber: row.modelNumber, totalQty: row.totalQty, minQty: row.minQty,
        purchaseDate: row.purchaseDate, cost: row.cost, notes: row.notes,
      });
      load();
    } catch (err) { setError(err.response?.data?.message || 'Could not clone accessory.'); }
  };

  return (
    <div className="min-h-screen bg-[#dfeaf2] px-2 py-3 sm:px-4 sm:py-4 lg:px-5">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] xl:grid-cols-[0.9fr_2.1fr]">
          <aside className="rounded-sm border border-[#ced7df] bg-[#eef3f7] p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <h1 className="stencil text-[12px] font-semibold uppercase tracking-[0.22em] text-[#1f2d3d]">Accessories</h1>
            <p className="mt-3 text-sm text-[#5b6978]">Non-serialized items issued by quantity — keyboards, docks, cables.</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    tab === t.key
                      ? 'border-[#d7c08d] bg-[#f6efe3] text-[#7a5a11]'
                      : 'border-[#d1dbe5] bg-white text-[#4f5f72] hover:border-[#b9c7d5] hover:text-[#1f2d3d]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-sm border border-[#ced7df] bg-[#eef3f7] p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <div className="mb-4 flex items-center justify-end">
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-md border border-[#d7c08d] bg-[#f8f0d5] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#765d20] transition hover:bg-[#f1e3a8] sm:px-4"
              >
                + New Accessory
              </button>
            </div>

            <div className="mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or manufacturer…"
                className="w-full rounded-md border border-[#d1dbe5] bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#86b4ff] focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

            <div className="overflow-x-auto border border-[#d9e1e8] bg-white">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e5edf3] bg-[#f5f7fa] text-[10px] uppercase tracking-[0.18em] text-[#5a6978]">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Manufacturer</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1f5]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-xs text-[#6d7a89] uppercase tracking-[0.14em]">
                        Loading…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-xs text-[#6d7a89]">
                        No accessories here. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row._id} className="hover:bg-[#f8fafc]">
                        <td className="px-4 py-3 text-[#172033]">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-[#738299]">{row.category || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-[#586a7c]">{row.manufacturer || '—'}</td>
                        <td className="px-4 py-3 text-[#586a7c]">
                          {row.qtyAvailable}/{row.totalQty} available
                        </td>
                        <td className="px-4 py-3">
                          <StockStatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setCheckoutItem(row)}
                              className="border border-[#dce5ef] bg-[#f6f9fc] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#53657b] hover:border-[#c0d2eb] hover:text-[#123357]"
                            >
                              Checkouts
                            </button>
                            <button
                              onClick={() => setEditItem(row)}
                              className="border border-[#dce5ef] bg-[#f6f9fc] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#53657b] hover:border-[#b9cbe8] hover:text-[#123357]"
                            >
                              Edit
                            </button>
                            <button onClick={() => clone(row)} className="border border-[#dce5ef] bg-[#f6f9fc] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#53657b] hover:text-[#123357]">Clone</button>
                            <button onClick={() => remove(row)} className="border border-red-200 bg-red-50 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-red-500 hover:bg-red-100">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {showCreate && (
        <StockItemModal
          resource="accessories"
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {editItem && (
        <StockItemModal
          resource="accessories"
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            load();
          }}
        />
      )}

      {checkoutItem && (
        <AccessoryCheckoutModal
          accessory={checkoutItem}
          onClose={() => setCheckoutItem(null)}
          onChanged={refreshCheckoutModal}
        />
      )}
    </div>
  );
}