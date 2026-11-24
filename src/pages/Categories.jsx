import { useCallback, useEffect, useState } from 'react';
import api from '../api/client.js';
import { EmptyState, ErrorBanner, Spinner } from '../components/Common.jsx';

const emptyForm = { name: '', code: '', description: '', active: true, sortOrder: 0 };

export default function Categories() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/categories', { params: { includeInactive: 'true' } });
      setItems(data.categories || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
  };

  const startEdit = (category) => {
    setEditingId(category._id);
    setForm({
      name: category.name || '',
      code: category.code || '',
      description: category.description || '',
      active: category.active !== false,
      sortOrder: category.sortOrder || 0,
    });
    setError('');
    setSuccess('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim(),
      active: form.active,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
        setSuccess('Category updated.');
      } else {
        await api.post('/categories', payload);
        setSuccess('Category created.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save category.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category) => {
    if (!window.confirm(`Delete "${category.name}"? This only succeeds if it is unused.`)) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/categories/${category._id}`);
      setItems((current) => current.filter((item) => item._id !== category._id));
      if (editingId === category._id) resetForm();
      setSuccess('Category deleted.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not delete category.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-accent">Asset configuration</div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Categories</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Create and manage the categories used by asset records and custom fields.</p>
        </div>
        <div className="rounded-xl border border-line bg-panel px-4 py-3 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted">Active categories</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{items.filter((item) => item.active).length}</div>
        </div>
      </header>

      <ErrorBanner message={error} />
      {success && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <section className="dashboard-panel overflow-hidden">
          {loading ? (
            <Spinner label="LOADING CATEGORIES" />
          ) : !items.length ? (
            <EmptyState title="No categories found" subtitle="Add the first asset category." />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full min-w-[620px] text-left">
                <thead><tr><th>Category</th><th>Code</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {items.map((category) => (
                    <tr key={category._id}>
                      <td>
                        <div className="font-semibold text-ink">{category.name}</div>
                        {category.description && <div className="mt-0.5 max-w-md truncate text-xs text-muted">{category.description}</div>}
                      </td>
                      <td><code className="text-xs">{category.code}</code></td>
                      <td><span className={`badge ${category.active ? 'badge-success' : 'badge-muted'}`}>{category.active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div className="flex gap-3">
                          <button type="button" className="text-xs font-medium text-blue-600 hover:underline" onClick={() => startEdit(category)}>Edit</button>
                          <button type="button" className="text-xs font-medium text-red-700 hover:underline" onClick={() => remove(category)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <form onSubmit={submit} className="card space-y-4 p-5 lg:sticky lg:top-5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-accent">{editingId ? 'Update category' : 'New category'}</div>
            <h2 className="mt-1 text-lg font-semibold text-ink">{editingId ? 'Edit category' : 'Add a category'}</h2>
          </div>
          <label className="label">Name *
            <input className="input mt-2" required maxLength={80} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, ...(!editingId ? { code: event.target.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') } : {}) }))} placeholder="e.g. Laboratory Equipment" />
          </label>
          <label className="label">Code *
            <input className="input mt-2 font-mono" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={80} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '') }))} />
          </label>
          <label className="label">Description
            <textarea className="input mt-2" rows={3} maxLength={500} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="label">Sort order
            <input className="input mt-2" type="number" min="0" max="999" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} />
          </label>
          <label className="flex items-center gap-2 rounded-lg bg-panel-soft p-3 text-sm text-ink">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
            Active
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create category'}</button>
            {editingId && <button type="button" className="btn-outline" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>
    </div>
  );
}