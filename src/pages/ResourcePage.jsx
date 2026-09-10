import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import { EmptyState, ErrorBanner, Spinner } from '../components/Common.jsx';

const COMPONENT_STATUSES = ['all', 'available', 'assigned', 'in_maintenance', 'retired'];
const KIT_ACTIVE_OPTIONS = ['all', 'active', 'inactive'];

const CONFIG = {
  components: {
    title: 'Components',
    endpoint: '/components',
    singular: 'component',
    filters: [{ key: 'status', label: 'Status', options: COMPONENT_STATUSES }, { key: 'category', label: 'Category', options: ['all', 'Laptop', 'Desktop', 'Monitor', 'Phone', 'Tablet', 'Server', 'Networking', 'Peripheral', 'Other'] }],
    fields: [
      ['name', 'Name', 'text'],
      ['category', 'Category', 'text'],
      ['manufacturer', 'Manufacturer', 'text'],
      ['modelNumber', 'Model number', 'text'],
      ['serialNumber', 'Serial number', 'text'],
      ['quantity', 'Quantity', 'number'],
      ['status', 'Status', 'select', ['available', 'assigned', 'in_maintenance', 'retired']],
      ['notes', 'Notes', 'textarea'],
    ],
    defaultForm: () => ({ name: '', category: 'Other', manufacturer: '', modelNumber: '', serialNumber: '', quantity: 1, status: 'available', notes: '' }),
    buildPayload: (form) => ({ ...form, quantity: Number(form.quantity || 0) }),
  },
  kits: {
    title: 'Predefined Kits',
    endpoint: '/kits',
    singular: 'kit',
    filters: [{ key: 'active', label: 'Status', options: KIT_ACTIVE_OPTIONS }, { key: 'category', label: 'Category', options: ['all', 'Office Setup', 'Laptop Kit', 'Desktop Kit', 'Support Kit', 'Other'] }],
    fields: [
      ['name', 'Name', 'text'],
      ['category', 'Category', 'text'],
      ['description', 'Description', 'textarea'],    
      ['active', 'Active', 'select', ['true', 'false']],
    ],
    defaultForm: () => ({ name: '', category: 'Other', description: '', active: 'true' }),
    buildPayload: (form) => ({ ...form, active: form.active === 'true' || form.active === true }),
  },
};

export default function ResourcePage({ kind }) {
  const config = CONFIG[kind];
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(config.defaultForm());
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { search: search || undefined, limit: 100 };
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params[key] = value;
      });
      const { data } = await api.get(config.endpoint, { params });
      setItems(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || `Could not load ${config.title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, config.title, filters, search]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const handleInputChange = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setForm(config.defaultForm());
    setEditingId(null);
    setShowForm(false);
  };    

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = config.buildPayload(form);
      if (editingId) await api.patch(`${config.endpoint}/${editingId}`, payload);
      else await api.post(config.endpoint, payload);
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save record.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (item) => {
    const nextForm = { ...config.defaultForm() };
    Object.entries(item).forEach(([key, value]) => {
      if (key in nextForm) {
        nextForm[key] = value === null || value === undefined ? nextForm[key] : value;
      }
    });
    setForm(nextForm);
    setEditingId(item._id);
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.delete(`${config.endpoint}/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete record.');
    }
  };

  const tableColumns = useMemo(() => {
    if (kind === 'components') return ['Name', 'Category', 'Manufacturer', 'Model', 'Serial', 'Qty', 'Status'];
    return ['Name', 'Category', 'Description', 'Status'];
  }, [kind]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="dashboard-eyebrow">Inventory / {kind}</div>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{config.title}</h1>
          <p className="mt-1 text-sm text-muted">Manage live records with dynamic filters and editable fields.</p>
        </div>
        <button type="button" onClick={() => { setShowForm((value) => !value); if (showForm) resetForm(); else setForm(config.defaultForm()); }} className="btn-primary text-xs">
          {showForm ? 'Close' : `Add ${config.singular}`}
        </button>
      </div>

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          {config.filters.map((filter) => (
            <label key={filter.key} className="label text-xs">
              {filter.label}
              <select
                className="input mt-2"
                value={filters[filter.key] || 'all'}
                onChange={(event) => setFilters((current) => ({ ...current, [filter.key]: event.target.value }))}
              >
                {filter.options.map((option) => (
                  <option key={option} value={option}>{option === 'all' ? `All ${filter.label.toLowerCase()}` : option}</option>
                ))}
              </select>
            </label>
          ))}
          <label className="label text-xs">
            Search
            <input
              className="input mt-2"
              placeholder={`Search ${config.title.toLowerCase()}...`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="card grid gap-4 p-5 sm:grid-cols-2">
          {config.fields.map(([key, label, type, options]) => {
            if (type === 'textarea') {
              return (
                <label key={key} className="label sm:col-span-2">
                  {label}
                  <textarea className="input mt-2 min-h-[90px]" value={form[key] || ''} onChange={(event) => handleInputChange(key, event.target.value)} />
                </label>
              );
            }
            if (type === 'select') {
              return (
                <label key={key} className="label">
                  {label}
                  <select className="input mt-2" value={String(form[key] ?? '')} onChange={(event) => handleInputChange(key, event.target.value)}>
                    {options.map((option) => (
                      <option key={option} value={option}>{option === 'true' ? 'Active' : option === 'false' ? 'Inactive' : option}</option>
                    ))}
                  </select>
                </label>
              );
            }
            return (
              <label key={key} className="label">
                {label}
                <input
                  className="input mt-2"
                  type={type === 'number' ? 'number' : 'text'}
                  min={type === 'number' ? 0 : undefined}
                  value={form[key] ?? ''}
                  onChange={(event) => handleInputChange(key, event.target.value)}
                  required={key === 'name'}
                />
              </label>
            );
          })}
          <div className="flex justify-end sm:col-span-2 gap-2">
            <button type="button" className="btn-outline text-xs" onClick={resetForm}>Cancel</button>
            <button className="btn-primary text-xs" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update record' : 'Save record'}</button>
          </div>
        </form>
      )}

      <section className="dashboard-panel overflow-hidden">
        <ErrorBanner message={error} />
        {loading ? (
          <Spinner label={`LOADING ${kind.toUpperCase()}`} />
        ) : !items.length ? (
          <EmptyState title={`No ${kind} found`} subtitle="Create the first record to begin managing this module." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[760px] text-left">
              <thead>
                <tr>
                  {tableColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td className="font-semibold text-ink">{item.name}</td>
                    {kind === 'components' ? (
                      <>
                        <td>{item.category || '—'}</td>
                        <td>{item.manufacturer || '—'}</td>
                        <td>{item.modelNumber || '—'}</td>
                        <td>{item.serialNumber || '—'}</td>
                        <td>{item.quantity ?? 0}</td>
                        <td>{item.status || 'available'}</td>
                      </>
                    ) : (
                      <>
                        <td>{item.category || '—'}</td>
                        <td>{item.description || '—'}</td>
                        <td>{item.active ? 'Active' : 'Inactive'}</td>
                      </>
                    )}
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => edit(item)} className="text-xs text-blue-600 hover:underline">Edit</button>
                        <button type="button" onClick={() => remove(item._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                      </div>
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
