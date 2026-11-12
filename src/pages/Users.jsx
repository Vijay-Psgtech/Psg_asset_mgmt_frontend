import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const filterOptions = [
  { value: 'all', label: 'List All' },
  { value: 'superadmin', label: 'Superusers' },
  { value: 'admin', label: 'Admin Users' },
  { value: 'asset_user', label: 'Asset Users' },
  { value: 'deleted', label: 'Deleted Users' },
  { value: 'active', label: 'Login Enabled' },
  { value: 'inactive', label: 'Login Disabled' },
];

function getRoleLabel(role) {
  if (role === 'superadmin') return 'Superadmin';
  if (role === 'admin') return 'Admin';
  return 'Asset User';
}

function getRolePill(role) {
  if (role === 'superadmin') return 'bg-violet-100 text-violet-700';
  if (role === 'admin') return 'bg-sky-100 text-sky-700';
  return 'bg-emerald-100 text-emerald-700';
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [institutionsLoading, setInstitutionsLoading] = useState(currentUser?.role === 'superadmin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [assigningUser, setAssigningUser] = useState(null);
  const [assignmentInstitutionId, setAssignmentInstitutionId] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'asset_user',
    institutionId: '',
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (filter !== 'all') {
        if (filter === 'deleted') params.deleted = true;
        else if (filter === 'active') params.active = true;
        else if (filter === 'inactive') params.active = false;
        else params.role = filter;
      }
      const { data } = await api.get('/users', { params });
      setUsers(Array.isArray(data.users) ? data.users : []);
      setPage(1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load users.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (currentUser?.role !== 'superadmin') return;
    let active = true;
    setInstitutionsLoading(true);
    api.get('/institutions')
      .then(({ data }) => {
        if (active) {
          const activeInstitutions = (Array.isArray(data.institutions) ? data.institutions : [])
            .filter((institution) => institution.status === 'active');
          setInstitutions(activeInstitutions);
          const currentInstitutionId = currentUser.institution?.id || currentUser.institution?._id || '';
          setCreateForm((form) => ({
            ...form,
            institutionId: form.institutionId
              || (activeInstitutions.some((institution) => (institution.id || institution._id) === currentInstitutionId)
                ? currentInstitutionId
                : ''),
          }));
        }
      })
      .catch((err) => {
        if (active) setError(err?.response?.data?.message || 'Could not load institutions.');
      })
      .finally(() => {
        if (active) setInstitutionsLoading(false);
      });
    return () => { active = false; };
  }, [currentUser?.institution?._id, currentUser?.institution?.id, currentUser?.role]);

  const visibleUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));

  const handleStatusToggle = async (user) => {
    try {
      await api.patch(`/users/${user.id || user._id}`, { active: !user.active });
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update user status.');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    try {
      await api.delete(`/users/${user.id || user._id}`);
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not delete user.');
    }
  };

  const openCreateForm = () => {
    setCreateError('');
    const currentInstitutionId = currentUser?.institution?.id || currentUser?.institution?._id || '';
    const selectedInstitutionId = institutions.some(
      (institution) => (institution.id || institution._id) === currentInstitutionId
    ) ? currentInstitutionId : '';
    setCreateForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'asset_user',
      institutionId: selectedInstitutionId,
    });
    setCreateOpen(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreateError('');
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('The passwords do not match.');
      return;
    }
    if (currentUser?.role === 'superadmin' && !createForm.institutionId) {
      setCreateError('Select an institution for this account.');
      return;
    }

    setCreating(true);
    try {
      await api.post('/users', {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: currentUser?.role === 'superadmin' ? createForm.role : 'asset_user',
        ...(currentUser?.role === 'superadmin' ? { institutionId: createForm.institutionId } : {}),
      });
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', confirmPassword: '', role: 'asset_user', institutionId: '' });
      await loadUsers();
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Could not create user.');
    } finally {
      setCreating(false);
    }
  };

  const openInstitutionAssignment = (targetUser) => {
    setAssignmentError('');
    setAssignmentInstitutionId(targetUser.institution?.id || targetUser.institution?._id || '');
    setAssigningUser(targetUser);
  };

  const handleInstitutionAssignment = async (event) => {
    event.preventDefault();
    if (!assignmentInstitutionId) {
      setAssignmentError('Select an institution for this account.');
      return;
    }

    setAssignmentError('');
    setAssigning(true);
    try {
      await api.patch(`/users/${assigningUser.id || assigningUser._id}`, {
        institutionId: assignmentInstitutionId,
      });
      setAssigningUser(null);
      await loadUsers();
    } catch (err) {
      setAssignmentError(err?.response?.data?.message || 'Could not assign institution.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eff3f7] px-2 py-3 text-slate-700 lg:px-4">
      <div className="mx-auto max-w-[1500px] rounded-md border border-slate-200 bg-[#f4f6f8] shadow-sm">
        <div className="px-5 pt-5">
          <h1 className="text-[40px] font-light tracking-tight text-slate-700">Users</h1>
        </div>

        <div className="px-5 pb-3 pt-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-11 min-w-[220px] rounded border border-slate-300 bg-white px-3 text-sm text-slate-600 shadow-sm outline-none"
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadUsers()}
                className="h-11 rounded bg-[#3e95d1] px-5 text-sm font-medium text-white shadow-sm hover:bg-[#3388c0]"
              >
                Go
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="h-11 w-full rounded border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-700 outline-none lg:w-72"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">×</button>
                )}
              </div>
              <button type="button" onClick={openCreateForm} disabled={currentUser?.role === 'superadmin' && institutionsLoading} className="flex h-11 w-11 items-center justify-center rounded border border-slate-300 bg-[#ecf5fb] text-lg text-slate-700 disabled:cursor-wait disabled:opacity-50" title="Create user" aria-label="Create user">＋</button>
            </div>
          </div>
        </div>

        {error && <div className="mx-5 mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="px-5 pb-4">
          <div className="flex flex-col gap-3 border-t border-slate-300 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-500">
              Showing {users.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, users.length)} of {users.length} rows
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-9 rounded border border-slate-300 bg-white px-3 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
              <button type="button" className="h-9 rounded bg-[#3e95d1] px-3 text-white">{page}</button>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-9 rounded border border-slate-300 bg-white px-3 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              <span className="ml-2 text-slate-500">{page} of {totalPages}</span>
              <label className="ml-3 flex items-center gap-2 text-slate-500">
                <span>rows per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-9 rounded border border-slate-300 bg-white px-2"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-[#dfe3e7] text-left text-sm font-semibold text-slate-700">
                <th className="border-b border-t border-slate-300 px-3 py-3">Username</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Name</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Title</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Email</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Department</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Location</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Institution</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Role</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-3 py-10 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-3 py-10 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                visibleUsers.map((user) => {
                  const userId = user.id || user._id;
                  const username = user.email?.split('@')[0] || '—';
                  const department = user.department || '—';
                  const location = user.location || '—';
                  const roleText = getRoleLabel(user.role);
                  const canManageAccount = currentUser?.role === 'superadmin'
                    || (currentUser?.role === 'admin' && user.role === 'asset_user');
                  return (
                    <tr key={userId} className="border-b border-slate-200 bg-white hover:bg-slate-50">
                      <td className="border-b border-slate-200 px-3 py-3 align-middle text-slate-700">{username}</td>
                      <td className="border-b border-slate-200 px-3 py-3 align-middle text-slate-700">{user.name || '—'}</td>
                      <td className="border-b border-slate-200 px-3 py-3 align-middle text-slate-700">{user.title || '—'}</td>
                      <td className="border-b border-slate-200 px-3 py-3 align-middle text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-slate-200 text-[10px] text-slate-600">✉</span>
                          <span>{user.email || '—'}</span>
                        </div>
                      </td>
                      <td className="border-b border-slate-200 px-3 py-3 align-middle text-slate-700">{department}</td>
                      <td className="border-b border-slate-200 px-3 py-3 align-middle text-slate-700">{location}</td>
                      <td className="border-b border-slate-200 px-3 py-3 align-middle text-slate-700">{user.institution?.name || user.institution?.code || '—'}</td>
                      <td className="border-b border-slate-200 px-3 py-3 align-middle">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getRolePill(user.role)}`}>{roleText}</span>
                      </td>
                      <td className="border-b border-slate-200 px-3 py-3 align-middle">
                        <div className="flex items-center justify-end gap-2">
                          {canManageAccount ? (
                            <>
                              {currentUser?.role === 'superadmin' && (
                                <button
                                  type="button"
                                  onClick={() => openInstitutionAssignment(user)}
                                  className="flex h-8 items-center justify-center rounded border border-slate-300 bg-white px-2 text-xs text-slate-700"
                                  title="Assign institution"
                                >
                                  Assign
                                </button>
                              )}
                              <button type="button" onClick={() => handleStatusToggle(user)} className={`flex h-8 w-8 items-center justify-center rounded text-sm ${user.active ? 'bg-[#3e95d1] text-white' : 'bg-[#e7a86d] text-white'}`} title={user.active ? 'Disable login' : 'Enable login'}>{user.active ? '✓' : '⏳'}</button>
                              <button type="button" onClick={() => handleDelete(user)} className="flex h-8 w-8 items-center justify-center rounded bg-[#e76a6a] text-sm text-white" title="Delete user">✕</button>
                            </>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
          <form onSubmit={handleCreate} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
            <div>
              <h2 id="create-user-title" className="text-xl font-semibold text-slate-900">Create user</h2>
              <p className="mt-1 text-sm text-slate-500">The username is the email address. Set an initial password for this account.</p>
            </div>
            {createError && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{createError}</div>}
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Full name
              <input className="input" value={createForm.name} onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))} required minLength={2} maxLength={80} autoComplete="name" />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Email / username
              <input className="input" type="email" value={createForm.email} onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))} required maxLength={254} autoComplete="email" />
            </label>
            {currentUser?.role === 'superadmin' && (
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Role
                <select className="input" value={createForm.role} onChange={(event) => setCreateForm((form) => ({ ...form, role: event.target.value }))}>
                  <option value="asset_user">Asset User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </label>
            )}
            {currentUser?.role === 'superadmin' && (
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Institution
                <select
                  className="input"
                  value={createForm.institutionId}
                  onChange={(event) => setCreateForm((form) => ({ ...form, institutionId: event.target.value }))}
                  required
                  disabled={institutionsLoading || !institutions.length}
                >
                  <option value="">{institutionsLoading ? 'Loading institutions…' : 'Select an institution'}</option>
                  {institutions.map((institution) => (
                    <option key={institution.id || institution._id} value={institution.id || institution._id}>
                      {institution.name} {institution.code ? `(${institution.code})` : ''}
                    </option>
                  ))}
                </select>
                {!institutionsLoading && !institutions.length && <span className="block text-xs text-red-600">No active institutions available. Add or activate an institution first.</span>}
              </label>
            )}
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Initial password
              <input className="input" type="password" value={createForm.password} onChange={(event) => setCreateForm((form) => ({ ...form, password: event.target.value }))} required minLength={8} maxLength={128} autoComplete="new-password" />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Confirm password
              <input className="input" type="password" value={createForm.confirmPassword} onChange={(event) => setCreateForm((form) => ({ ...form, confirmPassword: event.target.value }))} required minLength={8} maxLength={128} autoComplete="new-password" />
            </label>
            <p className="text-xs text-slate-500">Passwords are stored securely and cannot be viewed later. Users can reset them from the login page.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreateOpen(false)} disabled={creating} className="btn-outline">Cancel</button>
              <button type="submit" disabled={creating || (currentUser?.role === 'superadmin' && (institutionsLoading || !institutions.length))} className="btn-primary">{creating ? 'Creating…' : 'Create user'}</button>
            </div>
          </form>
        </div>
      )}
      {assigningUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={handleInstitutionAssignment} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="assign-institution-title">
            <div>
              <h2 id="assign-institution-title" className="text-xl font-semibold text-slate-900">Assign institution</h2>
              <p className="mt-1 text-sm text-slate-500">{assigningUser.name} · {assigningUser.email}</p>
            </div>
            {assignmentError && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{assignmentError}</div>}
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Institution
              <select className="input" value={assignmentInstitutionId} onChange={(event) => setAssignmentInstitutionId(event.target.value)} required>
                <option value="">Select an institution</option>
                {institutions.map((institution) => (
                  <option key={institution.id || institution._id} value={institution.id || institution._id}>
                    {institution.name} {institution.code ? `(${institution.code})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-slate-500">The user should sign out and back in after assignment. This does not reveal or change their password.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setAssigningUser(null)} disabled={assigning} className="btn-outline">Cancel</button>
              <button type="submit" disabled={assigning || !institutions.length} className="btn-primary">{assigning ? 'Assigning…' : 'Assign institution'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
