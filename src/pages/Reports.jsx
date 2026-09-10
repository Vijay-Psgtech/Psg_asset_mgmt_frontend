import { useEffect, useState } from 'react';
import client from '../api/client.js';

const TYPES = ['assets', 'assignments', 'maintenance', 'logs'];
export default function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { client.get('/reports/overview').then(({ data: result }) => setData(result)).catch((err) => setError(err.response?.data?.message || 'Admin access required.')); }, []);
  const download = async (type) => {
    const response = await client.get('/reports/download', { params: { type }, responseType: 'blob' });
    const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `assetrak-${type}-report.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold text-[#172033]">Reports center</h1><p className="mt-1 text-sm text-muted">Export operational data and review system-wide statistics.</p></div>
    {error && <div className="card p-4 text-sm text-red-500">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{TYPES.map((type) => <div className="card p-5" key={type}><div className="text-xs font-semibold uppercase tracking-wider text-muted">{type}</div><div className="mt-3 text-3xl font-bold text-[#172033]">{data?.totals?.[type] ?? '—'}</div><button onClick={() => download(type)} className="btn-outline mt-4 w-full text-xs">Download CSV</button></div>)}</div>
    <div className="card p-6"><h2 className="font-semibold text-[#172033]">Report coverage</h2><div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2"><div>✓ Asset inventory and status</div><div>✓ Assignment and return history</div><div>✓ Maintenance workload and costs</div><div>✓ Full audit activity trail</div></div></div>
  </div>;
}
