'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    setBusy(false);
    if (res?.error) setError('Invalid email or password.'); else window.location.href = '/';
  }
  return (
    <div className="auth"><h1>Sign in</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="username" required />
        <label htmlFor="password">Password</label>
        <input id="password" className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <p style={{ color: '#f87171', marginTop: 12 }}>{error}</p>}
        <button className="btn" type="submit" disabled={busy} style={{ marginTop: 18, width: '100%' }}>{busy ? 'Signing in' : 'Sign in'}</button>
      </form>
    </div>
  );
}
