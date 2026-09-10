import { useState } from 'react';
import api from '../api/client.js';

export default function LicenseSeatsModal({ license, onClose, onChanged }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const seatsUsed = license.seatAssignments?.length || 0;
  const seatsAvailable = license.seats - seatsUsed;

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!name) {
      setError('Enter a name to assign this seat to.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post(`/licenses/${license._id}/checkout`, { name, email, notes });
      setName('');
      setEmail('');
      setNotes('');
      onChanged();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not assign seat.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (seatId) => {
    setLoading(true);
    try {
      await api.delete(`/licenses/${license._id}/seats/${seatId}`);
      onChanged();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not revoke seat.');
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
              {license.name} — Seats
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-muted">
              {seatsUsed} of {license.seats} used · {seatsAvailable} available
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white text-xs uppercase tracking-widest">
            Close
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
          <div className="mb-4 divide-y divide-white/5 border border-white/10">
            {license.seatAssignments?.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted">No seats assigned yet.</p>
            ) : (
              license.seatAssignments?.map((seat) => (
                <div key={seat._id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <div className="text-white">{seat.assignedTo?.name}</div>
                    <div className="text-xs text-muted">
                      {seat.assignedTo?.email || '—'}
                      {seat.asset ? ` · ${seat.asset.assetTag}` : ''}
                    </div>
                  </div>
                  <button
                    disabled={loading}
                    onClick={() => handleRevoke(seat._id)}
                    className="border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>

          {seatsAvailable > 0 ? (
            <form onSubmit={handleAssign} className="space-y-3 border-t border-white/10 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted stencil">
                Assign a new seat
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="input"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="input"
                />
              </div>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="input"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs uppercase tracking-widest text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                >
                  {loading ? 'Assigning…' : 'Assign Seat'}
                </button>
              </div>
            </form>
          ) : (
            <p className="border-t border-white/10 pt-4 text-xs text-muted">
              All seats are in use. Revoke one above to free up a spot.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}