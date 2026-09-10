import { useEffect, useState } from 'react';
import api from '../api/client.js';

const TYPES = ['Repair', 'Scheduled Service', 'Inspection', 'Upgrade', 'Other'];
const STATUSES = ['Open', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

/**
 * Two modes:
 *  - mode="create": open a new record, requires picking an asset
 *  - mode="edit":   update status/details of an existing record (pass `record`)
 */
export default function MaintenanceModal({ mode, record, onClose, onSaved }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    assetId: record?.asset?._id || '',
    type: record?.type || 'Repair',
    priority: record?.priority || 'Medium',
    title: record?.title || '',
    description: record?.description || '',
    vendor: record?.vendor || '',
    assignee: record?.assignee || '',
    team: record?.team || '',
    recurring: Boolean(record?.recurring),
    cost: record?.cost ?? '',
    startDate: record?.startDate ? record.startDate.slice(0, 10) : '',
    dueDate: record?.dueDate ? record.dueDate.slice(0, 10) : '',
    status: record?.status || 'Open',
    notes: record?.notes || '',
  });

  useEffect(() => {
    if (mode === 'create') {
      // ASSUMPTION: GET /api/assets exists; not filtering by status since a record can be
      // logged against any asset (including one that's currently Assigned).
      api
        .get('/assets')
        .then((res) => setAssets(res.data?.items || res.data?.data || res.data || []))
        .catch(() => setAssets([]));
    }
  }, [mode]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'create' && (!form.assetId || !form.title)) {
      setError('Select an asset and enter a title for this record.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        await api.post('/maintenance', {
          assetId: form.assetId,
          type: form.type,
          priority: form.priority,
          title: form.title,
          description: form.description,
          vendor: form.vendor,
          assignee: form.assignee,
          team: form.team,
          recurring: form.recurring,
          cost: form.cost === '' ? undefined : Number(form.cost),
          startDate: form.startDate || undefined,
          dueDate: form.dueDate || undefined,
          status: form.status,
          notes: form.notes,
        });
      } else {
        await api.patch(`/maintenance/${record._id}`, {
          type: form.type,
          priority: form.priority,
          title: form.title,
          description: form.description,
          vendor: form.vendor,
          assignee: form.assignee,
          team: form.team,
          recurring: form.recurring,
          cost: form.cost === '' ? undefined : Number(form.cost),
          startDate: form.startDate || undefined,
          dueDate: form.dueDate || undefined,
          status: form.status,
          notes: form.notes,
        });
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto border border-white/10 bg-ink shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="stencil text-sm font-semibold uppercase tracking-widest text-white">
            {mode === 'create' ? 'New Maintenance Record' : `Update — ${record?.asset?.assetTag || ''}`}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-white text-xs uppercase tracking-widest">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
          {mode === 'create' && (
            <Field label="Asset">
              <select value={form.assetId} onChange={handleChange('assetId')} className="input" required>
                <option value="">Select an asset…</option>
                {assets.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.assetTag} — {a.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select value={form.type} onChange={handleChange('type')} className="input">
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={handleChange('priority')} className="input">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Status">
              <select value={form.status} onChange={handleChange('status')} className="input">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Recurring service">
              <label className="flex h-[42px] items-center gap-2 rounded border border-white/10 bg-white/5 px-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.checked }))}
                  className="h-4 w-4 accent-amber-500"
                />
                <span>Repeat schedule</span>
              </label>
            </Field>
          </div>

          <Field label="Title">
            <input value={form.title} onChange={handleChange('title')} className="input" required />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              rows={2}
              className="input resize-none"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Vendor / Team">
              <input value={form.vendor} onChange={handleChange('vendor')} className="input" placeholder="Internal IT, Vendor, etc." />
            </Field>
            <Field label="Assignee">
              <input value={form.assignee} onChange={handleChange('assignee')} className="input" placeholder="Who owns this task?" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Team / Department">
              <input value={form.team} onChange={handleChange('team')} className="input" placeholder="Facilities, Ops, IT" />
            </Field>
            <Field label="Cost">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={handleChange('cost')}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Start date">
              <input type="date" value={form.startDate} onChange={handleChange('startDate')} className="input" />
            </Field>
            <Field label="Due date">
              <input type="date" value={form.dueDate} onChange={handleChange('dueDate')} className="input" />
            </Field>
          </div>

          {mode === 'edit' && (
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={handleChange('notes')}
                rows={2}
                className="input resize-none"
              />
            </Field>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
            >
              {loading ? 'Saving…' : mode === 'create' ? 'Log Record' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted stencil">
        {label}
      </span>
      {children}
    </label>
  );
}