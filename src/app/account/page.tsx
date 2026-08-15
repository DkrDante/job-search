'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { KeyRound, Trash2, LogOut } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

export default function AccountPage() {
  const { data: session } = useSession();
  const { success, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toastError(data.error || 'Failed to change password');
        return;
      }
      success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (!res.ok) {
        toastError('Failed to delete account — please try again');
        return;
      }
      await signOut({ callbackUrl: '/login' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="page-header pb-6">
        <h1 className="text-2xl font-bold text-white">Account</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your login and security settings</p>
      </div>

      <div className="p-8 max-w-xl space-y-6">
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Signed in as</h2>
          <p className="text-sm text-slate-300">{session?.user?.name || '—'}</p>
          <p className="text-xs text-slate-500 mt-1">{session?.user?.email}</p>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-secondary mt-4 text-xs">
            <LogOut size={13} /> Sign out
          </button>
        </div>

        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <KeyRound size={15} /> Change Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="label-text">Current password</label>
              <input
                type="password"
                required
                className="input-field"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
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
            <button type="submit" disabled={passwordSaving} className="btn-primary text-xs">
              {passwordSaving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </div>

        <div className="glass-card-static p-6 border border-rose-500/20">
          <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Trash2 size={15} className="text-rose-400" /> Delete Account
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Permanently deletes your account and all your bookmarks, applications, and alerts. This cannot be undone.
          </p>
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <button onClick={handleDeleteAccount} disabled={deleting} className="btn-danger text-xs">
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button onClick={() => setConfirmingDelete(false)} className="btn-ghost text-xs">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmingDelete(true)} className="btn-danger text-xs">
              Delete account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
