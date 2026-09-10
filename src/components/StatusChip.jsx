const STATUS_STYLES = {
  available: 'text-mint border-mint/40 bg-mint/10',
  assigned: 'text-accent2 border-accent2/40 bg-accent2/10',
  in_maintenance: 'text-accent border-accent/40 bg-accent/10',
  retired: 'text-muted border-line bg-panel2',
  lost: 'text-red-400 border-red-400/40 bg-red-400/10',
  active: 'text-mint border-mint/40 bg-mint/10',
  returned: 'text-muted border-line bg-panel2',
  scheduled: 'text-accent2 border-accent2/40 bg-accent2/10',
  in_progress: 'text-accent border-accent/40 bg-accent/10',
  completed: 'text-mint border-mint/40 bg-mint/10',
  cancelled: 'text-muted border-line bg-panel2',
};

export default function StatusChip({ status }) {
  const style = STATUS_STYLES[status] || 'text-muted border-line bg-panel2';
  return <span className={`status-chip ${style}`}>{String(status).replace(/_/g, ' ')}</span>;
}
