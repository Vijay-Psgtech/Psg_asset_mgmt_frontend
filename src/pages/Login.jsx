import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner } from '../components/Common.jsx';
import BrandMark from '../components/BrandMark.jsx';
import client from '../api/client.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = new URLSearchParams(location.search).get('resetToken') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMode(resetToken ? 'reset' : 'login');
    setError('');
  }, [resetToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (mode === 'reset' && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'forgot') {
        const { data } = await client.post('/auth/forgot-password', { email: email.trim() });
        setMessage(data.message);
      } else if (mode === 'reset') {
        const { data } = await client.post('/auth/reset-password', { token: resetToken, password });
        setPassword('');
        setConfirmPassword('');
        navigate('/login', { replace: true });
        setMode('login');
        setMessage(data.message);
      } else {
        const user = await login(email, password);
        navigate(location.state?.from || (user.role === 'asset_user' ? '/my-assets' : '/'), { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || (
        mode === 'login' ? 'Login failed. Check your credentials.' : 'Unable to complete your request. Please try again.'
      ));
    } finally {
      setSubmitting(false);
    }
  };

  const changeMode = (nextMode) => {
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
    if (resetToken) navigate('/login', { replace: true });
    setMode(nextMode);
  };

  const heading = mode === 'forgot' ? 'Forgot your password?' : mode === 'reset' ? 'Choose a new password' : 'Sign in to Asset Manager';
  const subtitle = mode === 'forgot'
    ? 'Enter your work email and we’ll send you a secure reset link.'
    : mode === 'reset'
      ? 'Your new password must be at least 8 characters.'
      : 'Use your organization credentials to continue.';

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-hero">
          <div className="brand-banner">
            <div className="brand-banner-inner">
              <BrandMark />
              <span className="brand-banner-tag">Corporate asset operations</span>
            </div>
          </div>

          <div className="login-hero-content">
            <div className="login-status">
              <span className="status-dot" />
              Secure access
            </div>
            <p className="login-eyebrow">Enterprise platform</p>
            <h1 className="login-title">Command your asset portfolio from a premium operations hub.</h1>
            <p className="login-copy">
              Centralize inventory, maintenance, compliance, and lifecycle intelligence through a secure enterprise SaaS workspace.
            </p>
          </div>

          <div className="login-metrics">
            <div>
              <strong>4.2K</strong>
              <span>Assets tracked</span>
            </div>
            <div>
              <strong>99.9%</strong>
              <span>Operational uptime</span>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-header">
            <p className="login-kicker">{mode === 'login' ? 'Welcome back' : 'Account recovery'}</p>
            <h2>{heading}</h2>
            <p className="login-form-subtitle">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <ErrorBanner message={error} />
            {message && <div className="login-success" role="status">{message}</div>}

            {mode !== 'reset' && (
              <div className="field-group">
                <label className="label" htmlFor="login-email">Work email</label>
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            )}

            {mode !== 'forgot' && <div className="field-group">
              <label className="label" htmlFor="login-password">{mode === 'reset' ? 'New password' : 'Password'}</label>
              <div className="password-wrap">
                <input
                  id="login-password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'}
                  required
                  minLength={mode === 'reset' ? 8 : undefined}
                  maxLength={128}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>}

            {mode === 'reset' && (
              <div className="field-group">
                <label className="label" htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="login-meta">
                <label className="remember-me">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                <button type="button" className="login-link" onClick={() => changeMode('forgot')}>Forgot password?</button>
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting
                ? (mode === 'login' ? 'Signing In…' : mode === 'forgot' ? 'Sending…' : 'Updating…')
                : (mode === 'login' ? 'Sign In' : mode === 'forgot' ? 'Send Reset Link' : 'Reset Password')}
            </button>
          </form>

          {mode !== 'login' ? (
            <div className="login-footer">
              <button type="button" className="login-link" onClick={() => changeMode('login')}>Back to sign in</button>
            </div>
          ) : (
            <div className="login-footer">
              <div><strong>Demo access:</strong> <span>superadmin@gmail.com / super@123</span></div>
              <div>New to the system? Run <code>npm run seed</code> on the server.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
