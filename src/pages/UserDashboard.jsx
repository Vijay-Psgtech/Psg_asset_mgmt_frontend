import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import ProfileAvatar from '../components/ProfileAvatar.jsx';

const TABS = [['info', 'Info'], ['assets', 'Assets'], ['licenses', 'Licenses'], ['accessories', 'Accessories'], ['consumables', 'Consumables'], ['eulas', 'EULAs']];
const EXTRA_TABS = ['requestable', 'requested'];

function formatDate(value) { return value ? new Date(value).toLocaleDateString() : 'Not set'; }
function EmptyState({ label, detail }) { return <div className="px-5 py-12 text-center"><div className="text-sm font-medium text-ink">No {label.toLowerCase()} found</div><p className="mt-1 text-xs text-muted">{detail}</p></div>; }

function AssetTable({ items, requestable = false, onRequest }) {
  if (!items.length) return <EmptyState label={requestable ? 'requestable assets' : 'assigned assets'} detail={requestable ? 'There are no available assets to request right now.' : 'Items assigned to you will appear here.'} />;
  return <div className="overflow-x-auto"><table className="user-table w-full min-w-[680px] text-left"><thead><tr><th>Asset</th><th>Model</th><th>Location</th><th>Status</th><th className="text-right">Action</th></tr></thead><tbody>{items.map((item) => { const asset = item.asset || item; return <tr key={item._id}><td><div className="font-medium text-ink">{asset.name || 'Unnamed asset'}</div><div className="mt-1 text-xs text-muted">{asset.assetTag || 'No tag'} {asset.serialNumber ? ` / ${asset.serialNumber}` : ''}</div></td><td className="text-muted">{asset.model || asset.brand || '—'}</td><td className="text-muted">{asset.location || '—'}</td><td><span className={`user-status ${item.status === 'overdue' ? 'user-status-danger' : 'user-status-ready'}`}>{item.status || 'available'}</span></td><td className="text-right">{requestable ? <button type="button" onClick={() => onRequest(asset._id)} className="user-action">Request</button> : <Link to={`/assets/${asset._id}`} className="user-action">View</Link>}</td></tr>; })}</tbody></table></div>;
}

