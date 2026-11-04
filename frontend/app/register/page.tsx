'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import AuthShell from '@/components/AuthShell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { IconInput } from '@/components/ui/icon-input';
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
    <AuthShell
      eyebrow="PORTAL PELAYANAN"
      title="Buat akun baru"
      description="Akun baru harus disetujui admin sebelum bisa dipakai."
      footer={<>Sudah punya akun? <Link href="/login" className="font-semibold">Masuk</Link></>}
    >
      <form onSubmit={submit} className="flex flex-col gap-[22px]">
        <Field label="Nama lengkap" htmlFor="name" labelClassName="text-[13px]">
          <IconInput id="name" name="name" icon={UserRound} placeholder="Nama lengkap" required autoComplete="name" />
        </Field>
        <Field label="Tanggal lahir" htmlFor="birth_date"><input className="w-full rounded-md border px-3 py-2" id="birth_date" name="birth_date" type="date" max={new Date().toISOString().slice(0, 10)} required /></Field>
        <Field label="Domisili" htmlFor="domicile"><input className="w-full rounded-md border px-3 py-2" id="domicile" name="domicile" required /></Field>
        <Field label="Asal Pakin/Makin" htmlFor="pakin_makin"><input className="w-full rounded-md border px-3 py-2" id="pakin_makin" name="pakin_makin" required /></Field>
        <Field label="Email" htmlFor="email" labelClassName="text-[13px]">
          <IconInput id="email" name="email" type="email" icon={Mail} placeholder="nama@email.com" required autoComplete="email" />
        </Field>
        <Field label="Kata sandi" htmlFor="password" labelClassName="text-[13px]" hint="Minimal 8 karakter.">
          <IconInput id="password" name="password" type="password" icon={LockKeyhole} placeholder="Buat kata sandi" minLength={8} required autoComplete="new-password" />
        </Field>
        {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
        <Button size="xl" className="mt-1.5 w-full" disabled={busy}>
          {busy ? 'Mengirim…' : <>Daftar <ArrowRight /></>}
        </Button>
      </form>
    </AuthShell>
  );
}
