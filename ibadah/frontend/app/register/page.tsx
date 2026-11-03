'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Register() {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setBusy(false); return setErr(json.error || 'Gagal mendaftar'); }
      router.replace('/login?m=registered');
    } catch {
      setBusy(false);
      setErr('Tidak dapat terhubung ke server');
    }
  }

  return (
    <AuthShell title="Daftar">
      <p className="muted">Akun baru harus disetujui admin sebelum bisa dipakai.</p>
      <form onSubmit={submit} className="stack mt-6">
        <div className="field"><Label htmlFor="name">Nama</Label><Input id="name" name="name" required autoComplete="name" /></div>
        <div className="field"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" /><p className="muted">Minimal 8 karakter.</p></div>
        {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
        <Button size="lg" className="w-full" disabled={busy}>{busy ? 'Mengirim…' : 'Daftar'}</Button>
      </form>
      <p className="muted mt-6">Sudah punya akun? <Link href="/login">Masuk</Link></p>
    </AuthShell>
  );
}
