import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'manual', label: 'Manual' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLOR = {
  invoice: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  warranty: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  manual: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  insurance: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  other: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function fileIcon(mimeType) {
  if (mimeType?.includes('pdf')) return '📄';
  if (mimeType?.includes('image')) return '🖼️';
  if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '📊';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝';
  return '📎';
    }
  
export default function Documents() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocs = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/documents', {
        params: { category: category || undefined, search: search || undefined, page, limit: 20 },
      });
      setItems(data.items);
      setPagination(data.pagination);
    } catch {
      setError('Could not load documents - try again');
    } finally {   
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    const t = setTimeout(() => fetchDocs(1), 300); // debounce search
    return () => clearTimeout(t);
  }, [fetchDocs]);

  const handleDownload = async (assetId, docId, originalName) => {
    try {
      const response = await api.get(`/assets/${assetId}/documents/${docId}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalName || 'document';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download the document - try again');
    }
  };

  const handleDelete = async (assetId, docId) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await api.delete(`/assets/${assetId}/documents/${docId}`);
      setItems((prev) => prev.filter((d) => d._id !== docId));
    } catch {
      setError('Could not delete the document - try again');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="stencil text-lg text-ink tracking-wide">DOCUMENTS</h1>
        <span className="text-xs text-muted">{pagination.total} total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by label, file name, or asset tag…"
          className="flex-1 min-w-[220px] bg-panel border border-line rounded px-3 py-2 text-sm text-ink"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                category === c.value
                  ? c.value
                    ? CATEGORY_COLOR[c.value]
                    : 'bg-accent/15 text-accent border-accent/30'
                  : 'border-line text-muted hover:text-ink'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* List */}
      <div className="border border-line bg-panel rounded-md divide-y divide-line">
        {loading && <div className="px-4 py-8 text-center text-sm text-muted">Loading…</div>}

        {!loading && items.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted">No documents found</div>
        )}

        {!loading &&
          items.map((doc) => (
            <div key={doc._id} className="flex items-center gap-3 px-4 py-3">  
              <span className="text-lg">{fileIcon(doc.mimeType)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink truncate">{doc.label}</p>
                <p className="text-xs text-muted">
                  <Link to={`/assets/${doc.assetId}`} className="text-accent hover:underline">
                    {doc.assetTag}
                  </Link>
                  {' · '}
                  {doc.assetName} · {formatBytes(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLOR[doc.category] || CATEGORY_COLOR.other}`}>
                {doc.category}
              </span>
              <button onClick={() => handleDownload(doc.assetId, doc._id, doc.originalName)} className="text-xs text-accent hover:underline">
                Download
              </button>
              <button onClick={() => handleDelete(doc.assetId, doc._id)} className="text-xs text-red-400 hover:underline">
                Delete
              </button>
            </div>
          ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-muted">
          <button
            disabled={pagination.page <= 1}
            onClick={() => fetchDocs(pagination.page - 1)}
            className="px-3 py-1 border border-line rounded disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchDocs(pagination.page + 1)}
            className="px-3 py-1 border border-line rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}