import { useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';

const badgeStyles = {
  core: 'border-[#b8c98a] bg-[#eef3d8] text-[#526126]',
  advanced: 'border-[#e4b4a8] bg-[#fae9e4] text-[#9c3e2d]',
};

export default function Requirements() {
  const [requirements, setRequirements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/requirements');
        setRequirements(data.requirements || []);
        setSummary(data.summary || null);
        setError('');
      } catch (err) {
        setError(err?.response?.data?.message || 'Requirements data could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const categories = useMemo(() => [...new Set(requirements.map((group) => group.category))].sort(), [requirements]);
  const filteredRequirements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return requirements.filter((group) => {
      if (status !== 'all' && group.status !== status) return false;
      if (category !== 'all' && group.category !== category) return false;
      if (!normalizedQuery) return true;
      return [group.code, group.title, group.category, group.description, ...(group.items || [])]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [category, query, requirements, status]);

  const totalVisibleItems = filteredRequirements.reduce((total, group) => total + (group.items?.length || 0), 0);
  const toggleGroup = (code) => setExpanded((current) => ({ ...current, [code]: !current[code] }));
  const expandAll = () => setExpanded(Object.fromEntries(filteredRequirements.map((group) => [group.code, true])));
  const collapseAll = () => setExpanded({});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-accent">Product capability map</div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Requirements matrix</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Every capability is loaded from the canonical project catalog, so this view stays in sync as the platform grows.</p>
        </div>
        {summary && (
          <div className="rounded-lg border border-line bg-panel px-4 py-3 text-right shadow-sm">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Core coverage</div>
            <div className="text-2xl font-semibold text-ink">{summary.coveragePct}%</div>
          </div>
        )}
      </div>

      {summary && <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Capability groups', summary.totalGroups, 'all'],
          ['Checklist items', summary.totalChecklistItems, 'all'],
          ['Advanced groups', summary.advancedCount, 'advanced'],
        ].map(([label, value, filter]) => <button type="button" key={label} onClick={() => filter === 'all' ? setStatus('all') : setStatus(filter)} className="card p-4 text-left transition hover:-translate-y-0.5 hover:border-accent">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
        </button>)}
      </div>}

      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search requirements</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="input pl-9" placeholder="Search capabilities, categories, or checklist items..." />
            <span className="absolute left-3 top-2.5 text-muted">⌕</span>
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input lg:w-40">
            <option value="all">All levels</option>
            <option value="core">Core only</option>
            <option value="advanced">Advanced only</option>
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="input lg:w-52">
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <div className="flex gap-2">
            <button type="button" onClick={expandAll} className="btn-outline whitespace-nowrap text-xs">Expand all</button>
            <button type="button" onClick={collapseAll} className="btn-ghost whitespace-nowrap text-xs">Collapse</button>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
          <span>Showing {filteredRequirements.length} groups and {totalVisibleItems} checklist items</span>
          {(query || status !== 'all' || category !== 'all') && <button type="button" onClick={() => { setQuery(''); setStatus('all'); setCategory('all'); }} className="font-semibold text-accent">Clear filters</button>}
        </div>
      </div>

      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {loading ? (
        <div className="card p-8 text-center text-xs text-muted stencil">LOADING REQUIREMENTS...</div>
      ) : !filteredRequirements.length ? (
        <div className="card p-12 text-center"><div className="text-3xl text-muted">⌕</div><p className="mt-2 text-sm font-semibold text-ink">No capabilities match those filters.</p><button type="button" onClick={() => { setQuery(''); setStatus('all'); setCategory('all'); }} className="btn-primary mt-4 text-xs">Reset view</button></div>
      ) : (
        <div className="grid gap-4">
          {filteredRequirements.map((group) => {
            const isExpanded = expanded[group.code];
            return <section key={group.code || group.title} className="card overflow-hidden">
              <button type="button" onClick={() => toggleGroup(group.code)} className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left hover:bg-[#faf8f2]">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.26em] text-muted">{group.code} / {group.category}</div>
                  <h2 className="mt-1 text-xl font-semibold text-ink">{group.title}</h2>
                  <p className="mt-1 text-sm text-muted">{group.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${badgeStyles[group.status] || badgeStyles.core}`}>
                    {group.status}
                  </span>
                  <span className="ml-2 text-muted">{isExpanded ? '−' : '+'}</span>
                </div>
              </button>

              {isExpanded && <ul className="grid gap-2 border-t border-line bg-[#faf8f2] p-5 md:grid-cols-2">
                {group.items?.map((item) => (
                  <li key={`${group.code}-${item}`} className="flex items-start gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm text-zinc-700">
                    <span className="mt-0.5 text-accent">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>}
            </section>;
          })}
        </div>
      )}
    </div>
  );
}
