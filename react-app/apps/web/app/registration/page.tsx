'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateEmail, validatePassword } from '@fuelify/shared';

// Mirrors: lib/screens/authentication/register_screen.dart
export default function RegistrationPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailValidation = validateEmail(email);
    if (emailValidation !== 'Success') { setError(emailValidation); return; }
    const passwordValidation = validatePassword(password);
    if (passwordValidation !== 'Success') { setError(passwordValidation); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    // TODO: Implement registration API call
    router.replace('/onboarding/welcome');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#202020' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <h1 style={{ color: '#FFBD73', fontSize: '2rem', marginBottom: 32, textAlign: 'center' }}>Create Account</h1>

        {error && <p style={{ color: '#ff6b6b', marginBottom: 16 }}>{error}</p>}

        <div style={{ marginBottom: 16 }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #444', backgroundColor: '#333', color: '#fff' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #444', backgroundColor: '#333', color: '#fff' }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #444', backgroundColor: '#333', color: '#fff' }} />
        </div>

        <button type="submit" style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', backgroundColor: '#FFBD73', color: '#202020', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
          Register
        </button>

        <p style={{ color: '#999', textAlign: 'center', marginTop: 16 }}>
          Already have an account? <a href="/login" style={{ color: '#FFBD73' }}>Login</a>
        </p>
      </form>
    </div>
  );
}
