export default function ProfileAvatar({ user, size = 'md', className = '' }) {
  const initials = (user?.name || 'A')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'A';

  const sizeClasses = {
    xs: 'h-8 w-8 text-xs',
    sm: 'h-9 w-9 text-sm',
    md: 'h-14 w-14 text-xl',
    lg: 'h-40 w-40 text-5xl',
  };    

  const baseClasses = [
    'grid place-items-center overflow-hidden rounded-full border border-white/60 bg-gradient-to-br from-[#dfe9ff] via-[#edf4ff] to-[#ceddfd] font-semibold text-[#0f1f35] shadow-sm ring-1 ring-[#dbeafe]',
    sizeClasses[size] || sizeClasses.md,
    className,
  ].join(' ');

  if (!user?.avatar) {
    return <div className={baseClasses} aria-label={`${user?.name || 'Profile'} initials`}>{initials}</div>;
  }

  return <img src={user.avatar} alt={user?.name || 'Profile'} className={`${baseClasses} object-cover`} />;
}
