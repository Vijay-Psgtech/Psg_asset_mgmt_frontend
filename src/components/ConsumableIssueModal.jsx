import { useState } from 'react';
import api from '../api/client.js';

export default function ConsumableIssueModal({ consumable, onClose, onChanged }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const issues = consumable.issues || [];
  const remaining = consumable.qtyRemaining ?? consumable.totalQty - issues.reduce((s, i) => s + i.quantity, 0);

  const handleIssue = async (e) => {
    e.preventDefault();   
    if (!name) {
      setError('Enter who this is being issued to.');
      return;  
    }
    setError('');
    setLoading(true);
    try {
      await api.post(`/consumables/${consumable._id}/issue`, {
        name,
        email,
        department,
        quantity: Number(quantity) || 1,
      });
      setName('');
      setEmail('');
      setDepartment('');
      setQuantity(1);
      onChanged();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not issue item.');
    } finally {
      setLoading(false);
    }
  };     

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto border border-white/10 bg-ink shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="stencil text-sm font-semibold uppercase tracking-widest text-white">
              {consumable.name} — Issue Log 
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-muted">
              {remaining} remaining of {consumable.totalQty}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white text-xs uppercase tracking-widest">
            Close
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
          <div className="mb-4 divide-y divide-white/5 border border-white/10">
            {issues.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted">Nothing issued yet.</p>
            ) : (
              [...issues].reverse().map((i) => (
                <div key={i._id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <div className="text-white">
                      {i.assignedTo?.name} <span className="text-muted">× {i.quantity}</span>
                    </div>
                    <div className="text-xs text-muted">{i.assignedTo?.department || i.assignedTo?.email || '—'}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted">
                    {i.issuedDate ? new Date(i.issuedDate).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>

          {remaining > 0 ? (
            <form onSubmit={handleIssue} className="space-y-3 border-t border-white/10 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted stencil">Issue stock</p>
              <p className="text-xs text-muted">
                Consumables are not returned — this permanently reduces remaining stock.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="input" />
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Department"
                  className="input"    
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="input" />
                <input
                  type="number"
                  min="1"
                  max={remaining}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input"
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {loading ? 'Issuing…' : 'Issue'}
                </button>
              </div>
            </form>
          ) : (
            <p className="border-t border-white/10 pt-4 text-xs text-muted">
              Out of stock. Edit this item to restock before issuing more.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}