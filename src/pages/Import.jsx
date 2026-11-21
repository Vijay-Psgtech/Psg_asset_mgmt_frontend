import { useState } from 'react';
import api from '../api/client.js';
import { ErrorBanner } from '../components/Common.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const IMPORT_OPTIONS = {
  assets: {
    label: 'Assets',
    required: ['name', 'category'],
    fields: [
      'assetTag', 'name', 'category', 'brand', 'model', 'serialNumber', 'status',
      'purchaseDate', 'purchaseCost', 'vendor', 'warrantyExpiry', 'location', 'notes',
    ],
    note: 'Asset categories: Laptop, Desktop, Monitor, Phone, Tablet, Server, Networking, Peripheral, Software License, Other. Status defaults to available. Leave assetTag blank to generate one automatically.',
  },
  accessories: {
    label: 'Accessories',
    required: ['name'],
    fields: [
      'name', 'category', 'manufacturer', 'modelNumber', 'totalQty', 'minQty',
      'purchaseDate', 'cost', 'notes',
    ],
    note: 'totalQty and minQty default to 0 when blank.',
  },
  consumables: {
    label: 'Consumables',
    required: ['name'],
    fields: [
      'name', 'category', 'manufacturer', 'modelNumber', 'totalQty', 'minQty',
      'purchaseDate', 'cost', 'notes',
    ],
    note: 'totalQty and minQty default to 0 when blank.',
  },
  licenses: {
    label: 'Licenses',
    required: ['name', 'seats'],
    fields: [
      'name', 'licenseKey', 'vendor', 'category', 'seats', 'purchaseDate',
      'expirationDate', 'cost', 'notes',
    ],
    note: 'seats must be a positive number.',
  },
};

export default function Import() {
  const { user, institutions } = useAuth();
  const [type, setType] = useState('assets');
  const [file, setFile] = useState(null);
  const [institutionId, setInstitutionId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedType = IMPORT_OPTIONS[type];

  const downloadTemplate = () => {
    const content = `${selectedType.fields.join(',')}\r\n`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-import-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importRecords = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (user?.role === 'superadmin') formData.append('institutionId', institutionId);
      const { data } = await api.post(`/import/${type}`, formData);
      const singular = { assets: 'asset', accessories: 'accessory', consumables: 'consumable', licenses: 'license' }[type];
      setMessage(`${data.imported} ${singular}${data.imported === 1 ? '' : 's'} imported successfully.`);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setError('Your session has expired. Sign in again, then retry the import.');
      else if (status === 403) setError(err.response?.data?.message || 'Your account is not permitted to import records.');
      else {
        const requestId = err.response?.headers?.['x-request-id'];
        const message = err.response?.data?.message || 'Could not import the CSV file.';
        setError(`${message}${requestId ? ` Reference: ${requestId}` : ''}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="dashboard-eyebrow">Data / import</div>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Import inventory</h1>
        <p className="mt-1 text-sm text-muted">Import up to 500 records from a CSV file (maximum 2 MB).</p>
      </div>

      <form onSubmit={importRecords} className="card space-y-5 p-5 sm:p-7">
        <label className="label">
          Inventory type
          <select
            className="input mt-2"
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setFile(null);
              setMessage('');
              setError('');
            }}
          >
            {Object.entries(IMPORT_OPTIONS).map(([value, option]) => (
              <option key={value} value={value}>{option.label}</option>
            ))}
          </select>
        </label>

        {user?.role === 'superadmin' && (
          <label className="label">
            Institution
            <select
              className="input mt-2"
              value={institutionId}
              onChange={(event) => setInstitutionId(event.target.value)}
              required
              disabled={!institutions.length}
            >
              <option value="">Select an institution</option>
              {institutions.map((institution) => (
                <option key={institution.id || institution._id} value={institution.id || institution._id}>
                  {institution.name}{institution.code ? ` (${institution.code})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="label" htmlFor="csv-file">CSV file</label>
            <button type="button" className="btn-outline text-xs" onClick={downloadTemplate}>
              Download {selectedType.label.toLowerCase()} template
            </button>
          </div>
          <input
            key={type}
            id="csv-file"
            className="input"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setMessage('');
              setError('');
            }}
          />
          {file && <p className="text-xs text-muted">Selected: {file.name}</p>}
        </div>

        <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-medium text-ink">CSV columns</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Required: {selectedType.required.map((field) => <code key={field} className="mx-1">{field}</code>)}
            <br />
            Optional: {selectedType.fields.filter((field) => !selectedType.required.includes(field)).join(', ')}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">{selectedType.note} Dates may use YYYY-MM-DD or DD-MM-YYYY. Blank optional cells are ignored; unknown or duplicate headers are rejected.</p>
        </div>

        <ErrorBanner message={error} />
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        <div className="flex justify-end">
          <button
            className="btn-primary text-xs"
            disabled={loading || !file || (user?.role === 'superadmin' && !institutionId)}
          >
            {loading ? 'Importing...' : `Import ${selectedType.label.toLowerCase()}`}
          </button>
        </div>
      </form>
    </div>
  );
}
