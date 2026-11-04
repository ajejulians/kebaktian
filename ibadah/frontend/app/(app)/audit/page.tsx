'use client';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import { Panel, PanelFooter, PanelHeader, StatusPill } from '@/components/Panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AuditRow } from '@/lib/types';

type Tone = 'bad' | 'ok' | 'gold' | 'warn' | 'muted';
const TONE: Record<string, Tone> = { delete: 'bad', block: 'bad', reject: 'bad', deactivate: 'bad', 'batal-hadir': 'bad', create: 'ok', approve: 'ok', unblock: 'ok', hadir: 'ok', activate: 'ok', import: 'gold', register: 'warn' };
const ENTITIES = ['user', 'umat', 'absensi', 'assignment', 'slideshow'];
const COLS = 'md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_16px]';
const when = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

function Log() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [entity, setEntity] = useState('all');
  useEffect(() => { api<AuditRow[]>('/api/audit').then(setRows).catch(() => setRows([])); }, []);
  const shown = rows?.filter((r) => entity === 'all' || r.entity === entity) ?? [];

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        trail={['Administrasi', 'Audit']}
        title="Log Audit"
        description="Pantau perubahan data dan aktivitas pengguna dalam aplikasi."
      />

      <Panel>
        <PanelHeader
          title="Riwayat aktivitas"
          description="Menampilkan hingga 200 catatan terakhir. Pilih baris untuk melihat perubahan."
          aside={
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="h-10 w-full rounded-[5px] bg-card text-xs sm:w-[190px]" aria-label="Jenis data"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua jenis data</SelectItem>
                {ENTITIES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          }
        />

        <div className={`hidden gap-[18px] border-t bg-[#F8FAFA] px-6 py-3.5 text-[10px] font-bold tracking-[0.08em] text-[#7A8B96] md:grid ${COLS}`}>
          <span>AKSI</span><span>JENIS DATA</span><span>DILAKUKAN OLEH</span><span>WAKTU</span><span />
        </div>
        {!rows && [0, 1, 2].map((n) => <div key={n} className="border-t px-6 py-4"><Skeleton className="h-8" /></div>)}
        {shown.map((r) => (
          <details key={r.id} className="group border-t">
            <summary className={`grid cursor-pointer list-none items-center gap-x-[18px] gap-y-1.5 px-5 py-4 transition-colors outline-none hover:bg-[#F7F9FA] focus-visible:bg-[#F7F9FA] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset sm:px-6 [&::-webkit-details-marker]:hidden ${COLS}`}>
              <StatusPill tone={TONE[r.action] ?? 'muted'}>{r.action}</StatusPill>
              <span className="text-xs text-fg-2">{r.entity}</span>
              <span className="truncate text-xs text-[#5E7281]">{r.actor}</span>
              <span className="text-xs text-[#5E7281] tabular-nums">{when(r.at)}</span>
              <ChevronRight aria-hidden className="size-4 text-[#8C9DA8] transition-transform group-open:rotate-90 max-md:hidden" />
            </summary>
            <div className="ba px-5 pb-5 sm:px-6">
              <div><p className="mb-1 text-xs text-muted-foreground">Sebelum</p><pre>{JSON.stringify(r.before, null, 2)}</pre></div>
              <div><p className="mb-1 text-xs text-muted-foreground">Sesudah</p><pre>{JSON.stringify(r.after, null, 2)}</pre></div>
            </div>
          </details>
        ))}
        {rows && !shown.length && <div className="border-t p-6"><div className="empty">Belum ada catatan.</div></div>}
        <PanelFooter><span>Menampilkan {shown.length} catatan terbaru</span><span>Pilih catatan untuk melihat data sebelum dan sesudah</span></PanelFooter>
      </Panel>
    </div>
  );
}

export default Log;
