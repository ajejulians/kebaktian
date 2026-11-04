'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { IconInput } from '@/components/ui/icon-input';
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
  const [showPw, setShowPw] = useState(false);

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
      router.replace('/dashboard');
    } catch (e2) {
      await supabase.auth.signOut();
      setBusy(false);
      setErr(e2 instanceof TypeError ? 'Tidak dapat terhubung ke server' : NOTES.none);
    }
  }

  return (
    <AuthShell
      eyebrow="PORTAL PELAYANAN"
      title="Selamat datang kembali"
      description="Masuk untuk melanjutkan pengelolaan kebaktian."
      footer={<>Belum punya akun? <Link href="/register" className="font-semibold">Daftar sekarang</Link></>}
    >
      <form onSubmit={submit} className="flex flex-col gap-[22px]">
        <Field label="Email" htmlFor="email" labelClassName="text-[13px]">
          <IconInput id="email" name="email" type="email" icon={Mail} placeholder="nama@email.com" required autoComplete="email" />
        </Field>
        <Field label="Kata sandi" htmlFor="password" labelClassName="text-[13px]">
          <IconInput
            id="password" name="password" type={showPw ? 'text' : 'password'} icon={LockKeyhole}
            placeholder="Masukkan kata sandi" required autoComplete="current-password"
            trailing={
              <button
                type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}
                aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPw ? <EyeOff aria-hidden className="size-[18px]" /> : <Eye aria-hidden className="size-[18px]" />}
              </button>
            }
          />
        </Field>
        {note && <Alert variant="success"><AlertDescription>{note}</AlertDescription></Alert>}
        {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
        <Button size="xl" className="mt-1.5 w-full" disabled={busy}>
          {busy ? 'Memeriksa…' : <>Masuk <ArrowRight /></>}
        </Button>
      </form>
    </AuthShell>
  );
}
