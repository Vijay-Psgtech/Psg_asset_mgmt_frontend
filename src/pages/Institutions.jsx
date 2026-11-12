import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import { EmptyState, ErrorBanner, Spinner } from '../components/Common.jsx';

const STATUS_OPTIONS = ['all', 'active', 'inactive', 'archived'];

export default function Institutions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [form, setForm] = useState({ name: '', code: '', status: 'active' });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/institutions', {
        params: { search: search || undefined, status: status !== 'all' ? status : undefined },
      });
      setItems(Array.isArray(data.institutions) ? data.institutions : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load institutions.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const resetForm = () => {
    setForm({ name: '', code: '', status: 'active' });
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        status: form.status,
      };

      if (editingId) {
        await api.patch(`/institutions/${editingId}`, payload);
      } else {
        await api.post('/institutions', payload);
      }

      resetForm();
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save institution.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (institution) => {
    setForm({
      name: institution.name || '',
      code: institution.code || '',
      status: institution.status || 'active',
    });
    setEditingId(institution.id || institution._id);
  };

  const tableColumns = useMemo(() => ['Institution', 'Code', 'Status', 'Contact', 'Actions'], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="dashboard-eyebrow">Settings / Institutions</div>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Institutions</h1>
          <p className="mt-1 text-sm text-muted">Manage tenant modules and institution-specific access.</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="label text-xs">
            Search
            <input
              className="input mt-2"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search institution..."
            />
          </label>
          <label className="label text-xs">
            Status
            <select className="input mt-2" value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option === 'all' ? 'All statuses' : option}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" onClick={() => resetForm()} className="btn-outline text-xs w-full">Clear form</button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card grid gap-4 p-5 sm:grid-cols-4">
        <label className="label sm:col-span-2">
          Institution name
          <input className="input mt-2" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        </label>
        <label className="label">
          Code
          <input className="input mt-2 uppercase" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required />
        </label>
        <label className="label">
          Status
          <select className="input mt-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <div className="flex justify-end gap-2 sm:col-span-4">
          <button type="button" className="btn-outline text-xs" onClick={resetForm}>Cancel</button>
          <button type="submit" className="btn-primary text-xs" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update institution' : 'Add institution'}</button>
        </div>
      </form>

      <section className="dashboard-panel overflow-hidden">
        <ErrorBanner message={error} />
        {loading ? (
          <Spinner label="LOADING INSTITUTIONS" />
        ) : !items.length ? (
          <EmptyState title="No institutions found" subtitle="Create a tenant to start assigning modules and user access." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[760px] text-left">
              <thead>
                <tr>
                  {tableColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((institution) => (
                  <tr key={institution.id || institution._id}>
                    <td className="font-semibold text-ink">{institution.name}</td>
                    <td>{institution.code}</td>
                    <td>
                      <span className={`badge ${institution.status === 'active' ? 'badge-success' : institution.status === 'inactive' ? 'badge-warning' : 'badge-muted'}`}>
                        {institution.status}
                      </span>
                    </td>
                    <td>{institution.contactEmail || institution.contactPhone || '—'}</td>
                    <td>
                      <button type="button" onClick={() => startEdit(institution)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
