'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Radar } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        router.push('/login');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong');
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
        <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
        <p className="text-sm text-slate-400 mb-6">Start tracking jobs that match you.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text">Name</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input type="email" required className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input type="password" required minLength={8} className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-4 text-center">
          Already have an account? <Link href="/login" className="text-radar-accent">Log in</Link>
        </p>
      </div>
    </div>
  );
}
