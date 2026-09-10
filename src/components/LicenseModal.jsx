import { useState } from 'react';
import api from '../api/client.js';

export default function LicenseModal({ license, onClose, onSaved }) {
  const isEdit = Boolean(license);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: license?.name || '',
    licenseKey: license?.licenseKey || '',
    vendor: license?.vendor || '',
    category: license?.category || '',
    seats: license?.seats ?? 1,
    purchaseDate: license?.purchaseDate ? license.purchaseDate.slice(0, 10) : '',
    expirationDate: license?.expirationDate ? license.expirationDate.slice(0, 10) : '',
    cost: license?.cost ?? '',
    notes: license?.notes || '',
  });

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.seats) {
      setError('Name and seat count are required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        licenseKey: form.licenseKey,
        vendor: form.vendor,
        category: form.category,
        seats: Number(form.seats),
        purchaseDate: form.purchaseDate || undefined,
        expirationDate: form.expirationDate || undefined,
        cost: form.cost === '' ? undefined : Number(form.cost),
        notes: form.notes,
      };

      if (isEdit) {
        await api.patch(`/licenses/${license._id}`, payload);
      } else {
        await api.post('/licenses', payload);
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
            {isEdit ? 'Edit License' : 'New License'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-white text-xs uppercase tracking-widest">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
          <Field label="Name">
            <input value={form.name} onChange={handleChange('name')} className="input" required />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Vendor">
              <input value={form.vendor} onChange={handleChange('vendor')} className="input" />
            </Field>
            <Field label="Category">
              <input value={form.category} onChange={handleChange('category')} className="input" />
            </Field>
          </div>

          <Field label="License key">
            <input value={form.licenseKey} onChange={handleChange('licenseKey')} className="input" />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Total seats">
              <input
                type="number"
                min="1"
                value={form.seats}
                onChange={handleChange('seats')}
                className="input"
                required
              />
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
            <Field label="Purchase date">
              <input type="date" value={form.purchaseDate} onChange={handleChange('purchaseDate')} className="input" />
            </Field>
            <Field label="Expiration date">
              <input
                type="date"
                value={form.expirationDate}
                onChange={handleChange('expirationDate')}
                className="input"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea value={form.notes} onChange={handleChange('notes')} rows={2} className="input resize-none" />
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
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create License'}
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