'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogOut } from 'lucide-react';

const MeCtx = createContext<Profile | null>(null);
export const useMe = () => useContext(MeCtx);

const ICONS: Record<string, string> = {
  absensi: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  umat: 'M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z',
  petugas: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21a8 8 0 0 1 16 0',
  slides: 'M3 5h18v11H3zM8 21h8M12 16v5',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20a7 7 0 0 1 14 0M17 4.5a3.5 3.5 0 0 1 0 6.5M22 20a6 6 0 0 0-4-5.6',
  audit: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',
};

function Icon({ name }: { name: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

function Item({ href, icon, children }: { href: string; icon: string; children: ReactNode }) {
  const active = usePathname().startsWith(href);
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} title={typeof children === 'string' ? children : undefined} className={'nav-item' + (active ? ' active' : '')}>
      <Icon name={icon} /><span>{children}</span>
    </Link>
  );
}

export default function AppShell({ children, bare }: { children: ReactNode; bare?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const adminOnly = pathname.startsWith('/admin') || pathname.startsWith('/audit');
  const [me, setMe] = useState<Profile | { offline: true } | null>(null);

  // Cek sesi hanya sekali selama shell hidup; pindah halaman tidak memicu pemeriksaan ulang.
  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/login');
      try {
        const profile = await api<Profile>('/api/me');
        if (profile.status !== 'active') {
          await supabase.auth.signOut();
          return router.replace(`/login?m=${profile.status}`);
        }
        setMe(profile);
      } catch (e) {
        // Backend tak terjangkau bukan berarti akun tak valid: jangan paksa logout.
        if (e instanceof TypeError) return setMe({ offline: true });
        await supabase.auth.signOut();
        router.replace('/login?m=none');
      }
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') router.replace('/login'); });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const denied = !!me && !('offline' in me) && adminOnly && me.role !== 'admin';
  useEffect(() => { if (denied) router.replace('/petugas'); }, [denied, router]);

  if (!me) return <p className="muted" style={{ padding: 24 }} role="status">Memuat…</p>;
  if ('offline' in me) return <Alert variant="destructive" className="m-6 w-auto"><AlertDescription>Tidak dapat terhubung ke server. Pastikan backend berjalan, lalu muat ulang halaman.</AlertDescription></Alert>;
  if (denied) return null;
  if (bare) return <MeCtx.Provider value={me as Profile}>{children}</MeCtx.Provider>;

  return (
    <div className="shell">
      <aside className="side" aria-label="Navigasi utama">
        <div className="brand">
          <span className="brand-mark">
            <img src="/icons/favicon_matakin.png" alt="" />
          </span>
          Kebaktian
        </div>
        <div className="nav-label">Ibadah</div>
        <Item href="/petugas" icon="petugas">Petugas</Item>
        <Item href="/slides" icon="slides">Slideshow</Item>
        <Item href="/absensi" icon="absensi">Absensi</Item>
        {me.role === 'admin' && <>
          <div className="nav-label">Admin</div>
          <Item href="/admin/users" icon="users">User</Item>
          <Item href="/admin/umat" icon="umat">Umat</Item>
          <Item href="/audit" icon="audit">Audit</Item>
        </>}
        <div className="me">
          <div><strong>{me.name}</strong><span>{me.role === 'admin' ? 'Administrator' : 'Pelayan'}</span></div>
          <Button size="sm" variant="outline" className="mt-3 w-full border-navy-dark bg-transparent text-[var(--brand-on-navy-2)] shadow-none hover:bg-navy hover:text-white max-[800px]:mt-0 max-[800px]:w-auto" onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }}><LogOut />Keluar</Button>
        </div>
      </aside>
      <main className="content"><MeCtx.Provider value={me as Profile}>{children}</MeCtx.Provider></main>
    </div>
  );
}
