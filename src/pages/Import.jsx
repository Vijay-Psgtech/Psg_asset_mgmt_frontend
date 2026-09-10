import { useState } from 'react';
import api from '../api/client.js';
import { ErrorBanner } from '../components/Common.jsx';

const example = JSON.stringify([{ name: 'ThinkPad X1 Carbon', category: 'Laptop', brand: 'Lenovo', model: 'X1 Carbon', status: 'available', serialNumber: 'SERIAL-001' }], null, 2);

export default function Import() {
  const [value, setValue] = useState(example);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const importAssets = async (event) => {
    event.preventDefault(); setLoading(true); setMessage(''); setError('');
    try { const records = JSON.parse(value); const { data } = await api.post('/import/assets', { assets: records }); setMessage(`${data.imported} asset${data.imported === 1 ? '' : 's'} imported successfully.`); }
    catch (err) { setError(err.response?.data?.message || (err instanceof SyntaxError ? 'Enter valid JSON.' : 'Could not import assets.')); }
    finally { setLoading(false); }
  };
  return <div className="max-w-3xl space-y-6"><div><div className="dashboard-eyebrow">Data / import</div><h1 className="mt-2 text-3xl font-semibold text-ink">Import Assets</h1><p className="mt-1 text-sm text-muted">Import up to 500 assets into MongoDB using a JSON array.</p></div><form onSubmit={importAssets} className="card space-y-4 p-5 sm:p-7"><label className="label">Asset JSON<textarea className="input mt-2 min-h-72 font-mono text-xs" value={value} onChange={(event) => setValue(event.target.value)} required /></label><p className="text-xs text-muted">Required fields: name and category. Valid categories and statuses follow the asset data model.</p><ErrorBanner message={error} />{message && <p className="text-sm text-emerald-700">{message}</p>}<div className="flex justify-end"><button className="btn-primary text-xs" disabled={loading}>{loading ? 'Importing...' : 'Import to database'}</button></div></form></div>;
}
