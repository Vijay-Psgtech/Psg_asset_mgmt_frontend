export function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="mb-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`stencil text-3xl font-bold ${accent ? 'text-[#0f6cbd]' : 'text-slate-900'}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
      <div className="absolute right-0 top-0 h-16 w-16 border-b border-l border-slate-200 opacity-60" />
    </div>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="card p-12 text-center">
      <div className="stencil mb-1 text-lg text-slate-500">{title}</div>
      {subtitle && <div className="mb-4 text-sm text-slate-500">{subtitle}</div>}
      {action}
    </div>
  );
}

export function Spinner({ label = 'LOADING' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-xs font-mono uppercase tracking-[0.18em] text-slate-500">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#0f6cbd]" />
      {label}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
