const STYLES = {
  Open: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  Scheduled: 'border-sky-500/40 text-sky-400 bg-sky-500/10',
  'In Progress': 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  Overdue: 'border-red-500/40 text-red-400 bg-red-500/10',
  Completed: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  Cancelled: 'border-white/20 text-muted bg-white/5',
};

export default function MaintenanceStatusBadge({ status }) {
  const style = STYLES[status] || 'border-white/20 text-muted bg-white/5';
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest stencil ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}