function InventoryTable({ items, type }) {
  if (!items.length) return <EmptyState label={type} detail={`Assigned ${type.toLowerCase()} will appear here.`} />;
  return <div className="overflow-x-auto"><table className="user-table w-full min-w-[600px] text-left"><thead><tr><th>Name</th><th>Category / vendor</th><th>Assigned</th><th>Status</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item._id}-${index}`}><td className="font-medium text-ink">{item.name}</td><td className="text-muted">{item.category || item.vendor || '—'}</td><td className="text-muted">{item.quantity ? `${item.quantity} item${item.quantity === 1 ? '' : 's'}` : formatDate(item.assignedDate || item.checkoutDate || item.issuedDate)}</td><td><span className="user-status user-status-ready">Assigned</span></td></tr>)}</tbody></table></div>;
}

function EulaTable({ items }) {
  if (!items.length) return <EmptyState label="EULAs" detail="EULA records linked to your assigned software will appear here." />;
  return <div className="overflow-x-auto"><table className="user-table w-full min-w-[680px] text-left"><thead><tr><th>Agreement</th><th>Vendor / License</th><th>Asset</th><th>Status</th><th>Expires</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td className="font-medium text-ink">{item.title}</td><td className="text-muted">{item.vendor || item.license?.name || '—'}</td><td className="text-muted">{item.asset?.assetTag || item.asset?.name || '—'}</td><td><span className="user-status user-status-ready">{item.status || 'pending'}</span></td><td className="text-muted">{formatDate(item.expiresAt)}</td></tr>)}</tbody></table></div>;
}

export default function UserDashboard() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('info');
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (TABS.some(([key]) => key === requestedTab) || EXTRA_TABS.includes(requestedTab)) setTab(requestedTab);
  }, [searchParams]);

  const load = async () => {
    try {
      const [{ data: response }, { data: eulaResponse }] = await Promise.all([api.get('/assignments/my-dashboard'), api.get('/eulas')]);
      response.eulas = eulaResponse.data || [];
      setData(response); setError('');
    } catch (err) { setError(err.response?.data?.message || 'Could not load your asset portal.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const user = data?.user;
  const setView = (nextTab) => { setTab(nextTab); setSearchParams(nextTab === 'info' ? {} : { tab: nextTab }); };
  const currentTitle = useMemo(() => TABS.find(([key]) => key === tab)?.[1] || (tab === 'requestable' ? 'Requestable' : tab === 'requested' ? 'Requested' : 'Info'), [tab]);
  const summary = data?.summary || {};
  const requestAsset = async (assetId) => {
    try { await api.post('/asset-requests', { assetId }); await load(); setView('requested'); }
    catch (err) { setError(err.response?.data?.message || 'Could not submit the asset request.'); }
  };

  return <div className="user-portal space-y-5">
    <div className="user-breadcrumb"><Link to="/my-assets">Home</Link><span>›</span><span>View profile</span><span>›</span><strong>{currentTitle}</strong></div>
    <div className="user-notice">Asset user portal <span>Use the tabs below to view your assigned equipment, software, and requestable inventory.</span></div>
    <section className="user-profile-card"><div className="user-profile-top"><ProfileAvatar user={user} size="md" /> <div><h1>{user?.name || 'Asset user'}</h1><p>{user?.email || 'No email'} <span>•</span> {user?.role || 'Asset user'}</p><small>Member since {formatDate(user?.createdAt)}</small></div><Link to="/profile" className="user-edit-profile">Edit profile</Link></div><nav className="user-tabs">{[...TABS, ['requestable', 'Requestable'], ['requested', 'Requested']].map(([key, label]) => <button type="button" key={key} onClick={() => setView(key)} className={tab === key ? 'active' : ''}>{label}{key === 'assets' && <b>{summary.assets || 0}</b>}{key === 'licenses' && <b>{summary.licenses || 0}</b>}{key === 'requested' && data?.requested?.length > 0 && <b>{data.requested.length}</b>}</button>)}</nav></section>
    <section className="user-content-card">{loading ? <div className="p-12 text-center text-sm text-muted">Loading your asset portal...</div> : error ? <div className="p-10 text-center text-sm text-red-700">{error}</div> : tab === 'info' ? <div className="user-info-grid"><div><label>Name</label><strong>{user?.name || '—'}</strong></div><div><label>Email</label><strong>{user?.email || '—'}</strong></div><div><label>Account type</label><strong>{user?.role || 'Asset user'}</strong></div><div><label>Assigned assets</label><strong>{summary.assets || 0}</strong></div><div><label>Assigned licenses</label><strong>{summary.licenses || 0}</strong></div><div><label>Available to request</label><strong>{data?.requestable?.length || 0}</strong></div></div> : tab === 'assets' ? <AssetTable items={data.assets || []} /> : tab === 'requestable' ? <AssetTable items={data.requestable || []} requestable onRequest={requestAsset} /> : tab === 'requested' ? (data.requested?.length ? <AssetTable items={data.requested} /> : <EmptyState label="requested items" detail="Your submitted asset requests will appear here." />) : tab === 'eulas' ? <EulaTable items={data.eulas || []} /> : <InventoryTable items={data[tab] || []} type={currentTitle} />}</section>
    <section className="user-shortcuts"><Link to="/requestable-items"><span>＋</span><strong>Request an asset</strong><small>Browse available equipment</small></Link><Link to="/maintenance"><span>⚒</span><strong>Report an issue</strong><small>Get help with assigned equipment</small></Link><Link to="/documents"><span>▤</span><strong>View documents</strong><small>Manuals and certificates</small></Link></section>
  </div>;
}
