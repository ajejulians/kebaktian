'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Profile } from '@/lib/types';

const NOTES: Record<string, string> = {
  pending: 'Akun Anda menunggu persetujuan admin.',
  blocked: 'Akun Anda diblokir. Hubungi admin.',
  none: 'Akun belum terdaftar. Hubungi admin.',
  registered: 'Pendaftaran terkirim. Tunggu persetujuan admin sebelum bisa masuk.',
};

export default function Login() {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNote(NOTES[new URLSearchParams(window.location.search).get('m') ?? ''] || '');
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setNote(''); setBusy(true);
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get('email')), password: String(f.get('password')) });
    if (error) { setBusy(false); return setErr('Email atau password salah'); }
    try {
      const me = await api<Profile>('/api/me');
      if (me.status !== 'active') {
        await supabase.auth.signOut();
        setBusy(false);
        return setErr(NOTES[me.status]);
      }
      router.replace('/petugas');
    } catch (e2) {
      await supabase.auth.signOut();
      setBusy(false);
      setErr(e2 instanceof TypeError ? 'Tidak dapat terhubung ke server' : NOTES.none);
    }
  }

  return (
    <AuthShell title="Masuk">
      <p className="muted">Silakan masuk untuk mengelola kebaktian.</p>
      <form onSubmit={submit} className="stack mt-6">
        <div className="field"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required autoComplete="current-password" /></div>
        {note && <Alert variant="success"><AlertDescription>{note}</AlertDescription></Alert>}
        {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
        <Button size="lg" className="w-full" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk'}</Button>
      </form>
      <p className="muted mt-6">Belum punya akun? <Link href="/register">Daftar</Link></p>
    </AuthShell>
  );
}
