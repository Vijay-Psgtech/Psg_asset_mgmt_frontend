import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import client from '../api/client.js';
import ProfileAvatar from '../components/ProfileAvatar.jsx';

function splitName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() || '', lastName: parts.join(' ') };
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const name = splitName(user?.name);
  const [form, setForm] = useState({ firstName: name.firstName, lastName: name.lastName, email: user?.email || '', currentPassword: '', newPassword: '' });
  const [extras, setExtras] = useState({ location: user?.location || '', phone: user?.phone || '', website: user?.website || '' });
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [darkMode, setDarkMode] = useState(() => user?.preferences?.theme === 'midnight' || localStorage.getItem('assetrak_theme') === 'midnight');
  const [soundEffects, setSoundEffects] = useState(() => user?.preferences?.soundEffects ?? true);
  const [confetti, setConfetti] = useState(() => user?.preferences?.confetti ?? true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const nextName = splitName(user?.name);
    setForm((current) => ({ ...current, firstName: nextName.firstName, lastName: nextName.lastName, email: user?.email || '' }));
    setExtras({ location: user?.location || '', phone: user?.phone || '', website: user?.website || '' });
    setAvatar(user?.avatar || '');
    setDarkMode(user?.preferences?.theme === 'midnight');
    setSoundEffects(user?.preferences?.soundEffects ?? true);
    setConfetti(user?.preferences?.confetti ?? true);
  }, [user?.name, user?.email, user?.location, user?.phone, user?.website, user?.avatar, user?.preferences?.theme, user?.preferences?.soundEffects, user?.preferences?.confetti]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const updateExtra = (key, value) => setExtras((previous) => ({ ...previous, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setMessage(''); setError('');
    try {
      const { data } = await client.patch('/auth/me', {
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        location: extras.location,
        phone: extras.phone,
        website: extras.website,
        avatar,
        preferences: { theme: darkMode ? 'midnight' : 'royal', soundEffects, confetti },
      });
      updateUser(data.user);
      setMessage('Your profile has been updated.');
      setForm((previous) => ({ ...previous, currentPassword: '', newPassword: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile.');
    }
  };

  const chooseAvatar = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      setAvatar(value);
    };
    reader.readAsDataURL(file);
  };

  const setTheme = (value) => {
    setDarkMode(value);
    localStorage.setItem('assetrak_theme', value ? 'midnight' : 'royal');
    document.documentElement.dataset.theme = value ? 'midnight' : 'royal';
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Profile settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your account details and workspace preferences.</p>
      </div>
      <form onSubmit={save} className="space-y-6">
        <section className="card overflow-hidden">
          <h2 className="border-l-4 border-accent bg-[#f3f4f6] px-5 py-3 text-base font-semibold text-ink">Your Details</h2>
          <div className="grid gap-x-8 gap-y-5 p-5 sm:p-7 lg:grid-cols-[1fr_220px]">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="label">First Name<input className="input mt-2" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required /></label>
              <label className="label">Last Name<input className="input mt-2" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></label>
              <label className="label sm:col-span-2">Email<input type="email" className="input mt-2" value={form.email} onChange={(e) => update('email', e.target.value)} required /></label>
              <label className="label">Location<input className="input mt-2" placeholder="Select a location" value={extras.location || ''} onChange={(e) => updateExtra('location', e.target.value)} /></label>
              <label className="label">Phone<input className="input mt-2" placeholder="+1 555 000 0000" value={extras.phone || ''} onChange={(e) => updateExtra('phone', e.target.value)} /></label>
              <label className="label sm:col-span-2">Website<input type="url" className="input mt-2" placeholder="https://example.com" value={extras.website || ''} onChange={(e) => updateExtra('website', e.target.value)} /></label>
            </div>
            <div className="flex flex-col items-center gap-3 border-t border-line pt-5 sm:border-t-0 sm:pt-0">
              <div className="rounded-2xl border border-line bg-[#f8fafc] p-2 shadow-sm">
                <ProfileAvatar user={{ ...user, avatar }} size="lg" />
              </div>
              <label className="btn-outline cursor-pointer text-xs">Select file<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={chooseAvatar} /></label>
              <p className="text-center text-[11px] leading-4 text-muted">JPG, PNG, GIF or WebP. Stored locally in this browser.</p>
            </div>
            <div className="border-t border-line pt-5 sm:col-span-2">
              <h3 className="font-semibold text-ink">Change Password</h3>
              <p className="mt-1 text-xs text-muted">Leave both fields blank to keep your current password.</p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="label">Current Password<input type="password" className="input mt-2" value={form.currentPassword} onChange={(e) => update('currentPassword', e.target.value)} /></label>
                <label className="label">New Password<input type="password" className="input mt-2" value={form.newPassword} onChange={(e) => update('newPassword', e.target.value)} /></label>
              </div>
            </div>
          </div>
        </section>
        <section className="card overflow-hidden">
          <h2 className="border-l-4 border-accent bg-[#f3f4f6] px-5 py-3 text-base font-semibold text-ink">Display Preferences</h2>
          <div className="space-y-5 p-5 sm:p-7">
            <Preference label="Language" description="Language selection is managed by the current portal configuration."><span className="preference-note">English</span></Preference>
            <Preference label="Header Nav Link Color" description="Header colors follow the active portal theme."><span className="color-swatch bg-[#2563eb]" /></Preference>
            <Preference label="Link Color for Light Mode" description="Used for links when the light workspace theme is active."><span className="color-swatch bg-[#2563eb]" /></Preference>
            <Preference label="Link Color for Dark Mode" description="Used for links when the midnight workspace theme is active."><span className="color-swatch bg-[#60a5fa]" /></Preference>
            <Preference label="Light/Dark Mode" description="Choose the visual mode used by the workspace."><button type="button" onClick={() => setTheme(!darkMode)} className="btn-primary text-xs">{darkMode ? 'Use Light Mode' : 'Use Dark Mode'}</button></Preference>
            <Preference label="Sound Effects" description="Enable interface sound effects when supported."><input type="checkbox" checked={soundEffects} onChange={(e) => setSoundEffects(e.target.checked)} /></Preference>
            <Preference label="Confetti Effects" description="Enable celebratory effects for supported actions."><input type="checkbox" checked={confetti} onChange={(e) => setConfetti(e.target.checked)} /></Preference>
          </div>
        </section>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {(message || error) && <span className={error ? 'text-sm text-red-500' : 'text-sm text-emerald-600'}>{error || message}</span>}
          <button type="submit" className="btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  );
}

function Preference({ label, description, children }) {
  return <div className="grid gap-2 border-b border-line pb-5 last:border-0 last:pb-0 sm:grid-cols-[190px_1fr] sm:gap-5"><div className="text-sm font-semibold text-ink sm:text-right">{label}</div><div>{children}<p className="mt-2 text-xs leading-5 text-muted">{description}</p></div></div>;
}
