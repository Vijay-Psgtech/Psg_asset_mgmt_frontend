import { useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import { ErrorBanner } from '../components/Common.jsx';

const CATEGORIES = ['Laptop', 'Desktop', 'Monitor', 'Phone', 'Tablet', 'Server', 'Networking', 'Peripheral', 'Software License', 'Other'];
const FIELD_TYPES = [
  ['text', 'Short text'],
  ['textarea', 'Long text'],
  ['number', 'Number'],
  ['date', 'Date'],
  ['checkbox', 'Checkbox'],
  ['select', 'Dropdown'],
];
const emptyField = { label: '', key: '', type: 'text', optionsText: '', categories: [], required: false };
const toKey = (label) => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[^a-z]+/, '');

export default function CustomFields() {
  const [fields, setFields] = useState([]);
  const [form, setForm] = useState(emptyField);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/custom-fields')
      .then(({ data }) => {
        if (active) setFields(data.fields || []);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load custom fields.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const groupedFields = useMemo(() => CATEGORIES.map((category) => ({
    category,
    fields: fields.filter((field) => field.categories.includes(category)),
  })).filter((group) => group.fields.length), [fields]);

  const resetForm = () => {
    setForm(emptyField);
    setEditingId('');
  };

  const startEdit = (field) => {
    setEditingId(field._id);
    setForm({
      label: field.label,
      key: field.key,
      type: field.type,
      optionsText: (field.options || []).join('\n'),
      categories: field.categories,
      required: field.required,
    });
    setError('');
    setSuccess('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    const payload = {
      label: form.label.trim(),
      key: form.key.trim(),
      type: form.type,
      options: form.type === 'select' ? form.optionsText.split('\n').map((option) => option.trim()).filter(Boolean) : [],
      categories: form.categories,
      required: form.required,
    };
    try {
      if (editingId) {
        await api.put(`/custom-fields/${editingId}`, payload);
        setSuccess('Custom field updated.');
      } else {
        await api.post('/custom-fields', payload);
        setSuccess('Custom field created.');
      }
      resetForm();
      const { data } = await api.get('/custom-fields');
      setFields(data.fields || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save custom field.');
    } finally {
      setSaving(false);
    }
  };

  const removeField = async (field) => {
    if (!window.confirm(`Delete "${field.label}"? Existing asset values will remain on those assets.`)) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/custom-fields/${field._id}`);
      setFields((current) => current.filter((item) => item._id !== field._id));
      if (editingId === field._id) resetForm();
      setSuccess('Custom field deleted. Existing asset values were preserved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete custom field.');
    }
  };

  const toggleCategory = (category) => setForm((current) => ({
    ...current,
    categories: current.categories.includes(category)
      ? current.categories.filter((item) => item !== category)
      : [...current.categories, category],
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-accent">Asset configuration</div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Custom fields</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Create shared, category-specific fields that are available across institutions whenever assets are added or updated.</p>
        </div>
        <div className="rounded-xl border border-line bg-panel px-4 py-3 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted">Configured fields</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{fields.length}</div>
        </div>
      </header>

      <ErrorBanner message={error} />
      {success && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Fields by asset category</h2>
              <p className="text-xs text-muted">Fields appear on the asset form only for their selected categories.</p>
            </div>
          </div>
          {loading ? (
            <div className="card p-8 text-center text-sm text-muted">Loading custom fields…</div>
          ) : !groupedFields.length ? (
            <div className="card p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-xl text-accent">＋</div>
              <h3 className="mt-3 font-semibold text-ink">No custom fields yet</h3>
              <p className="mt-1 text-sm text-muted">Create your first field to capture category-specific asset information.</p>
            </div>
          ) : groupedFields.map((group) => (
            <section key={group.category} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <h3 className="font-semibold text-ink">{group.category}</h3>
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">{group.fields.length} {group.fields.length === 1 ? 'field' : 'fields'}</span>
              </div>
              <div className="divide-y divide-line">
                {group.fields.map((field) => (
                  <div key={`${group.category}-${field._id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="font-medium text-ink">{field.label}{field.required && <span className="ml-1 text-red-600">*</span>}</div>
                      <div className="mt-0.5 text-xs text-muted"><code>{field.key}</code> · {FIELD_TYPES.find(([type]) => type === field.type)?.[1]}{field.type === 'select' ? ` · ${(field.options || []).join(', ')}` : ''}</div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => startEdit(field)}>Edit</button>
                      <button type="button" className="btn-ghost px-3 py-1.5 text-xs text-red-700 hover:text-red-800" onClick={() => removeField(field)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </section>

        <form onSubmit={submit} className="card space-y-4 p-5 lg:sticky lg:top-5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-accent">{editingId ? 'Update configuration' : 'New configuration'}</div>
            <h2 className="mt-1 text-lg font-semibold text-ink">{editingId ? 'Edit custom field' : 'Add a custom field'}</h2>
          </div>
          <div>
            <label className="label" htmlFor="custom-field-label">Field label *</label>
            <input id="custom-field-label" className="input" required maxLength={80} value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value, ...(!editingId ? { key: toKey(event.target.value) } : {}) }))} placeholder="e.g. Processor generation" />
          </div>
          <div>
            <label className="label" htmlFor="custom-field-key">Field key *</label>
            <input id="custom-field-key" className="input font-mono" required pattern="[a-z][a-z0-9_]*" maxLength={80} value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))} placeholder="processor_generation" />
            <p className="mt-1 text-xs text-muted">Stable identifier used to save this value to assets.</p>
          </div>
          <div>
            <label className="label" htmlFor="custom-field-type">Field type *</label>
            <select id="custom-field-type" className="input" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
              {FIELD_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {form.type === 'select' && (
            <div>
              <label className="label" htmlFor="custom-field-options">Dropdown options *</label>
              <textarea id="custom-field-options" className="input" rows={4} required value={form.optionsText} onChange={(event) => setForm((current) => ({ ...current, optionsText: event.target.value }))} placeholder={'One option per line\nExample: 8 GB\n16 GB'} />
            </div>
          )}
          <fieldset>
            <legend className="label">Show for categories *</legend>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((category) => (
                <label key={category} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink">
                  <input type="checkbox" checked={form.categories.includes(category)} onChange={() => toggleCategory(category)} />
                  {category}
                </label>
              ))}
            </div>
            {!form.categories.length && <span className="mt-1 block text-xs text-red-700">Choose at least one category.</span>}
          </fieldset>
          <label className="flex items-start gap-2 rounded-lg bg-panel-soft p-3 text-sm text-ink">
            <input type="checkbox" checked={form.required} onChange={(event) => setForm((current) => ({ ...current, required: event.target.checked }))} />
            <span><span className="block font-medium">Required field</span><span className="text-xs text-muted">Users must provide a value when creating or editing matching assets.</span></span>
          </label>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1" disabled={saving || !form.categories.length}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create field'}</button>
            {editingId && <button type="button" className="btn-outline" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
