import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client.js';
import { ErrorBanner, Spinner } from '../components/Common.jsx';

const CATEGORIES = ['Laptop', 'Desktop', 'Monitor', 'Phone', 'Tablet', 'Server', 'Networking', 'Peripheral', 'Software License', 'Other'];

const emptyForm = {
  name: '',
  category: 'Laptop',
  brand: '',
  model: '',
  serialNumber: '',
  purchaseDate: '',
  purchaseCost: '',
  vendor: '',
  warrantyExpiry: '',
  location: '',
  notes: '',
};

const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

export default function AssetForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    client
      .get(`/assets/${id}`)
      .then(({ data }) => {
        const a = data.asset;
        setForm({
          name: a.name || '',
          category: a.category || 'Laptop',
          brand: a.brand || '',
          model: a.model || '',
          serialNumber: a.serialNumber || '',
          purchaseDate: toDateInput(a.purchaseDate),
          purchaseCost: a.purchaseCost ?? '',
          vendor: a.vendor || '',
          warrantyExpiry: toDateInput(a.warrantyExpiry),
          location: a.location || '',
          notes: a.notes || '',
        });
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load asset'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      ...form,
      purchaseCost: form.purchaseCost === '' ? undefined : Number(form.purchaseCost),
      purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined,
      warrantyExpiry: form.warrantyExpiry ? new Date(form.warrantyExpiry).toISOString() : undefined,
    };
    // strip empty optional strings so zod optional() doesn't choke on ''
    Object.keys(payload).forEach((k) => {
      if (payload[k] === '') delete payload[k];
    });

    try {  
      if (isEdit) {
        await client.put(`/assets/${id}`, payload);
        navigate(`/assets/${id}`);
      } else {
        const { data } = await client.post('/assets', payload);
        navigate(`/assets/${data.asset._id}`);
      }
    } catch (err) {
      const details = err.response?.data?.details;
      setError(details ? details.map((d) => `${d.path}: ${d.message}`).join(', ') : err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner label="LOADING ASSET" />;

  return (
    <div className="max-w-2xl">
      <h1 className="stencil text-2xl font-bold text-zinc-50 mb-6">{isEdit ? 'Edit Asset' : 'New Asset'}</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <ErrorBanner message={error} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="col-span-2">
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={update('name')} placeholder="MacBook Pro 14&quot;" required />
          </div>

          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={update('category')} required>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Location</label>
            <input className="input" value={form.location} onChange={update('location')} placeholder="HQ - Floor 3" />
          </div>

          <div>
            <label className="label">Brand</label>
            <input className="input" value={form.brand} onChange={update('brand')} placeholder="Apple" />
          </div>

          <div>
            <label className="label">Model</label>
            <input className="input" value={form.model} onChange={update('model')} placeholder="M3 Pro" />
          </div>

          <div>
            <label className="label">Serial Number</label>
            <input className="input" value={form.serialNumber} onChange={update('serialNumber')} placeholder="C02XXXXXXX" />
          </div>

          <div>
            <label className="label">Vendor</label>
            <input className="input" value={form.vendor} onChange={update('vendor')} placeholder="Apple Store" />
          </div>

          <div>
            <label className="label">Purchase Date</label>
            <input className="input" type="date" value={form.purchaseDate} onChange={update('purchaseDate')} />
          </div>

          <div>
            <label className="label">Purchase Cost (USD)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.purchaseCost} onChange={update('purchaseCost')} placeholder="1999.00" />
          </div>

          <div>
            <label className="label">Warranty Expiry</label>
            <input className="input" type="date" value={form.warrantyExpiry} onChange={update('warrantyExpiry')} />
          </div>

          <div className="col-span-2">
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={update('notes')} placeholder="Any additional details…" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Asset'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
