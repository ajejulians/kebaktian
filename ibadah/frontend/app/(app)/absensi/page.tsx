'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Download, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { longDate, thisSunday, todayISO } from '@/lib/slides';
import { useMe } from '@/components/AppShell';
import Notice from '@/components/Notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <>
      <div className="page-head">
        <div><h1>Absensi Kebaktian</h1><p>{longDate(week)}</p></div>
        <span className="spacer" />
        <div className="field w-48">
          <Label htmlFor="week">Tanggal kebaktian</Label>
          <Input id="week" type="date" className="bg-card" value={week} max={todayISO()} onChange={(e) => e.target.value && setWeek(e.target.value)} />
        </div>
      </div>
      <Notice msg={msg} />

      <div className="split">
        <div>
          <div className="row mb-4">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="bg-card pl-9" placeholder="Cari nama atau nomor telepon…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="seg" role="group" aria-label="Saring kehadiran">
              {(Object.keys(FILTERS) as (keyof typeof FILTERS)[]).map((f) => (
                <button key={f} type="button" className={filter === f ? 'on' : ''} aria-pressed={filter === f} onClick={() => setFilter(f)}>{FILTERS[f]}</button>
              ))}
            </div>
          </div>

          {(!umat || !marks) && <div className="att-grid">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-14" />)}</div>}
          {umat && marks && !umat.length && <div className="empty">Belum ada data umat. Admin dapat menambahkannya di menu Umat.</div>}
          <div className="att-grid">
            {umat && marks && list.map((u) => {
              const m = marks[u.id];
              return (
                <button key={u.id} type="button" className={'att' + (m ? ' on' : '')} onClick={() => toggle(u)} aria-pressed={!!m}>
                  <span className="tick">{m && <Check className="size-3.5" strokeWidth={3} />}</span>
                  <span className="who">
                    <strong>{u.nama}</strong>
                    <small>{[u.telepon, u.alamat].filter(Boolean).join(' · ') || 'Tanpa kontak'}</small>
                    {m && <small className="by">Dicatat {m.marked_by} · {fmtTime(m.marked_at)}</small>}
                  </span>
                </button>
              );
            })}
          </div>
          {umat && marks && !!umat.length && !list.length && <div className="empty">Tidak ada umat yang cocok.</div>}
        </div>

        <aside className="side-col gap-4">
          <Card>
            <CardHeader><CardTitle>Kehadiran</CardTitle></CardHeader>
            <CardContent>
              <div className="font-serif text-6xl leading-none font-medium tabular-nums">{present}<span className="text-2xl text-muted-foreground"> / {total}</span></div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-success transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
              <CardDescription className="mt-3">{pct}% umat aktif hadir. Setiap perubahan tercatat di log audit.</CardDescription>
            </CardContent>
          </Card>
          {me?.role === 'admin' && <RekapCard umat={umat ?? []} />}
        </aside>
      </div>
    </>
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
    <Card>
      <CardHeader>
        <CardTitle>Rekap 8 minggu</CardTitle>
        <CardAction><Button variant="outline" size="sm" onClick={download} disabled={!r?.dates.length}><Download />CSV</Button></CardAction>
      </CardHeader>
      <CardContent>
        {!r && <Skeleton className="h-28" />}
        {r && !r.dates.length && <p className="muted">Belum ada absensi tercatat.</p>}
        {r?.dates.map((d, i) => (
          <div key={d} className="flex justify-between border-b py-2 text-sm last:border-b-0">
            <span>{new Date(d + 'T00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <strong className="tabular-nums">{r.counts[i]} hadir</strong>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default Attendance;
