'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Radar } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('Incorrect email or password');
        return;
      }
      router.push('/');
      router.refresh();
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
        <h1 className="text-xl font-bold text-white mb-1">Log in</h1>
        <p className="text-sm text-slate-400 mb-6">Welcome back.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text">Email</label>
            <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input type="password" required className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <div className="flex items-center justify-between mt-4 text-xs">
          <Link href="/forgot-password" className="text-slate-500 hover:text-slate-300">Forgot password?</Link>
          <Link href="/signup" className="text-radar-accent">Create account</Link>
        </div>
      </div>
    </div>
  );
}
