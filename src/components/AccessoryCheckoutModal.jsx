import { useState } from 'react';
import api from '../api/client.js';

export default function AccessoryCheckoutModal({ accessory, onClose, onChanged }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const active = accessory.checkouts?.filter((c) => !c.checkinDate) || [];
  const returned = accessory.checkouts?.filter((c) => c.checkinDate) || [];
  const available = accessory.qtyAvailable ?? accessory.totalQty - active.reduce((s, c) => s + c.quantity, 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!name) {
      setError('Enter a name to check this out to.');
      return;
    }
    setError('');
    setLoading(true);
    try {       
      await api.post(`/accessories/${accessory._id}/checkout`, {
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
      setError(err?.response?.data?.message || 'Could not check out item.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (checkoutId) => {
    setLoading(true);
    try {
      await api.patch(`/accessories/${accessory._id}/checkouts/${checkoutId}/checkin`);
      onChanged();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not check in item.');
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
              {accessory.name} — Checkouts
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-muted">{available} available of {accessory.totalQty}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white text-xs uppercase tracking-widest">
            Close
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
          <div className="mb-4 divide-y divide-white/5 border border-white/10">
            {active.length === 0 && returned.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted">Nothing checked out yet.</p>
            ) : (
              <>
                {active.map((c) => (
                  <div key={c._id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <div className="text-white">
                        {c.assignedTo?.name} <span className="text-muted">× {c.quantity}</span>
                      </div>
                      <div className="text-xs text-muted">{c.assignedTo?.department || c.assignedTo?.email || '—'}</div>
                    </div>
                    <button
                      disabled={loading}
                      onClick={() => handleCheckin(c._id)}
                      className="border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-50"
                    >
                      Check In
                    </button>
                  </div>
                ))}
                {returned.map((c) => (
                  <div key={c._id} className="flex items-center justify-between px-3 py-2 text-sm opacity-50">
                    <div>
                      <div className="text-white">
                        {c.assignedTo?.name} <span className="text-muted">× {c.quantity}</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-muted">Returned</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {available > 0 ? (
            <form onSubmit={handleCheckout} className="space-y-3 border-t border-white/10 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted stencil">Check out</p>
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
                  max={available}
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
                  {loading ? 'Checking out…' : 'Check Out'}
                </button>
              </div>
            </form>
          ) : (
            <p className="border-t border-white/10 pt-4 text-xs text-muted">
              None available right now. Check something back in or restock this item.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}