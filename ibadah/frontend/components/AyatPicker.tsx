'use client';
import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AyatBab, AyatRow, AyatSnap } from '@/lib/types';

interface Item extends AyatRow { ref: string }

// Pemilih ayat: telusuri kitab → bab, atau cari kata. Setiap ayat terpilih menjadi satu slide.
export default function AyatPicker({ onAdd, onClose }: { onAdd: (items: AyatSnap[]) => void; onClose: () => void }) {
  const [babs, setBabs] = useState<AyatBab[] | null>(null);
  const [babId, setBabId] = useState<number | null>(null);
  const [rows, setRows] = useState<Item[] | null>(null);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Map<number, Item>>(new Map());
  const [err, setErr] = useState('');

  useEffect(() => {
    api<AyatBab[]>('/api/ayat/kitab')
      .then((b) => { setBabs(b); if (b[0]) setBabId(b[0].id); })
      .catch((e: Error) => { setBabs([]); setErr(e.message); });
  }, []);

  const kitabs = useMemo(() => {
    const m = new Map<string, AyatBab[]>();
    for (const b of babs ?? []) m.set(b.kitab, [...(m.get(b.kitab) ?? []), b]);
    return [...m.values()];
  }, [babs]);

  const searching = q.trim().length >= 2;

  useEffect(() => {
    if (searching) {
      setRows(null);
      const t = setTimeout(() => {
        api<AyatRow[]>(`/api/ayat/search?q=${encodeURIComponent(q.trim())}`)
          .then((r) => setRows(r.map((x) => ({ ...x, ref: `${x.ayat_bab?.kitab_nama.split(' – ')[0] ?? ''} · ${x.ayat_bab?.bab ?? ''} · ${x.nomor}` }))))
          .catch((e: Error) => { setRows([]); setErr(e.message); });
      }, 300);
      return () => clearTimeout(t);
    }
    const bab = babs?.find((b) => b.id === babId);
    if (!bab) return;
    setRows(null);
    let alive = true;
    api<AyatRow[]>(`/api/ayat?bab_id=${bab.id}`)
      .then((r) => alive && setRows(r.map((x) => ({ ...x, ref: `${bab.kitab_nama.split(' – ')[0]} · ${bab.bab} · ${x.nomor}` }))))
      .catch((e: Error) => { if (alive) { setRows([]); setErr(e.message); } });
    return () => { alive = false; };
  }, [babId, babs, q, searching]);

  const toggle = (r: Item) => setPicked((p) => { const n = new Map(p); if (n.has(r.id)) n.delete(r.id); else n.set(r.id, r); return n; });
  const allOn = !!rows?.length && rows.every((r) => picked.has(r.id));
  const toggleAll = () => setPicked((p) => {
    const n = new Map(p);
    rows?.forEach((r) => (allOn ? n.delete(r.id) : n.set(r.id, r)));
    return n;
  });

  function add() {
    const items = [...picked.values()].map((r): AyatSnap => ({ ref: r.ref, nomor: r.nomor, hanzi: r.hanzi, pinyin: r.pinyin, terjemahan: r.terjemahan }));
    onAdd(items);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[min(760px,calc(100%-2rem))] flex-col gap-0 p-0 sm:max-w-[1180px]">
        <DialogHeader className="flex-row flex-wrap items-center gap-4 border-b px-5 py-4 pr-12 text-left">
          <div>
            <DialogTitle className="font-serif text-xl">Tambah ayat</DialogTitle>
            <DialogDescription className="sr-only">Pilih ayat dari kitab atau cari kata. Setiap ayat menjadi satu slide.</DialogDescription>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari kata (terjemahan, hanzi, atau pinyin)…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </DialogHeader>

        <div className="modal-body">
          <nav className="pick-nav" aria-label="Kitab dan bab">
            {!babs && <Skeleton className="h-48" />}
            {kitabs.map((list) => (
              <div key={list[0].kitab}>
                <h3>{list[0].kitab_hanzi} {list[0].kitab_nama}</h3>
                {list.map((b) => (
                  <button key={b.id} type="button" className={!searching && b.id === babId ? 'on' : ''} onClick={() => { setQ(''); setBabId(b.id); }}>
                    {b.bab}{b.judul && <small>{b.judul.slice(0, 22)}</small>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="pick-list">
            {err && <Alert variant="destructive" className="my-3"><AlertDescription>{err}</AlertDescription></Alert>}
            {!err && babs && !babs.length && <div className="empty">Data ayat belum diimpor. Jalankan <code>npm run import-ayat</code> di folder backend.</div>}
            {searching && <p className="muted my-3">Hasil pencarian “{q.trim()}” (maks. 50)</p>}
            {!rows && !err && [0, 1, 2].map((n) => <Skeleton key={n} className="my-3 h-20" />)}
            {rows && rows.length > 0 && (
              <label className="flex cursor-pointer items-center gap-3 px-2 py-3 text-sm font-semibold">
                <Checkbox checked={allOn} onCheckedChange={toggleAll} /> Pilih semua ({rows.length})
              </label>
            )}
            {rows?.map((r) => (
              <label key={r.id} className={'verse' + (picked.has(r.id) ? ' on' : '')}>
                <Checkbox className="mt-1" checked={picked.has(r.id)} onCheckedChange={() => toggle(r)} />
                <div>
                  <div className="no">{r.ref}</div>
                  <div className="hz">{r.hanzi}</div>
                  {r.pinyin && <div className="py">{r.pinyin}</div>}
                  <div className="tr">{r.terjemahan}</div>
                </div>
              </label>
            ))}
            {rows && !rows.length && !err && <div className="empty my-3">Tidak ada ayat.</div>}
          </div>
        </div>

        <DialogFooter className="items-center border-t bg-background px-5 py-3 sm:justify-start">
          <span className="muted">{picked.size} ayat dipilih · setiap ayat menjadi satu slide</span>
          <span className="spacer" />
          {picked.size > 0 && <Button variant="outline" onClick={() => setPicked(new Map())}>Kosongkan</Button>}
          <Button variant="gold" disabled={!picked.size} onClick={add}>Tambahkan {picked.size || ''} slide</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
