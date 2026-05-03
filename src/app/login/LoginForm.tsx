'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type AuthError,
  type UserCredential,
} from 'firebase/auth';
import { LogIn, Languages } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebaseClient';
import { useLocale } from 'next-intl';

export default function LoginForm() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function exchangeIdTokenForSession(idToken: string) {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (res.status === 403) {
      await signOut(firebaseAuth).catch(() => {});
      setError(t('errorAccessDenied'));
      return false;
    }
    if (!res.ok) {
      await signOut(firebaseAuth).catch(() => {});
      setError(t('errorGeneric'));
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let cred: UserCredential;
    try {
      cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (err) {
      const code = (err as AuthError)?.code ?? '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-email'
      ) {
        setError(t('errorInvalidCredentials'));
      } else {
        setError(t('errorGeneric'));
      }
      return;
    }

    const idToken = await cred.user.getIdToken();
    const ok = await exchangeIdTokenForSession(idToken);
    if (!ok) return;

    startTransition(() => {
      router.replace(from.startsWith('/') ? from : '/');
      router.refresh();
    });
  }

  async function handleGoogleSignIn() {
    setError(null);
    let cred: UserCredential;
    try {
      const provider = new GoogleAuthProvider();
      cred = await signInWithPopup(firebaseAuth, provider);
    } catch (err) {
      const code = (err as AuthError)?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return; // user cancelled — silent
      }
      setError(t('errorGeneric'));
      return;
    }

    const idToken = await cred.user.getIdToken();
    const ok = await exchangeIdTokenForSession(idToken);
    if (!ok) return;

    startTransition(() => {
      router.replace(from.startsWith('/') ? from : '/');
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="absolute top-4 end-4">
        <InlineLocaleToggle />
      </div>

      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-surface shadow-wallet p-6 sm:p-8">
        <h1 className="text-2xl font-bold mb-1">{t('title')}</h1>
        <p className="text-sm text-text-secondary mb-6">{t('subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              {tCommon('email')}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-separator bg-surface px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              {tCommon('password')}
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-separator bg-surface px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              dir="ltr"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-urgency-red-surface text-urgency-red px-3 py-2 text-sm"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending || !email || !password}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white px-4 py-2.5 font-semibold hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <LogIn size={18} aria-hidden />
            {pending ? tCommon('signingIn') : t('submit')}
          </button>
        </form>

        <div className="relative my-5 flex items-center">
          <div className="flex-1 h-px bg-separator" />
          <span className="px-3 text-xs text-text-tertiary uppercase tracking-wide">
            {t('or')}
          </span>
          <div className="flex-1 h-px bg-separator" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-separator bg-surface text-text-primary px-4 py-2.5 font-medium hover:bg-separator active:bg-separator/80 disabled:opacity-50 transition"
        >
          <GoogleIcon />
          <span>{t('continueWithGoogle')}</span>
        </button>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function InlineLocaleToggle() {
  const currentLocale = useLocale();

  function switchLocale() {
    const next = currentLocale === 'he' ? 'en' : 'he';
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      aria-label={currentLocale === 'he' ? 'Switch to English' : 'מעבר לעברית'}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 text-sm font-medium transition"
    >
      <Languages size={16} aria-hidden />
      <span>{currentLocale === 'he' ? 'EN' : 'עב'}</span>
    </button>
  );
}
