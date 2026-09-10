import { useEffect, useState, useCallback } from 'react';
import client from '../api/client.js';
import { Spinner, ErrorBanner, EmptyState } from '../components/Common.jsx';

const ACTIONS = ['create', 'update', 'delete', 'assign', 'return', 'maintenance_add', 'maintenance_update', 'login', 'login_failed', 'logout'];
const fmtDateTime = (d) => new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const ACTION_COLORS = {
  create: 'text-mint',
  update: 'text-accent2',
  delete: 'text-red-400',
  assign: 'text-accent2',
  return: 'text-mint',
  maintenance_add: 'text-accent',
  maintenance_update: 'text-accent',
  login: 'text-muted',
  login_failed: 'text-red-400',
  logout: 'text-muted',
};

export default function AuditLog() {
  const [items, setItems] = useState([]);
  const [action, setAction] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((page = 1) => {
    setLoading(true);
    client
      .get('/audit-logs', { params: { page, limit: 30, ...(action ? { action } : {}) } })
      .then(({ data }) => {
        setItems(data.items);
        setPagination(data.pagination);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load audit log — admin access required'))
      .finally(() => setLoading(false));
  }, [action]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="stencil text-2xl font-bold text-zinc-50">Audit Log</h1>
          <p className="text-sm text-muted mt-1">Full trail of system activity</p>
        </div>
        <select className="input max-w-[200px]" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All Actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner label="LOADING AUDIT LOG" />
      ) : items.length === 0 ? (
        <EmptyState title="No activity yet" subtitle="System actions will appear here as they happen." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-mono uppercase tracking-wider text-muted">
                  <th className="text-left px-4 py-3">Timestamp</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Entity</th>
                  <th className="text-left px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody>   
                {items.map((log) => (
                  <tr key={log._id} className="border-b border-line last:border-0 hover:bg-panel2/60 transition-colors">
                    <td className="px-4 py-3 text-muted font-mono text-xs">{fmtDateTime(log.createdAt)}</td>
                    <td className={`px-4 py-3 font-mono text-xs uppercase ${ACTION_COLORS[log.action] || 'text-muted'}`}>{log.action.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-zinc-100">{log.entityType}{log.entityLabel ? ` — ${log.entityLabel}` : ''}</td>
                    <td className="px-4 py-3 text-muted">{log.performedBy?.name || log.performedBy?.email || 'system'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button className="btn-outline text-xs py-1.5" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>← Prev</button>
              <span className="text-xs font-mono text-muted">Page {pagination.page} / {pagination.pages}</span>
              <button className="btn-outline text-xs py-1.5" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
