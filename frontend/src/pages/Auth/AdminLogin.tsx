import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Chrome } from 'lucide-react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = '629966086748-me2doao23pmh9l59gnieojiutr0hvua7.apps.googleusercontent.com';

function AdminLoginInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setTimeout(() => {
      setIsLoading(false);
      navigate('/admin');
    }, 1500);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/admin/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        navigate('/admin');
      } else {
        setError(data.detail || 'Access denied. Your account is not authorized.');
      }
    } catch {
      setError('Failed to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In was cancelled or failed. Please try again.');
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ─── LEFT PANEL: University Background ─── */}
      <div className="hidden lg:flex lg:w-[58%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/university-bg.png)' }}
        />
        {/* Deep navy gradient overlay — heavier at bottom, lighter at top */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,27,63,0.35) 0%, rgba(10,27,63,0.55) 50%, rgba(10,27,63,0.92) 100%)',
          }}
        />

        {/* Logo top-left */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center font-black text-lg"
            style={{ background: '#c49a6c', color: '#0a1b3f' }}
          >
            S
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Sapthagiri NPS</p>
            <p className="text-xs leading-none mt-0.5" style={{ color: '#c49a6c' }}>University</p>
          </div>
        </div>

        {/* Hero text bottom-left */}
        <div className="relative z-10">
          <p className="text-white/70 text-base mb-2 font-light">A Gateway of</p>
          <h1 className="text-5xl font-black text-white leading-tight mb-4">
            Opportu<span style={{ color: '#c49a6c' }}>nities</span>
          </h1>
          <div className="w-14 h-1 rounded-full mb-5" style={{ background: '#c49a6c' }} />
          <p className="text-white/60 text-sm leading-relaxed max-w-sm">
            CampusPool — the intelligent placement automation system powering Sapthagiri's recruitment drives.
          </p>

          {/* Stats bar */}
          <div className="flex gap-8 mt-8">
            {[['2,000+', 'Students Placed'], ['50+', 'Recruiters'], ['98%', 'Satisfaction']].map(([num, label]) => (
              <div key={label}>
                <p className="text-2xl font-black text-white">{num}</p>
                <p className="text-xs text-white/50 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Login Form ─── */}
      <div
        className="flex-1 flex flex-col justify-center px-8 md:px-14 lg:px-16 py-12 relative"
        style={{ background: '#ffffff' }}
      >
        {/* Gold top accent line */}
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{ background: 'linear-gradient(90deg, #c49a6c, #e8c98a, #c49a6c)' }}
        />

        <div className="w-full max-w-sm mx-auto">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-black"
              style={{ background: '#0a1b3f', color: '#c49a6c' }}
            >
              S
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: '#0a1b3f' }}>Sapthagiri NPS University</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div
              className="inline-flex w-12 h-12 rounded-xl items-center justify-center mb-5"
              style={{ background: 'rgba(196,154,108,0.12)', border: '1.5px solid #c49a6c' }}
            >
              <ShieldCheck size={22} style={{ color: '#c49a6c' }} />
            </div>
            <h2 className="text-3xl font-black mb-1" style={{ color: '#0a1b3f' }}>Welcome Back</h2>
            <p className="text-sm" style={{ color: '#6b7280' }}>Sign in to the CampusPool Admin Portal</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-100 flex items-start gap-2">
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#0a1b3f' }}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail size={16} style={{ color: '#9ca3af' }} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@snpsu.edu.in"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ border: '1.5px solid #e5e7eb', color: '#0a1b3f', background: '#f9fafb' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#c49a6c'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(196,154,108,0.12)'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#0a1b3f' }}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={16} style={{ color: '#9ca3af' }} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ border: '1.5px solid #e5e7eb', color: '#0a1b3f', background: '#f9fafb' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#c49a6c'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(196,154,108,0.12)'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#f9fafb'; }}
                />
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#6b7280' }}>
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <a href="#" className="font-semibold hover:underline" style={{ color: '#c49a6c' }}>
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#0a1b3f', color: '#ffffff', boxShadow: '0 4px 20px rgba(10,27,63,0.25)' }}
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = '#0d2255'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#0a1b3f'; }}
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <> Secure Login <ArrowRight size={16} /> </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: '#f3f4f6' }} />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white" style={{ color: '#9ca3af' }}>or continue with</span>
            </div>
          </div>

          {/* Google Sign-In — BOTTOM */}
          <div className="flex justify-center mb-8">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="outline"
              size="large"
              width="320"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
            />
          </div>

          {/* Footer note */}
          <p className="text-center text-xs" style={{ color: '#9ca3af' }}>
            &copy; {new Date().getFullYear()} Sapthagiri NPS University &mdash; Unmatched Excellence, Unlimited Potential.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AdminLoginInner />
    </GoogleOAuthProvider>
  );
}
