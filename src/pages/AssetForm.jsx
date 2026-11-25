import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner, Spinner } from '../components/Common.jsx';

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
  const { user } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [institutionId, setInstitutionId] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);
  const [customFieldsError, setCustomFieldsError] = useState(false);
  const [institutionsLoading, setInstitutionsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit || user?.role !== 'superadmin') return;
    let active = true;
    setInstitutionsLoading(true);
    client
      .get('/institutions', { params: { status: 'active' } })
      .then(({ data }) => {
        if (active) setInstitutions(data.institutions || []);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load institutions');
      })
      .finally(() => {
        if (active) setInstitutionsLoading(false);
      });
    return () => { active = false; };
  }, [isEdit, user?.role]);

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
        setInstitutionId(a.institution?._id || a.institution || '');
        setCustomFieldValues(Object.fromEntries((a.customFields || []).map((field) => [field.key, field.value])));
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load asset'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    let active = true;
    client.get('/categories', { params: { includeInactive: 'true' } })
      .then(({ data }) => {
        if (!active) return;
        const allCategories = data.categories || [];
        setCategories(allCategories);
        const available = allCategories.filter((category) => category.active);
        setForm((current) => ({
          ...current,
          category: allCategories.some((category) => category.name === current.category)
            ? current.category
            : available[0]?.name || '',
        }));
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load categories'))
      .finally(() => { if (active) setCategoriesLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setCustomFieldsLoading(true);
    setCustomFieldsError(false);
    client.get('/custom-fields', {
      params: { category: form.category },
    })
      .then(({ data }) => {
        if (!active) return;
        const definitions = data.fields || [];
        setCustomFieldDefinitions(definitions);
        setCustomFieldsError(false);
        setCustomFieldValues((current) => Object.fromEntries(definitions
          .filter((field) => Object.prototype.hasOwnProperty.call(current, field.key))
          .map((field) => [field.key, current[field.key]])));
      })
      .catch((err) => {
        if (active) {
          setCustomFieldDefinitions([]);
          setCustomFieldsError(true);
          setError(err.response?.data?.message || 'Failed to load custom fields');
        }
      })
      .finally(() => { if (active) setCustomFieldsLoading(false); });
    return () => { active = false; };
  }, [form.category]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const updateCategory = (event) => {
    setForm((current) => ({ ...current, category: event.target.value }));
    setCustomFieldDefinitions([]);
    setCustomFieldValues({});
    setCustomFieldsLoading(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      ...form,
      ...(user?.role === 'superadmin' && !isEdit ? { institutionId } : {}),
      purchaseCost: form.purchaseCost === '' ? undefined : Number(form.purchaseCost),
      purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined,
      warrantyExpiry: form.warrantyExpiry ? new Date(form.warrantyExpiry).toISOString() : undefined,
      customFields: Object.fromEntries(customFieldDefinitions.map((field) => {
        const value = customFieldValues[field.key];
        if (value === '' || value === undefined || value === null) return [field.key, undefined];
        return [field.key, field.type === 'number' ? Number(value) : value];
      })),
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
          {!isEdit && user?.role === 'superadmin' && (
            <div className="col-span-2">
              <label className="label" htmlFor="asset-institution">Institution *</label>
              <select
                id="asset-institution"
                className="input"
                value={institutionId}
                onChange={(event) => setInstitutionId(event.target.value)}
                required
                disabled={institutionsLoading || !institutions.length}
              >
                <option value="">{institutionsLoading ? 'Loading institutions…' : 'Select an institution'}</option>
                {institutions.map((institution) => (
                  <option key={institution.id || institution._id} value={institution.id || institution._id}>
                    {institution.name}{institution.code ? ` (${institution.code})` : ''}
                  </option>
                ))}
              </select>
              {!institutionsLoading && !institutions.length && (
                <span className="mt-1 block text-xs text-red-600">No active institutions available.</span>
              )}
            </div>
          )}
          <div className="col-span-2">
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={update('name')} placeholder="MacBook Pro 14&quot;" required />
          </div>

          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={updateCategory} required>
              {categories.filter((category) => category.active || category.name === form.category).map((category) => (
                <option key={category._id} value={category.name}>{category.name}</option>
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
            <label className="label">Purchase Cost (INR)</label>
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
          {customFieldDefinitions.length > 0 && (
            <div className="col-span-2 rounded-xl border border-line bg-panel-soft p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Additional {form.category} details</h2>
                  <p className="mt-0.5 text-xs text-muted">Category-specific information configured for this institution.</p>
                </div>
                {customFieldsLoading && <span className="text-xs text-muted">Refreshing…</span>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {customFieldDefinitions.map((field) => (
                  <div key={field._id} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="label" htmlFor={`custom-${field.key}`}>{field.label}{field.required ? ' *' : ''}</label>
                    {field.type === 'textarea' ? (
                      <textarea id={`custom-${field.key}`} className="input" rows={3} required={field.required} maxLength={2000} value={customFieldValues[field.key] ?? ''} onChange={(event) => setCustomFieldValues((current) => ({ ...current, [field.key]: event.target.value }))} />
                    ) : field.type === 'select' ? (
                      <select id={`custom-${field.key}`} className="input" required={field.required} value={customFieldValues[field.key] ?? ''} onChange={(event) => setCustomFieldValues((current) => ({ ...current, [field.key]: event.target.value }))}>
                        <option value="">Select an option</option>
                        {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <label className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm text-ink">
                        <input id={`custom-${field.key}`} type="checkbox" required={field.required} checked={Boolean(customFieldValues[field.key])} onChange={(event) => setCustomFieldValues((current) => ({ ...current, [field.key]: event.target.checked }))} />
                        {field.label}
                      </label>
                    ) : (
                      <input id={`custom-${field.key}`} className="input" type={field.type} required={field.required} maxLength={field.type === 'text' ? 200 : undefined} value={customFieldValues[field.key] ?? ''} onChange={(event) => setCustomFieldValues((current) => ({ ...current, [field.key]: event.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={saving || categoriesLoading || customFieldsLoading || customFieldsError || !form.category || (!isEdit && user?.role === 'superadmin' && (institutionsLoading || !institutionId))}>
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
