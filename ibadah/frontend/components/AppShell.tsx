'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type { Profile } from '@/lib/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, ClipboardCheck, LayoutDashboard, FileText, Heart, Presentation, Users, UsersRound } from 'lucide-react';
import { NavGroup, NavItem, Sidebar, SidebarBrand, SidebarUser } from '@/components/Sidebar';

const MeCtx = createContext<Profile | null>(null);
export const useMe = () => useContext(MeCtx);

export default function AppShell({ children, bare }: { children: ReactNode; bare?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const adminOnly = (pathname.startsWith('/admin') && !pathname.startsWith('/admin/umat')) || pathname.startsWith('/audit');
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

  const denied = !!me && !('offline' in me) && adminOnly && me.role !== 'superadmin';
  useEffect(() => { if (denied) router.replace('/dashboard'); }, [denied, router]);

  if (!me) return <p className="muted" style={{ padding: 24 }} role="status">Memuat…</p>;
  if ('offline' in me) return <Alert variant="destructive" className="m-6 w-auto"><AlertDescription>Tidak dapat terhubung ke server. Pastikan backend berjalan, lalu muat ulang halaman.</AlertDescription></Alert>;
  if (denied) return null;
  if (bare) return <MeCtx.Provider value={me as Profile}>{children}</MeCtx.Provider>;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <Sidebar>
        <div className="flex flex-col gap-7 max-md:flex-row max-md:items-center max-md:gap-1">
          <SidebarBrand />
          <hr className="border-t border-navy-rule max-md:hidden" />
          <NavItem href="/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>
          <NavGroup label="Ibadah">
            <NavItem href="/petugas" icon={UsersRound}>Petugas</NavItem>
            <NavItem href="/slides" icon={Presentation}>Slideshow</NavItem>
            <NavItem href="/absensi" icon={ClipboardCheck}>Absensi</NavItem>
            <NavItem href="/admin/umat" icon={Heart}>Umat</NavItem>
            <NavItem href="/kitab" icon={BookOpen}>Kitab</NavItem>
          </NavGroup>
          {me.role === 'superadmin' && (
            <NavGroup label="Administrasi">
              <NavItem href="/admin/users" icon={Users}>User</NavItem>
              <NavItem href="/admin/informasi" icon={FileText}>Informasi</NavItem>
              <NavItem href="/audit" icon={FileText}>Audit</NavItem>
            </NavGroup>
          )}
        </div>
        <SidebarUser
          name={me.name}
          role={me.role === 'superadmin' ? 'Superadmin' : 'Pengurus'}
          onLogout={async () => { await supabase.auth.signOut(); router.replace('/login'); }}
        />
      </Sidebar>
      <main className="content"><MeCtx.Provider value={me as Profile}>{children}</MeCtx.Provider></main>
    </div>
  );
}
