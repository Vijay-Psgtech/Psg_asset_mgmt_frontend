import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import client from '../api/client.js';
import { ErrorBanner } from '../components/Common.jsx';

const SCANNER_ID = 'qr-scanner-region';
const RECENT_SCAN_KEY = 'asset-scan-history';

export default function Scan() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [manualTag, setManualTag] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [asset, setAsset] = useState(null);
  const [recentScans, setRecentScans] = useState(() => {
    try {
      const saved = window.localStorage.getItem(RECENT_SCAN_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENT_SCAN_KEY, JSON.stringify(recentScans));
    } catch {
      // ignore local storage write issues
    }
  }, [recentScans]);

  const lookupTag = async (rawValue) => {
    setLookingUp(true);
    setError('');
    try {
      let tag = String(rawValue || '').trim();
      try {
        const parsed = JSON.parse(rawValue);
        if (parsed.assetTag) tag = parsed.assetTag;
      } catch {
        // not JSON, treat as a plain tag string
      }

      if (!tag) {
        setError('Enter a valid asset tag or scan code first.');
        return;
      }

      const { data } = await client.get(`/assets/tag/${encodeURIComponent(tag)}`);
      const foundAsset = data.asset;
      setAsset(foundAsset);
      setManualTag('');
      setRecentScans((current) => {
        const next = [
          {
            _id: foundAsset._id,
            assetTag: foundAsset.assetTag,
            name: foundAsset.name,
            status: foundAsset.status,
            location: foundAsset.location,
          },
          ...current.filter((item) => item.assetTag !== foundAsset.assetTag),
        ].slice(0, 5);
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.message || 'No asset found for that code');
    } finally {
      setLookingUp(false);
    }
  };

  useEffect(() => {
    const instance = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = instance;

    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startScan = async () => {
    setError('');
    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          scannerRef.current.stop().then(() => setScanning(false));
          lookupTag(decodedText);
        },
        () => {} // ignore per-frame scan failures
      );
      setScanning(true);
    } catch {
      setError('Could not access camera. Check browser permissions, or enter the tag manually below.');
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* already stopped */ }
    }
    setScanning(false);
  };

  const detailRows = useMemo(() => {
    if (!asset) return [];
    return [
      ['Asset tag', asset.assetTag],
      ['Status', asset.status || 'unknown'],
      ['Category', asset.category || '—'],
      ['Location', asset.location || '—'],
      ['Assigned to', asset.currentAssignment?.assignedTo?.name || 'Unassigned'],
    ];
  }, [asset]);

  const copyTag = async () => {
    if (!asset?.assetTag) return;
    try {
      await navigator.clipboard.writeText(asset.assetTag);
      setError('Asset tag copied to clipboard.');
    } catch {
      setError('Clipboard access is unavailable in this browser.');
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="stencil text-2xl font-bold text-zinc-50 mb-1">Scan Asset Tag</h1>
        <p className="text-sm text-muted">Point your camera at a QR tag, or type it in manually.</p>
      </div>

      <ErrorBanner message={error} />

      <div className="card p-6">
        <div id={SCANNER_ID} className="w-full aspect-square bg-panel2 rounded-sm overflow-hidden border border-line" />
        <div className="mt-4">
          {!scanning ? (
            <button className="btn-primary w-full" onClick={startScan} disabled={lookingUp}>
              {lookingUp ? 'Looking up…' : 'Start Camera'}
            </button>
          ) : (
            <button className="btn-outline w-full" onClick={stopScan}>Stop Camera</button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <label className="label">Enter Tag Manually</label>
        <div className="flex gap-3">
          <input
            className="input"
            placeholder="AST-000001"
            value={manualTag}
            onChange={(e) => setManualTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && manualTag && lookupTag(manualTag)}
          />
          <button className="btn-outline shrink-0" disabled={!manualTag || lookingUp} onClick={() => lookupTag(manualTag)}>
            Go
          </button>
        </div>
      </div>

      {asset && (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="dashboard-eyebrow">Latest match</p>
              <h2 className="mt-2 text-xl font-semibold text-ink">{asset.name}</h2>
            </div>
            <div className="flex gap-2">
              <button className="btn-outline text-xs" onClick={copyTag}>
                Copy tag
              </button>
              <button className="btn-primary text-xs" onClick={() => navigate(`/assets/${asset._id}`)}>
                Open asset
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {detailRows.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-panel1 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">{label}</p>
                <p className="mt-2 text-sm font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentScans.length > 0 && (
        <div className="card p-6">
          <p className="dashboard-eyebrow">Recent scans</p>
          <div className="mt-4 space-y-2">
            {recentScans.map((item) => (
              <button
                key={`${item.assetTag}-${item._id}`}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-line bg-panel1 px-3 py-2 text-left transition hover:border-brand/50"
                onClick={() => lookupTag(item.assetTag)}
              >
                <div>
                  <p className="text-sm font-medium text-ink">{item.name}</p>
                  <p className="text-xs text-muted">{item.assetTag}</p>
                </div>
                <span className="text-xs text-muted">{item.status}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
