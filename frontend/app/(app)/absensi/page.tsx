'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Download, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { longDate, thisSunday, todayISO } from '@/lib/slides';
import { useMe } from '@/components/AppShell';
import Notice from '@/components/Notice';
import { Button } from '@/components/ui/button';
import { IconInput } from '@/components/ui/icon-input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/PageHeader';
import { Avatar, CountChip, FilterTabs, Hint, Panel, PanelFooter, PanelHeader, SearchField, StatusPill } from '@/components/Panel';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { Mark, Msg, Rekap, Umat } from '@/lib/types';

const fmtTime = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const FILTERS = { all: 'Semua', belum: 'Belum hadir', hadir: 'Hadir' } as const;

function Attendance() {
  const [week, setWeek] = useState(thisSunday());
  const [umat, setUmat] = useState<Umat[] | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark> | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<keyof typeof FILTERS>('all');
  const [msg, setMsg] = useState<Msg | null>(null);
  const me = useMe();

  useEffect(() => { api<Umat[]>('/api/umat').then(setUmat).catch((e: Error) => { setUmat([]); setMsg({ err: e.message }); }); }, []);

  useEffect(() => {
    let alive = true;
    setMarks(null);
    api<Mark[]>(`/api/absensi?week=${week}`)
      .then((r) => alive && setMarks(Object.fromEntries(r.map((m) => [m.umat_id, m]))))
      .catch((e: Error) => { if (alive) { setMarks({}); setMsg({ err: e.message }); } });
    return () => { alive = false; };
  }, [week]);

  const toggle = useCallback(async (u: Umat) => {
    if (!marks) return;
    const was = marks[u.id];
    const next = { ...marks };
    if (was) delete next[u.id]; else next[u.id] = { umat_id: u.id, marked_by: me?.email ?? '', marked_at: new Date().toISOString() };
    setMarks(next); // optimistis; dikembalikan bila server menolak
    setMsg(null);
    try { await api('/api/absensi', { method: 'PUT', body: { week_date: week, umat_id: u.id, hadir: !was } }); }
    catch (e) { setMarks(marks); setMsg({ err: (e as Error).message }); }
  }, [marks, week, me]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (umat ?? []).filter((u) =>
      (!t || u.nama.toLowerCase().includes(t) || (u.telepon ?? '').includes(t)) &&
      (filter === 'all' || (filter === 'hadir') === !!marks?.[u.id]));
  }, [umat, q, filter, marks]);

  const total = umat?.length ?? 0;
  const present = marks ? (umat ?? []).filter((u) => marks[u.id]).length : 0;
  const pct = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        trail={['Ibadah', 'Absensi']}
        title="Absensi Kebaktian"
        description="Catat kehadiran umat dan pantau rekap kebaktian."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-[230px]">
            <Label htmlFor="week" className="text-xs font-semibold text-fg-2">Tanggal kebaktian</Label>
            <IconInput id="week" type="date" icon={CalendarDays} fieldSize="md" value={week} max={todayISO()} onChange={(e) => e.target.value && setWeek(e.target.value)} />
          </div>
        }
      />
      <Notice msg={msg} className="my-0" />

      <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_350px]">
        <div className="flex flex-col gap-[18px]">
          <Panel>
            <PanelHeader title="Daftar umat" description="Centang nama umat yang hadir pada tanggal ini." aside={umat && <CountChip>{total} umat aktif</CountChip>}>
              <SearchField aria-label="Cari umat" placeholder="Cari nama atau nomor telepon…" value={q} onChange={(e) => setQ(e.target.value)} />
              <FilterTabs label="Saring kehadiran" options={FILTERS} value={filter} onChange={setFilter} />
            </PanelHeader>

            {(!umat || !marks) && [0, 1, 2, 3].map((n) => <div key={n} className="border-t px-6 py-4"><Skeleton className="h-10" /></div>)}
            {umat && marks && !umat.length && <div className="border-t p-6"><div className="empty">Belum ada data umat. Admin dapat menambahkannya di menu Umat.</div></div>}
            {umat && marks && list.map((u) => {
              const m = marks[u.id];
              return (
                <button
                  key={u.id} type="button" onClick={() => toggle(u)} aria-pressed={!!m}
                  className={cn('flex w-full items-center gap-3.5 border-t px-5 py-4 text-left outline-none transition-colors hover:bg-[#F7F9FA] focus-visible:bg-[#F7F9FA] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset sm:px-6', m && 'bg-[#F6FBF8]')}
                >
                  <span className={cn('grid size-[18px] shrink-0 place-items-center rounded-[3px] border', m ? 'border-navy bg-navy text-white' : 'border-[#B8C5CD] bg-card')}>
                    {m && <Check aria-hidden className="size-3" strokeWidth={3} />}
                  </span>
                  <Avatar name={u.nama} />
                  <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                    <strong className="truncate text-[13px] font-semibold">{u.nama}</strong>
                    <span className="truncate text-[11px] text-muted-foreground">{[u.telepon, u.alamat].filter(Boolean).join('  ·  ') || 'Tanpa kontak'}</span>
                    {m && <span className="truncate text-[11px] text-[#2F6B44]">Dicatat {m.marked_by} · {fmtTime(m.marked_at)}</span>}
                  </span>
                  <StatusPill tone={m ? 'ok' : 'muted'}>{m ? 'Hadir' : 'Belum hadir'}</StatusPill>
                </button>
              );
            })}
            {umat && marks && !!umat.length && !list.length && <div className="border-t p-6"><div className="empty">Tidak ada umat yang cocok.</div></div>}
            <PanelFooter><span>Menampilkan {list.length} dari {total} umat</span><span>Perubahan dicatat otomatis</span></PanelFooter>
          </Panel>
          <Hint>Setiap perubahan kehadiran tercatat di log audit.</Hint>
        </div>

        <aside className="flex flex-col gap-[18px] min-[1100px]:sticky min-[1100px]:top-6">
          <Panel className="flex flex-col gap-4 p-[22px]">
            <div className="flex items-center justify-between"><h2 className="m-0 text-[15px] font-bold">Kehadiran</h2><Users aria-hidden className="size-[17px] text-muted-foreground" /></div>
            <p className="text-xs text-muted-foreground">{longDate(week)}</p>
            <div className="flex items-baseline gap-1.5"><span className="text-[34px] leading-none font-bold text-navy tabular-nums">{present}</span><span className="text-[13px] text-muted-foreground">/ {total} umat</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#E9EFF2]" role="progressbar" aria-label="Persentase hadir" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-success transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{pct}% umat aktif hadir</p>
          </Panel>
          <RekapCard umat={umat ?? []} />
        </aside>
      </div>
    </div>
  );
}

