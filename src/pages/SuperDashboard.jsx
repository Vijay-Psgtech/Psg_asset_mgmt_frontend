import { useCallback, useEffect, useState } from 'react';
import api from '../api/client.js';
import { DEFAULT_ROLE_ACCESS, MENU_ACCESS_OPTIONS } from '../layouts/AppLayout.jsx';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'asset_user',
  menuAccess: DEFAULT_ROLE_ACCESS.asset_user,
};

export default function SuperDashboard() {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);  
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userResponse, summaryResponse] = await Promise.all([
        api.get('/users', { params: { search: search || undefined } }),
        api.get('/dashboard/summary'),
      ]);
      setUsers(userResponse.data.users || []);
      setSummary(summaryResponse.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load superadmin controls.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, menuAccess: DEFAULT_ROLE_ACCESS.asset_user }); setShowForm(true); setMessage(''); };
  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      menuAccess: Array.isArray(user.menuAccess) && user.menuAccess.length ? [...user.menuAccess] : [...(DEFAULT_ROLE_ACCESS[user.role] || [])],
    });
    setShowForm(true);
    setMessage('');
  };

  const toggleMenuAccess = (key) => {
    setForm((current) => {
      const hasKey = current.menuAccess.includes(key);
      const next = hasKey ? current.menuAccess.filter((item) => item !== key) : [...current.menuAccess, key];
      return { ...current, menuAccess: next };
    });
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        menuAccess: form.role === 'superadmin' ? [...DEFAULT_ROLE_ACCESS.superadmin] : form.menuAccess,
      };
      if (!payload.password) delete payload.password;
      if (editing) await api.patch(`/users/${editing.id}`, payload);
      else await api.post('/users', payload);
      setShowForm(false);
      setMessage(editing ? 'User updated.' : 'User created.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save user.');
    }
  };
  const toggleActive = async (user) => {
    try { await api.patch(`/users/${user.id}`, { active: !user.active }); await load(); } catch (err) { setError(err.response?.data?.message || 'Could not update account status.'); }
  };
  const remove = async (user) => {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    try { await api.delete(`/users/${user.id}`); await load(); } catch (err) { setError(err.response?.data?.message || 'Could not delete user.'); }
  };

  const counts = users.reduce((result, user) => { result[user.role] = (result[user.role] || 0) + 1; return result; }, {});
  return <div className="space-y-6">
    <section className="dashboard-intro"><div><div className="dashboard-eyebrow">Superadmin / command center</div><h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">System control center</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Manage identities, access boundaries, and the health of every operational module from one place.</p></div><button type="button" onClick={openCreate} className="btn-primary text-xs">＋ Create user</button></section>
    {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
    {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><div className="dashboard-card"><div className="text-sm text-muted">Total users</div><div className="mt-2 text-3xl font-semibold text-ink">{users.length}</div></div><div className="dashboard-card"><div className="text-sm text-muted">Superadmins</div><div className="mt-2 text-3xl font-semibold text-ink">{counts.superadmin || 0}</div></div><div className="dashboard-card"><div className="text-sm text-muted">Administrators</div><div className="mt-2 text-3xl font-semibold text-ink">{counts.admin || 0}</div></div><div className="dashboard-card"><div className="text-sm text-muted">Asset users</div><div className="mt-2 text-3xl font-semibold text-ink">{counts.asset_user || 0}</div></div><div className="dashboard-card"><div className="text-sm text-muted">Managed assets</div><div className="mt-2 text-3xl font-semibold text-ink">{summary?.totalAssets || 0}</div></div></section>
    <section className="dashboard-panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4"><div><h2 className="text-base font-semibold text-ink">Identity directory</h2><p className="mt-1 text-xs text-muted">Create admins, asset users, and additional superadmins.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} className="input max-w-xs" placeholder="Search name or email..." /></div><div className="overflow-x-auto"><table className="data-table w-full min-w-[720px] text-left"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th><th className="text-right">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="5" className="px-5 py-12 text-center text-sm text-muted">Loading users...</td></tr> : users.map((user) => <tr key={user.id}><td><div className="font-medium text-ink">{user.name}</div><div className="text-xs text-muted">{user.email}</div></td><td><span className="user-status user-status-ready">{user.role.replace('_', ' ')}</span></td><td><button type="button" onClick={() => toggleActive(user)} className={`user-status ${user.active ? 'user-status-ready' : 'user-status-danger'}`}>{user.active ? 'Active' : 'Disabled'}</button></td><td className="text-muted">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td><td className="space-x-2 text-right"><button type="button" onClick={() => openEdit(user)} className="user-action">Edit</button><button type="button" onClick={() => remove(user)} className="user-action user-action-danger">Delete</button></td></tr>)}</tbody></table></div></section>
    {showForm && <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f1f35]/55 p-4"><form onSubmit={save} className="card w-full max-w-2xl p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="dashboard-eyebrow">Access management</div><h2 className="mt-1 text-xl font-semibold text-ink">{editing ? 'Edit user' : 'Create user'}</h2></div><button type="button" onClick={() => setShowForm(false)} className="text-xl text-muted">×</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="label">Name<input className="input mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label className="label">Email<input className="input mt-2" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label className="label">{editing ? 'New password' : 'Password'}<input className="input mt-2" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!editing} minLength="8" /></label><label className="label">Role<select className="input mt-2" value={form.role} onChange={(event) => {
          const nextRole = event.target.value;
          setForm({ ...form, role: nextRole, menuAccess: nextRole === 'superadmin' ? [...DEFAULT_ROLE_ACCESS.superadmin] : nextRole === 'admin' ? [...DEFAULT_ROLE_ACCESS.admin] : [...DEFAULT_ROLE_ACCESS.asset_user] });
        }}><option value="asset_user">Asset user</option><option value="admin">Admin</option><option value="superadmin">Superadmin</option></select></label></div>
        <div className="mt-6">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Menu access</div>
          <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded border border-line bg-[#f6f8fb] p-3 sm:grid-cols-2">
            {MENU_ACCESS_OPTIONS.map((option) => (
              <label key={option.key} className="flex items-center gap-2 rounded border border-transparent bg-white px-2 py-2 text-xs text-ink shadow-sm">
                <input type="checkbox" checked={form.role === 'superadmin' || form.menuAccess.includes(option.key)} onChange={() => form.role === 'superadmin' ? null : toggleMenuAccess(option.key)} disabled={form.role === 'superadmin'} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="btn-outline text-xs">Cancel</button><button className="btn-primary text-xs">{editing ? 'Save changes' : 'Create user'}</button></div></form></div>}
  </div>;
}
