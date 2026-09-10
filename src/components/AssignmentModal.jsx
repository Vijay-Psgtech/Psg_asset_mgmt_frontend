import { useEffect, useState } from 'react';
import api from '../api/client.js';

/**
 * Two modes:
 *  - mode="checkout": pick an available asset and assign it to someone
 *  - mode="checkin":  close out an existing assignment (pass `assignment`)
 */
export default function AssignmentModal({ mode, assignment, onClose, onSaved }) {
  const [availableAssets, setAvailableAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    assetId: '',
    name: '',
    email: '',
    department: '',
    dueDate: '',
    conditionOut: 'Good',
    conditionIn: 'Good',
    notes: '',
  });

  useEffect(() => {
    if (mode === 'checkout') {
      // ASSUMPTION: GET /api/assets?status=Available exists on your assets API
      api
        .get('/assets', { params: { status: 'available' } })
        .then((res) => setAvailableAssets(res.data?.data || res.data || []))
        .catch(() => setAvailableAssets([]));
    }
  }, [mode]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'checkout') {
        if (!form.assetId || !form.name) {
          setError('Select an asset and enter who it is assigned to.');
          setLoading(false);
          return;
        }
        await api.post('/assignments/checkout', {
          assetId: form.assetId,
          assignedTo: { name: form.name, email: form.email, department: form.department },
          dueDate: form.dueDate || undefined,
          conditionOut: form.conditionOut,
          notes: form.notes,
        });
      } else {
        await api.patch(`/assignments/${assignment._id}/checkin`, {
          conditionIn: form.conditionIn,
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
            {mode === 'checkout' ? 'New Checkout' : `Check In — ${assignment?.asset?.assetTag || ''}`}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-white text-xs uppercase tracking-widest"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          {mode === 'checkout' ? (
            <>
              <Field label="Asset">
                <select
                  value={form.assetId}
                  onChange={handleChange('assetId')}
                  className="input"
                  required
                >
                  <option value="">Select an available asset…</option>
                  {availableAssets.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.assetTag} — {a.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Assigned to">
                  <input value={form.name} onChange={handleChange('name')} className="input" required />
                </Field>
                <Field label="Department">
                  <input value={form.department} onChange={handleChange('department')} className="input" />
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  className="input"
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Due date">
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={handleChange('dueDate')}
                    className="input"
                  />
                </Field>
                <Field label="Condition out">
                  <input value={form.conditionOut} onChange={handleChange('conditionOut')} className="input" />
                </Field>
              </div>
            </>
          ) : (
            <Field label="Condition in">
              <input value={form.conditionIn} onChange={handleChange('conditionIn')} className="input" />
            </Field>
          )}

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={handleChange('notes')}
              rows={3}
              className="input resize-none"
            />
          </Field>

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
              {loading ? 'Saving…' : mode === 'checkout' ? 'Check Out' : 'Check In'}
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

/*
  Add this once to your global CSS (or Tailwind @layer components) if you
  don't already have an `.input` utility class:

  .input {
    @apply w-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
           placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none;
  }
*/