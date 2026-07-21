import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth';

const DEMO_ACCOUNTS = [
  { username: 'admin', label: 'Plant Administrator' },
  { username: 'operator', label: 'Control Room Operator' },
  { username: 'maintenance', label: 'Maintenance Engineer' },
  { username: 'hse', label: 'HSE / Safety Officer' },
];
const DEMO_PASSWORD = 'Astrikos2026';

function AccessGate({ onContinue }) {
  return (
    <div className="h-screen w-screen relative flex items-center justify-center bg-app-darker p-6 overflow-hidden">
      {/* Background image — plant/AI visual */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/SmartCementPlants2.png')", opacity: 0.5 }}
      />
      <div className="absolute inset-0 bg-app-darker/70" />

      <div className="relative w-full max-w-md rounded-2xl border border-app-border bg-app-panel px-8 py-10 text-center">
        <img
          src="/Logo Transparent Horizontal.png"
          alt="Astrikos"
          className="h-16 mx-auto mb-8 object-contain"
        />

        <h1 className="text-2xl font-bold text-white leading-tight mb-2">
          Smart Cement Manufacturing Facility
        </h1>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-8">
          <span className="text-sky-400">CemPulse</span>
          <span className="text-slate-500"> · Access System</span>
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="w-full text-left rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-5"
        >
          <div className="w-11 h-11 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">Administrator</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Full system access with plant control centre overview
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 mt-3 inline-flex items-center gap-1">
              Access Login
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </p>
          </div>
        </button>

        <p className="text-[10px] text-slate-500 mt-8">
          Authorized personnel only. All access attempts are logged and monitored.
        </p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-2">
          Powered by Astrikos.ai
        </p>
      </div>
    </div>
  );
}

function LoginForm({ onBack }) {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    const ok = await login(username, password);
    setSubmitting(false);
    if (ok) navigate(from, { replace: true });
  };

  const fillDemo = (demoUsername) => {
    setUsername(demoUsername);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-app-darker p-6">
      <div className="w-full max-w-sm">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 mb-6"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <img
          src="/Logo Transparent Horizontal.png"
          alt="Astrikos"
          className="h-12 mx-auto mb-6 object-contain"
        />

        <h2 className="text-xl font-bold text-white mb-1 text-center">Sign in</h2>
        <p className="text-[12px] text-slate-400 mb-6 text-center">Access the plant operations dashboard</p>

        {(error || localError) && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[12px] text-red-400">
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Username</label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 pr-10 text-[13px] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-2 rounded-lg text-[13px] font-bold text-white transition-colors disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-app-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Demo environment — for evaluation only</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => fillDemo(acc.username)}
                className="text-left px-2.5 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
              >
                <div className="text-[10px] font-semibold text-slate-200 leading-tight">{acc.label}</div>
                <div className="text-[9px] text-slate-500 mt-0.5 truncate">{acc.username}</div>
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-600 mt-2">Password for all demo accounts: <span className="font-mono text-slate-500">{DEMO_PASSWORD}</span></p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const [step, setStep] = useState('gate');

  if (step === 'gate') {
    return <AccessGate onContinue={() => setStep('form')} />;
  }
  return <LoginForm onBack={() => setStep('gate')} />;
}
