'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import KitabNav from '@/components/KitabNav';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IconInput } from '@/components/ui/icon-input';
import { useAyat, type AyatItem } from '@/lib/useAyat';
import { cn } from '@/lib/utils';
import type { AyatSnap } from '@/lib/types';

// Pemilih ayat: telusuri kitab → bab, atau cari kata. Setiap ayat terpilih menjadi satu slide.
export default function AyatPicker({ onAdd, onClose }: { onAdd: (items: AyatSnap[]) => void; onClose: () => void }) {
  const { babs, kitabs, bab, babId, pickBab, rows, q, setQ, searching, err } = useAyat();
  const [picked, setPicked] = useState<Map<number, AyatItem>>(new Map());

  const toggle = (r: AyatItem) => setPicked((p) => { const n = new Map(p); if (n.has(r.id)) n.delete(r.id); else n.set(r.id, r); return n; });
  const allOn = !!rows?.length && rows.every((r) => picked.has(r.id));
  const toggleAll = () => setPicked((p) => {
    const n = new Map(p);
    rows?.forEach((r) => (allOn ? n.delete(r.id) : n.set(r.id, r)));
    return n;
  });

  function add() {
    onAdd([...picked.values()].map((r): AyatSnap => ({ ref: r.ref, nomor: r.nomor, hanzi: r.hanzi, pinyin: r.pinyin, terjemahan: r.terjemahan })));
  }

  const heading = searching ? `Hasil pencarian “${q.trim()}”` : bab ? `${bab.kitab_nama.split(' – ')[0]} · ${bab.bab}` : 'Ayat';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[min(700px,calc(100%-2rem))] flex-col gap-0 overflow-hidden rounded-[10px] p-0 sm:max-w-[1000px]">
        <DialogHeader className="gap-1.5 border-b px-[26px] py-[22px] pr-14 text-left">
          <DialogTitle className="text-xl font-bold">Tambahkan ayat</DialogTitle>
          <DialogDescription className="text-xs">Pilih satu atau beberapa ayat untuk ditambahkan ke slideshow.</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[250px_minmax(0,1fr)] md:grid-rows-1">
          <div className="flex max-h-48 flex-col gap-3.5 overflow-hidden border-b bg-[#F7F9FA] px-[18px] py-5 md:max-h-none md:border-r md:border-b-0 md:py-[22px]">
            <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground">KITAB &amp; BAB</span>
            <KitabNav babs={babs} kitabs={kitabs} activeId={searching ? null : babId} onPick={pickBab} className="min-h-0 flex-1" />
          </div>

          <div className="flex min-h-0 flex-col gap-4 px-5 py-5 md:px-6 md:py-[22px]">
            <IconInput
              icon={Search} type="search" fieldSize="md" aria-label="Cari ayat" placeholder="Cari terjemahan, hanzi, atau pinyin…"
              value={q} onChange={(e) => setQ(e.target.value)}
            />
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="m-0 text-[15px] font-bold">{heading}</h3>
                {rows && <span className="text-[11px] text-muted-foreground">{rows.length} ayat{searching && rows.length >= 50 ? ' (maks. 50)' : ''}</span>}
              </div>
              {!!rows?.length && (
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-fg-2">
                  <Checkbox checked={allOn} onCheckedChange={toggleAll} /> Pilih semua
                </label>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {err && <Alert variant="destructive" className="my-3"><AlertDescription>{err}</AlertDescription></Alert>}
              {!err && babs && !babs.length && <div className="empty">Data ayat belum diimpor. Jalankan <code>npm run import-ayat</code> di folder backend.</div>}
              {!rows && !err && [0, 1, 2].map((n) => <Skeleton key={n} className="my-3 h-20" />)}
              {rows?.map((r) => (
                <label
                  key={r.id}
                  className={cn('flex cursor-pointer gap-3 border-b px-1 py-[13px] transition-colors hover:bg-[#F7F9FA]', picked.has(r.id) && 'bg-gold-soft/50')}
                >
                  <Checkbox className="mt-0.5" checked={picked.has(r.id)} onCheckedChange={() => toggle(r)} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                    <span className="text-[10px] font-bold tracking-[0.04em] text-gold-eyebrow uppercase">{r.ref}</span>
                    <span className="font-han text-base leading-snug">{r.hanzi}</span>
                    {r.pinyin && <span className="text-[10px] text-muted-foreground">{r.pinyin}</span>}
                    <span className="text-[11px] leading-relaxed text-fg-2">{r.terjemahan}</span>
                  </div>
                </label>
              ))}
              {rows && !rows.length && !err && <div className="empty my-3">Tidak ada ayat.</div>}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row flex-wrap items-center justify-between gap-3 border-t bg-[#FAFBFB] px-[26px] py-4 sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-fg-2" aria-live="polite">{picked.size} ayat dipilih</span>
            <span className="text-[11px] text-muted-foreground">Setiap ayat akan menjadi satu slide.</span>
          </div>
          <div className="flex gap-2.5">
            {picked.size > 0 && <Button variant="ghost" size="md" onClick={() => setPicked(new Map())}>Kosongkan</Button>}
            <Button variant="outline" size="md" onClick={onClose}>Batal</Button>
            <Button size="md" disabled={!picked.size} onClick={add}>Tambahkan slide</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
