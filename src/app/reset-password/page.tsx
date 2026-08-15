'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Radar } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card-static p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <Radar size={20} className="text-radar-accent" />
          <span className="text-sm font-bold text-white">Job Radar</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">Set a new password</h1>
        {done ? (
          <p className="text-sm text-slate-400 mt-4">Password updated — redirecting to login…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="label-text">New password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input-field"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}
        <p className="text-xs text-slate-500 mt-4 text-center">
          <Link href="/login" className="text-radar-accent">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
