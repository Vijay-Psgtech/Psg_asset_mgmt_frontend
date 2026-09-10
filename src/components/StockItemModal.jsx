import { useState } from 'react';
import api from '../api/client.js';

/**
 * `resource` is the API path segment: 'accessories' or 'consumables'.
 * Both models share the same core fields, so one modal covers both.
 */
export default function StockItemModal({ resource, item, onClose, onSaved }) {
  const isEdit = Boolean(item);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || '',
    manufacturer: item?.manufacturer || '',
    modelNumber: item?.modelNumber || '',
    totalQty: item?.totalQty ?? 0,
    minQty: item?.minQty ?? 0,
    purchaseDate: item?.purchaseDate ? item.purchaseDate.slice(0, 10) : '',
    cost: item?.cost ?? '',
    notes: item?.notes || '',
  });

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name) {
      setError('Name is required.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        manufacturer: form.manufacturer,
        modelNumber: form.modelNumber,
        totalQty: Number(form.totalQty) || 0,
        minQty: Number(form.minQty) || 0,
        purchaseDate: form.purchaseDate || undefined,
        cost: form.cost === '' ? undefined : Number(form.cost),
        notes: form.notes,
      };

      if (isEdit) {
        await api.patch(`/${resource}/${item._id}`, payload);
      } else {
        await api.post(`/${resource}`, payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-2 sm:p-4">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-[820px] overflow-y-auto rounded-md border border-white/10 bg-[#071d2d] shadow-[0_26px_65px_rgba(15,23,42,0.32)] sm:max-h-[calc(100dvh-2rem)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-3.5">
          <h2 className="stencil text-[11px] font-semibold uppercase tracking-[0.22em] text-[#eef6ff]">
            {isEdit ? 'Edit Item' : 'New Item'}
          </h2>
          <button onClick={onClose} className="text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:text-white">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid max-h-[70vh] gap-3 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name" fullWidth>
              <input value={form.name} onChange={handleChange('name')} className="input h-[42px] rounded-xl border border-white/10 bg-white text-[#0f172a]" required />
            </Field>
            <Field label="Category">
              <input value={form.category} onChange={handleChange('category')} className="input h-[42px] rounded-xl border border-white/10 bg-white text-[#0f172a]" />
            </Field>
            <Field label="Manufacturer">
              <input value={form.manufacturer} onChange={handleChange('manufacturer')} className="input h-[42px] rounded-xl border border-white/10 bg-white text-[#0f172a]" />
            </Field>
            <Field label="Model number">
              <input value={form.modelNumber} onChange={handleChange('modelNumber')} className="input h-[42px] rounded-xl border border-white/10 bg-white text-[#0f172a]" />
            </Field>
            <Field label={isEdit ? 'Total qty (adjust to restock)' : 'Total qty'}>
              <input
                type="number"
                min="0"
                value={form.totalQty}
                onChange={handleChange('totalQty')}
                className="input h-[42px] rounded-xl border border-white/10 bg-white text-[#0f172a]"
              />
            </Field>
            <Field label="Reorder threshold">
              <input type="number" min="0" value={form.minQty} onChange={handleChange('minQty')} className="input h-[42px] rounded-xl border border-white/10 bg-white text-[#0f172a]" />
            </Field>
            <Field label="Purchase date">
              <input type="date" value={form.purchaseDate} onChange={handleChange('purchaseDate')} className="input h-[42px] rounded-xl border border-white/10 bg-white text-[#0f172a]" />
            </Field>
            <Field label="Unit cost">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={handleChange('cost')}
                className="input h-[42px] rounded-xl border border-white/10 bg-white text-[#0f172a]"
              />
            </Field>
          </div>

          <Field label="Notes" fullWidth>
            <textarea value={form.notes} onChange={handleChange('notes')} rows={3} className="input min-h-[94px] resize-none rounded-xl border border-white/10 bg-white text-[#0f172a]" />
          </Field>

          {error && <p className="text-xs text-red-300">{error}</p>}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-200 transition hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md border border-[#d2a74d] bg-[#f3cd69] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1d2430] shadow-[0_10px_18px_rgba(208,170,62,0.2)] transition hover:bg-[#e7c45d] disabled:opacity-50"
            >
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, fullWidth = false }) {
  return (
    <label className={fullWidth ? 'block sm:col-span-2' : 'block'}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 stencil">
        {label}
      </span>
      {children}
    </label>
  );
}