import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';

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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState([]);

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
      setSelected([]);
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

  const visibleUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));

  const handleToggleAll = (checked) => {
    if (checked) setSelected(visibleUsers.map((user) => user.id || user._id));
    else setSelected([]);
  };

  const toggleSelected = (userId) => {
    setSelected((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

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
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded border border-slate-300 bg-[#ecf5fb] text-lg text-slate-700">⌕</button>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded border border-slate-300 bg-[#ecf5fb] text-lg text-slate-700">✎</button>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded border border-slate-300 bg-[#ecf5fb] text-lg text-slate-700">＋</button>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded border border-slate-300 bg-[#ecf5fb] text-lg text-slate-700">🗑</button>
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
                <th className="border-b border-t border-slate-300 px-3 py-3">
                  <input type="checkbox" className="h-4 w-4" checked={visibleUsers.length > 0 && selected.length === visibleUsers.length} onChange={(e) => handleToggleAll(e.target.checked)} />
                </th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Username</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Name</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Title</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Email</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Department</th>
                <th className="border-b border-t border-slate-300 px-3 py-3">Location</th>
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
                  return (
                    <tr key={userId} className="border-b border-slate-200 bg-white hover:bg-slate-50">
                      <td className="border-b border-slate-200 px-3 py-3 align-middle">
                        <input type="checkbox" className="h-4 w-4" checked={selected.includes(userId)} onChange={() => toggleSelected(userId)} />
                      </td>
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
                      <td className="border-b border-slate-200 px-3 py-3 align-middle">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getRolePill(user.role)}`}>{roleText}</span>
                      </td>
                      <td className="border-b border-slate-200 px-3 py-3 align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => handleStatusToggle(user)} className={`flex h-8 w-8 items-center justify-center rounded text-sm ${user.active ? 'bg-[#3e95d1] text-white' : 'bg-[#e7a86d] text-white'}`} title={user.active ? 'Disable login' : 'Enable login'}>{user.active ? '✓' : '⏳'}</button>
                          <button type="button" onClick={() => handleDelete(user)} className="flex h-8 w-8 items-center justify-center rounded bg-[#e76a6a] text-sm text-white" title="Delete user">✕</button>
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
    </div>
  );
}
