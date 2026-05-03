'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut, User } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebaseClient';

interface UserMenuProps {
  email: string;
}

export default function UserMenu({ email }: UserMenuProps) {
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSignOut() {
    setOpen(false);
    try {
      await signOut(firebaseAuth);
    } catch {
      // ignore — still clear server session below
    }
    await fetch('/api/auth/sign-out', { method: 'POST' });
    startTransition(() => {
      router.replace('/login');
      router.refresh();
    });
  }

  const initial = email.slice(0, 1).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-sm transition"
      >
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-primary font-bold text-sm"
          aria-hidden
        >
          {initial}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute end-0 mt-2 z-20 min-w-56 rounded-xl bg-surface text-text-primary shadow-wallet border border-separator overflow-hidden"
          >
            <div className="px-3 py-2.5 border-b border-separator flex items-center gap-2">
              <User size={16} className="text-text-secondary" aria-hidden />
              <span className="text-sm truncate">{email}</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={pending}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-start hover:bg-separator transition disabled:opacity-50"
              role="menuitem"
            >
              <LogOut size={16} className="text-danger" aria-hidden />
              <span>{t('signOut')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
