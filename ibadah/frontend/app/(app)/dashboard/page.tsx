'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, ClipboardCheck, Presentation, Users, UsersRound, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useMe } from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Panel } from '@/components/Panel';
import { Skeleton } from '@/components/ui/skeleton';
import { longDate, nextSunday, thisSunday } from '@/lib/slides';
import type { Announcement, Assignment, AuditRow, Mark, Profile, SlideshowSummary, Umat } from '@/lib/types';

const ENTITY: Record<string, string> = { user: 'User', umat: 'Data umat', absensi: 'Kehadiran', assignment: 'Petugas', slideshow: 'Slideshow' };
const ACTION: Record<string, string> = {
  create: 'dibuat', update: 'diperbarui', delete: 'dihapus', approve: 'disetujui', block: 'diblokir', unblock: 'dibuka blokirnya',
  reject: 'ditolak', register: 'mendaftar', import: 'diimpor', hadir: 'hadir dicatat', 'batal-hadir': 'hadir dibatalkan', activate: 'diaktifkan', deactivate: 'dinonaktifkan',
};
const label = (r: AuditRow) => `${ENTITY[r.entity] ?? r.entity} ${ACTION[r.action] ?? r.action}`;
const stamp = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}`;
};

function Stat({ title, icon: Icon, value, note }: { title: string; icon: LucideIcon; value: ReactNode; note: string }) {
  return (
    <Panel className="flex flex-col gap-[13px] rounded-lg p-5">
      <div className="flex items-center justify-between"><h2 className="m-0 text-xs font-semibold text-[#5C7381]">{title}</h2><Icon aria-hidden className="size-[17px] text-[#7B909C]" /></div>
      <div className="text-[26px] leading-none font-bold text-[#1A354A] tabular-nums">{value}</div>
      <p className="text-[11px] text-muted-foreground">{note}</p>
    </Panel>
  );
}

function Quick({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 border-t py-3.5 text-inherit no-underline outline-none first:border-t-0 focus-visible:ring-2 focus-visible:ring-ring/50">
      <span className="grid size-[35px] shrink-0 place-items-center rounded-md bg-[#EDF3F6]"><Icon aria-hidden className="size-[17px] text-[#486A80]" /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-1"><span className="text-xs font-semibold text-fg-2">{title}</span><span className="text-[11px] text-muted-foreground">{text}</span></span>
      <ChevronRight aria-hidden className="size-4 text-[#8DA0AB] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export default function Dashboard() {
  const me = useMe();
  const isAdmin = me?.role === 'superadmin';
  const upcoming = nextSunday();
  const last = thisSunday();
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [news, setNews] = useState<Announcement[]>([]);
  const [umat, setUmat] = useState<Umat[] | null>(null);
  const [marks, setMarks] = useState<Mark[] | null>(null);
  const [shows, setShows] = useState<SlideshowSummary[] | null>(null);
  const [plan, setPlan] = useState<Assignment | null | undefined>(undefined);
  const [log, setLog] = useState<AuditRow[] | null>(null);

  useEffect(() => {
    api<Announcement[]>('/api/announcements').then(setNews).catch(() => setNews([]));
    api<Umat[]>('/api/umat').then(setUmat).catch(() => setUmat([]));
    api<Mark[]>(`/api/absensi?week=${last}`).then(setMarks).catch(() => setMarks([]));
    api<SlideshowSummary[]>('/api/slideshows').then(setShows).catch(() => setShows([]));
    api<Assignment | null>(`/api/assignments?week=${upcoming}`).then(setPlan).catch(() => setPlan(null));
  }, [last, upcoming]);
  useEffect(() => { if (isAdmin) { api<Profile[]>('/api/users').then(setUsers).catch(() => setUsers([])); api<AuditRow[]>('/api/audit').then(setLog).catch(() => setLog([])); } }, [isAdmin]);

  const first = me?.name?.split(' ')[0] ?? '';
  const num = (v: number | undefined | null) => (v == null ? <Skeleton className="h-7 w-12" /> : v);

  return (
    <div className="flex flex-col gap-[26px]">
      <PageHeader
        trail={['Dashboard']}
        title={first ? `Selamat datang, ${first}` : 'Selamat datang'}
        description="Ringkasan pelayanan dan persiapan kebaktian Anda."
      />

      {isAdmin && <Panel className="p-5"><h2 className="font-bold">Dashboard superadmin</h2><p className="mt-2 text-sm">{users ? `${users.length} pengguna · ${users.filter(u => u.status === 'pending').length} pengajuan menunggu` : 'Memuat pengguna…'}</p><div className="mt-3 flex gap-4 text-sm"><Link href="/admin/users">Kelola pengguna</Link><Link href="/admin/informasi">Kelola informasi</Link></div></Panel>}
      <Panel className="p-5"><h2 className="font-bold">Informasi</h2>{news.length ? news.map(item => <article key={item.id} className="mt-4 border-t pt-3"><h3 className="font-semibold">{item.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p></article>) : <p className="mt-2 text-sm text-muted-foreground">Belum ada informasi.</p>}</Panel>
      <section aria-label="Kebaktian berikutnya" className="flex flex-wrap items-center justify-between gap-4 rounded-[9px] bg-navy-dark px-6 py-6 sm:px-7">
        <div className="flex flex-col gap-[9px]">
          <span className="text-[10px] font-bold tracking-[0.1em] text-gold-on-navy">KEBAKTIAN BERIKUTNYA</span>
          <span className="text-[21px] font-bold text-white">{longDate(upcoming)}</span>
          <span className="text-xs text-on-navy-2">{plan === undefined ? 'Memeriksa data petugas…' : plan ? `Petugas sudah diisi oleh ${plan.created_by}.` : 'Data petugas untuk tanggal ini belum diisi.'}</span>
        </div>
        <Link href="/petugas" className="inline-flex h-10 items-center gap-2 rounded-[5px] bg-white px-3.5 text-xs font-semibold text-navy no-underline outline-none hover:bg-[#F1F5F8] focus-visible:ring-2 focus-visible:ring-gold">
          Atur petugas <ArrowRight aria-hidden className="size-[15px]" />
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat title="Umat aktif" icon={Users} value={num(umat?.length)} note="Terdaftar untuk absensi" />
        <Stat title="Kehadiran terakhir" icon={ClipboardCheck} value={marks && umat ? `${marks.length} / ${umat.length}` : num(null)} note={longDate(last)} />
        <Stat title="Slideshow" icon={Presentation} value={num(shows?.length)} note="Materi kebaktian tersedia" />
      </div>

      <div className={isAdmin ? 'grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]' : ''}>
        <Panel className="rounded-lg p-[22px]">
          <h2 className="m-0 text-[15px] font-bold">Akses cepat</h2>
          <p className="mt-1.5 mb-3 text-xs text-muted-foreground">Kelola kebutuhan kebaktian dari satu tempat.</p>
          <Quick href="/petugas" icon={UsersRound} title="Petugas kebaktian" text="Atur petugas pelayanan" />
          <Quick href="/slides" icon={Presentation} title="Slideshow" text="Susun materi kebaktian" />
          <Quick href="/absensi" icon={ClipboardCheck} title="Absensi" text="Catat kehadiran umat" />
        </Panel>

        {isAdmin && (
          <Panel className="rounded-lg p-[22px]">
            <div className="mb-2 flex items-center justify-between"><h2 className="m-0 text-[15px] font-bold">Aktivitas terbaru</h2><Link href="/audit" className="text-[11px] font-semibold">Lihat audit</Link></div>
            {!log && [0, 1, 2].map((n) => <Skeleton key={n} className="my-3 h-10" />)}
            {log?.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-start gap-2.5 border-t py-3.5 first:border-t-0">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
                <div className="flex min-w-0 flex-col gap-[5px]">
                  <span className="text-xs font-semibold text-[#40586A]">{label(r)}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{stamp(r.at)} · {r.actor}</span>
                </div>
              </div>
            ))}
            {log && !log.length && <p className="text-xs text-muted-foreground">Belum ada aktivitas.</p>}
          </Panel>
        )}
      </div>
    </div>
  );
}
