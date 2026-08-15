'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Radar } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/account/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 auth-page-shell">
      <div className="glass-card-static p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <Radar size={20} className="text-radar-accent" />
          <span className="text-sm font-bold text-white">Job Radar</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-slate-400 mt-4">
            If an account exists for that email, a reset link has been sent.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-6">We&apos;ll email you a link to reset it.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Email</label>
                <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
        <p className="text-xs text-slate-500 mt-4 text-center">
          <Link href="/login" className="text-radar-accent">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
