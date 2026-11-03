'use client';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AuditRow } from '@/lib/types';

type Tone = 'bad' | 'ok' | 'gold' | 'warn';
const TONE: Record<string, Tone> = { delete: 'bad', block: 'bad', reject: 'bad', deactivate: 'bad', 'batal-hadir': 'bad', create: 'ok', approve: 'ok', unblock: 'ok', hadir: 'ok', activate: 'ok', import: 'gold', register: 'warn' };
const ENTITIES = ['user', 'umat', 'absensi', 'assignment', 'slideshow'];

function Log() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [entity, setEntity] = useState('all');
  useEffect(() => { api<AuditRow[]>('/api/audit').then(setRows).catch(() => setRows([])); }, []);
  const shown = rows?.filter((r) => entity === 'all' || r.entity === entity) ?? [];

  return (
    <>
      <div className="page-head">
        <div><h1>Log Audit</h1><p>200 catatan terakhir. Klik untuk melihat data sebelum dan sesudah.</p></div>
        <span className="spacer" />
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-52 bg-card" aria-label="Jenis data"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua jenis data</SelectItem>
            {ENTITIES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {!rows && [0, 1, 2].map((n) => <Skeleton key={n} className="mb-2 h-14" />)}
      {!!shown.length && (
        <Card className="gap-0 py-0">
          {shown.map((r) => (
            <details key={r.id} className="group border-b last:border-b-0">
              <summary className="row px-5 py-3 hover:bg-muted/60">
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                <Badge variant={TONE[r.action] ?? 'secondary'}>{r.action}</Badge>
                <strong>{r.entity}</strong>
                <span className="muted">oleh {r.actor}</span>
                <span className="spacer" />
                <span className="muted tabular-nums">{new Date(r.at).toLocaleString('id-ID')}</span>
              </summary>
              <div className="ba px-5 pb-4">
                <div><p className="muted mb-1">Sebelum</p><pre>{JSON.stringify(r.before, null, 2)}</pre></div>
                <div><p className="muted mb-1">Sesudah</p><pre>{JSON.stringify(r.after, null, 2)}</pre></div>
              </div>
            </details>
          ))}
        </Card>
      )}
      {rows && !shown.length && <div className="empty">Belum ada catatan.</div>}
    </>
  );
}

export default Log;