// Rekap 8 minggu terakhir (admin): jumlah hadir per tanggal dan unduhan CSV kehadiran per umat.
function RekapCard({ umat }: { umat: Umat[] }) {
  const [r, setR] = useState<Rekap | null>(null);
  useEffect(() => { api<Rekap>('/api/absensi/rekap?weeks=8').then(setR).catch(() => setR({ dates: [], counts: [], byUmat: {} })); }, []);

  function download() {
    if (!r) return;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = ['Nama', 'Telepon', ...r.dates, 'Total'];
    const lines = umat.map((u) => {
      const got = new Set(r.byUmat[u.id] ?? []);
      return [esc(u.nama), esc(u.telepon ?? ''), ...r.dates.map((d) => (got.has(d) ? '1' : '0')), String(got.size)].join(',');
    });
    const url = URL.createObjectURL(new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'rekap-absensi.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Panel className="flex flex-col gap-[18px] p-[22px]">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[15px] font-bold">Rekap 8 minggu</h2>
        <Button variant="outline" size="sm" onClick={download} disabled={!r?.dates.length}><Download />CSV</Button>
      </div>
      <Separator />
      {!r && <Skeleton className="h-28" />}
      {r && !r.dates.length && (
        <div className="flex flex-col items-center gap-2 px-2 pt-1 pb-3 text-center">
          <span className="grid size-[42px] place-items-center rounded-full bg-[#F1F5F7]"><CalendarDays aria-hidden className="size-[18px] text-[#6F8593]" /></span>
          <p className="text-xs font-semibold text-fg-2">Belum ada data absensi</p>
          <p className="text-[11px] text-muted-foreground">Rekap akan muncul setelah kehadiran dicatat.</p>
        </div>
      )}
      {r?.dates.map((d, i) => (
        <div key={d} className="flex justify-between border-b py-2 text-sm last:border-b-0">
          <span>{new Date(d + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <strong className="tabular-nums">{r.counts[i]} hadir</strong>
        </div>
      ))}
    </Panel>
  );
}

export default Attendance;
