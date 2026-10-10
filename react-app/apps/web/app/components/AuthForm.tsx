'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { validateEmail, validatePassword } from '@fuelify/shared';
import { AUTH_DISABLED, useAuthStore } from '../providers';
import { Icon, Logo } from './ui';

// Mirrors: lib/screens/authentication/login_screen.dart + register_screen.dart
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const status = useAuthStore((s) => s.status);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    const emailCheck = validateEmail(email);
    if (emailCheck !== 'Success') return setError(emailCheck);
    const passwordCheck = validatePassword(password);
    if (passwordCheck !== 'Success') return setError(passwordCheck);
    if (isRegister && password !== confirm) return setError('Passwords do not match');

    setBusy(true);
    const wasAnonymous = isAnonymous;
    const result = isRegister ? await signUp(email, password) : await signIn(email, password);
    setBusy(false);

    if (!result.status) return setError(result.message);
    if (isRegister && wasAnonymous) {
      // Upgraded the anonymous account in place — data is kept
      setNotice(result.message);
      return;
    }
    router.replace(isRegister ? '/onboarding/welcome' : '/');
  };

  return (
    <div className="screen">
      <div className="screen-scroll">
        <form onSubmit={handleSubmit} className="stack-lg" style={{ padding: '48px 24px 24px', maxWidth: 420, margin: '0 auto' }} noValidate>
          {(AUTH_DISABLED || isAnonymous) && (
            <Link href="/home" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', paddingLeft: 0 }}>
              <Icon name="chevronLeft" /> Back to app
            </Link>
          )}
          <div className="stack-sm center">
            <Logo size={40} />
            <p className="muted">
              {isRegister
                ? isAnonymous
                  ? 'Save your progress with an email and password.'
                  : 'Create your account to get started.'
                : 'Welcome back! Log in to continue.'}
            </p>
          </div>

          {error && <div className="alert" role="alert">{error}</div>}
          {notice && <div className="alert alert-info" role="status">{notice}</div>}

          <div className="stack">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" autoComplete="email" inputMode="email"
                placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" className="input" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {isRegister && (
              <div className="field">
                <label htmlFor="confirm">Confirm password</label>
                <input id="confirm" className="input" type="password" autoComplete="new-password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || status === 'authenticating'}>
            {busy ? (isRegister ? 'Creating account…' : 'Logging in…') : isRegister ? 'Create account' : 'Log in'}
          </button>

          <p className="center muted small">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <Link href={isRegister ? '/login' : '/registration'} style={{ color: 'var(--primary)', fontWeight: 700 }}>
              {isRegister ? 'Log in' : 'Sign up'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
