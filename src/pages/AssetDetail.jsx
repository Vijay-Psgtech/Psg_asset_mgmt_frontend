import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import client from '../api/client.js';
import StatusChip from '../components/StatusChip.jsx';
import { Spinner, ErrorBanner } from '../components/Common.jsx';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const currency = (n) => (n || n === 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—');

function AssignModal({ assetId, onClose, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', department: '', conditionOnAssign: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await client.post('/assignments/checkout', {
        assetId,
        assignedTo: { name: form.name, email: form.email || undefined, department: form.department || undefined },
        conditionOut: form.conditionOnAssign || undefined,
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign asset');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <form onSubmit={submit} className="card p-6 w-full max-w-md">
        <h3 className="stencil text-lg text-zinc-50 mb-4">Assign Asset</h3>
        <ErrorBanner message={error} />
        <div className="space-y-3">
          <div>
            <label className="label">Assignee Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Department</label>
            <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className="label">Condition at Handoff</label>
            <input className="input" value={form.conditionOnAssign} onChange={(e) => setForm({ ...form, conditionOnAssign: e.target.value })} placeholder="Good, minor scuffs on lid" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Assigning…' : 'Assign'}</button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    client
      .get(`/assets/${id}`)
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load asset'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleReturn = async () => {
    const activeAssignmentId = data?.asset?.currentAssignment?._id;
    if (!activeAssignmentId) return;
    setActionError('');
    try {
      await client.patch(`/assignments/${activeAssignmentId}/checkin`, {});
      load();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to return asset');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this asset permanently? This cannot be undone.')) return;
    try {
      await client.delete(`/assets/${id}`);
      navigate('/assets');
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete asset');
    }
  };

  if (loading) return <Spinner label="LOADING ASSET" />;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;

  const { asset, assignmentHistory, maintenanceHistory } = data;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-accent text-sm">{asset.assetTag}</span>
            <StatusChip status={asset.status} />
          </div>
          <h1 className="stencil text-2xl font-bold text-zinc-50">{asset.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link to={`/assets/${id}/edit`} className="btn-outline text-xs py-1.5">Edit</Link>
          <button className="btn-outline text-xs py-1.5 hover:border-red-400 hover:text-red-400" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <ErrorBanner message={actionError} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-4">Details</div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted text-xs mb-0.5">Category</dt><dd className="text-zinc-100">{asset.category}</dd></div>
              <div><dt className="text-muted text-xs mb-0.5">Location</dt><dd className="text-zinc-100">{asset.location || '—'}</dd></div>
              <div><dt className="text-muted text-xs mb-0.5">Brand / Model</dt><dd className="text-zinc-100">{[asset.brand, asset.model].filter(Boolean).join(' / ') || '—'}</dd></div>
              <div><dt className="text-muted text-xs mb-0.5">Serial Number</dt><dd className="text-zinc-100 font-mono text-xs">{asset.serialNumber || '—'}</dd></div>
              <div><dt className="text-muted text-xs mb-0.5">Vendor</dt><dd className="text-zinc-100">{asset.vendor || '—'}</dd></div>
              <div><dt className="text-muted text-xs mb-0.5">Purchase Cost</dt><dd className="text-zinc-100">{currency(asset.purchaseCost)}</dd></div>
              <div><dt className="text-muted text-xs mb-0.5">Purchase Date</dt><dd className="text-zinc-100">{fmtDate(asset.purchaseDate)}</dd></div>
              <div><dt className="text-muted text-xs mb-0.5">Warranty Expiry</dt><dd className="text-zinc-100">{fmtDate(asset.warrantyExpiry)}</dd></div>
            </dl>
            {asset.notes && (
              <div className="mt-4 pt-4 border-t border-line">
                <div className="text-muted text-xs mb-1">Notes</div>
                <div className="text-zinc-200 text-sm whitespace-pre-wrap">{asset.notes}</div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted">Assignment History</div>
              {asset.status === 'available' && (
                <button className="btn-primary text-xs py-1.5" onClick={() => setShowAssign(true)}>Assign</button>
              )}
              {asset.status === 'assigned' && (
                <button className="btn-outline text-xs py-1.5" onClick={handleReturn}>Mark Returned</button>
              )}
            </div>
            {assignmentHistory.length === 0 ? (
              <div className="text-sm text-muted py-4">No assignment history yet.</div>
            ) : (
              <div className="space-y-3">
                {assignmentHistory.map((h) => (
                  <div key={h._id} className="flex items-center justify-between text-sm border-b border-line last:border-0 pb-3 last:pb-0">
                    <div>
                      <div className="text-zinc-100">{h.assignedTo.name} {h.assignedTo.department ? `· ${h.assignedTo.department}` : ''}</div>
                      <div className="text-muted text-xs">{fmtDate(h.checkoutDate)} → {h.checkinDate ? fmtDate(h.checkinDate) : 'present'}</div>
                    </div>
                    <StatusChip status={h.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted">Maintenance History</div>
              <Link to="/maintenance" state={{ assetId: id }} className="btn-outline text-xs py-1.5">Log Maintenance</Link>
            </div>
            {maintenanceHistory.length === 0 ? (
              <div className="text-sm text-muted py-4">No maintenance recorded.</div>
            ) : (
              <div className="space-y-3">
                {maintenanceHistory.map((m) => (
                  <div key={m._id} className="flex items-start justify-between text-sm border-b border-line last:border-0 pb-3 last:pb-0">
                    <div>
                      <div className="text-zinc-100 capitalize">{m.type} — {m.description}</div>
                      <div className="text-muted text-xs">{fmtDate(m.scheduledDate || m.createdAt)} {m.cost ? `· ${currency(m.cost)}` : ''}</div>
                    </div>
                    <StatusChip status={m.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6 text-center">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-4">Asset QR Tag</div>
            {asset.qrCode ? (
              <img src={asset.qrCode} alt={`QR code for ${asset.assetTag}`} className="w-full max-w-[200px] mx-auto border border-line" />
            ) : (
              <div className="text-sm text-muted py-8">No QR code generated</div>
            )}
            <div className="font-mono text-xs text-muted mt-3">{asset.assetTag}</div>
          </div>

          {asset.currentAssignment && (
            <div className="card p-6">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted mb-3">Currently Assigned To</div>
              <div className="text-zinc-100 text-sm font-medium">{asset.currentAssignment.assignedTo?.name}</div>
              <div className="text-muted text-xs mt-1">Since {fmtDate(asset.currentAssignment.checkoutDate)}</div>
            </div>
          )}
        </div>
      </div>

      {showAssign && (
        <AssignModal
          assetId={id}
          onClose={() => setShowAssign(false)}
          onDone={() => { setShowAssign(false); load(); }}
        />
      )}
    </div>
  );
}
