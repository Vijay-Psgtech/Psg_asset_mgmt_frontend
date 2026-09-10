import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import StatusChip from '../components/StatusChip.jsx';
import { EmptyState, ErrorBanner, Spinner } from '../components/Common.jsx';

export default function RequestableItems() {
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: assetsResponse }, { data: requestsResponse }] = await Promise.all([
        api.get('/assets', { params: { status: 'available', search: search || undefined, page, limit: 20 } }),
        api.get('/asset-requests/mine'),
      ]);
      setItems(assetsResponse.items || []);
      setPagination(assetsResponse.pagination || { page, pages: 1, total: 0 });
      setRequests(requestsResponse.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load requestable items.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const requestAsset = async (assetId) => {
    setRequesting(assetId);
    setError('');
    setMessage('');
    try {
      await api.post('/asset-requests', { assetId });
      setMessage('Asset request submitted successfully.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit the asset request.');
    } finally {
      setRequesting('');
    }
  };

  const pendingAssetIds = new Set(requests.filter((request) => request.status === 'pending').map((request) => request.asset?._id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="dashboard-eyebrow">Assets / requestable items</div>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Requestable Items</h1>
          <p className="mt-1 text-sm text-muted">Browse available assets from the live inventory and request one for your work.</p>
        </div>
        <Link to="/my-assets?tab=requested" className="btn-outline text-xs">View my requests</Link>
      </div>

      <section className="dashboard-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="text-sm font-semibold text-ink">Available assets <span className="ml-1 text-xs font-normal text-muted">{pagination.total}</span></div>
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search asset tag, name, model..." className="input w-full sm:max-w-xs" />
        </div>
        {message && <p className="border-b border-line bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
        <ErrorBanner message={error} />
        {loading ? <Spinner label="LOADING REQUESTABLE ITEMS" /> : items.length === 0 ? <EmptyState title="No requestable items" subtitle="There are no available assets matching your search." /> : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[760px] text-left">
              <thead><tr><th>Asset</th><th>Model</th><th>Serial</th><th>Location</th><th>Status</th><th className="text-right">Action</th></tr></thead>
              <tbody>{items.map((asset) => {
                const requested = pendingAssetIds.has(asset._id);
                return <tr key={asset._id}>
                  <td><Link to={`/assets/${asset._id}`} className="font-semibold text-accent hover:underline">{asset.assetTag}</Link><div className="mt-1 text-xs text-muted">{asset.name}</div></td>
                  <td>{asset.model || asset.brand || '—'}</td>
                  <td className="font-mono text-xs">{asset.serialNumber || '—'}</td>
                  <td>{asset.location || '—'}</td>
                  <td><StatusChip status={asset.status} /></td>
                  <td className="text-right"><button type="button" disabled={requested || requesting === asset._id} onClick={() => requestAsset(asset._id)} className="btn-primary px-3 py-1.5 text-xs disabled:cursor-not-allowed">{requesting === asset._id ? 'Requesting...' : requested ? 'Requested' : 'Request'}</button></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && <div className="flex items-center justify-center gap-3 border-t border-line p-4"><button type="button" className="btn-outline text-xs" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="text-xs text-muted">Page {page} of {pagination.pages}</span><button type="button" className="btn-outline text-xs" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
      </section>
    </div>
  );
}
