'use client';
import { ArrowRight, Search } from 'lucide-react';
import KitabNav from '@/components/KitabNav';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { IconInput } from '@/components/ui/icon-input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAyat } from '@/lib/useAyat';

export default function Kitab() {
  const { babs, kitabs, bab, babId, pickBab, nextBab, rows, q, setQ, searching, err } = useAyat();
  const title = searching ? `Hasil pencarian “${q.trim()}”` : bab ? `${bab.kitab_nama.split(' – ')[0]} · ${bab.bab}` : 'Kitab';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        trail={['Ibadah', 'Kitab']}
        title="Kitab"
        description="Jelajahi ayat, baca terjemahan, dan temukan rujukan untuk kebaktian."
      />

      <IconInput
        icon={Search} type="search" fieldSize="md" aria-label="Cari ayat" placeholder="Cari ayat berdasarkan kata, hanzi, atau pinyin…"
        value={q} onChange={(e) => setQ(e.target.value)}
      />

      {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
      {!err && babs && !babs.length && <div className="empty">Data ayat belum diimpor. Jalankan <code>npm run import-ayat</code> di folder backend.</div>}

      <div className="grid items-start gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
        <Card className="gap-3 rounded-lg p-5 shadow-none lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
          <h2 className="m-0 text-sm font-bold">Jelajahi kitab</h2>
          <KitabNav babs={babs} kitabs={kitabs} activeId={searching ? null : babId} onPick={pickBab} className="max-lg:max-h-60" />
        </Card>

        <Card className="gap-0 rounded-lg py-0 shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="m-0 text-lg font-bold">{title}</h2>
              <p className="text-xs text-muted-foreground">
                {!searching && bab?.judul ? `${bab.judul}  ·  ` : ''}{rows ? `${rows.length} ayat${searching && rows.length >= 50 ? ' (maks. 50)' : ''}` : 'Memuat…'}
              </p>
            </div>
            {!searching && nextBab && (
              <Button variant="outline" size="sm" onClick={() => pickBab(nextBab.id)}>Bab berikutnya <ArrowRight /></Button>
            )}
          </div>

          {!rows && !err && [0, 1, 2].map((n) => <Skeleton key={n} className="m-5 h-24" />)}
          {rows?.map((r) => (
            <article key={r.id} className="flex gap-4 border-t px-5 py-[22px] sm:gap-5 sm:px-7">
              {searching
                ? <span className="w-24 shrink-0 text-[11px] leading-snug font-bold text-gold-eyebrow">{r.ref}</span>
                : <span className="w-6 shrink-0 text-xs font-bold text-gold-eyebrow tabular-nums">{r.nomor.padStart(2, '0')}</span>}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="font-han text-[19px] leading-relaxed text-ink">{r.hanzi}</p>
                {r.pinyin && <p className="text-[11px] text-muted-foreground">{r.pinyin}</p>}
                <p className="text-xs leading-relaxed text-fg-2">{r.terjemahan}</p>
              </div>
            </article>
          ))}
          {rows && !rows.length && !err && <div className="empty m-5">Tidak ada ayat.</div>}
          {rows && rows.length > 0 && <p className="border-t px-5 py-4 text-[11px] text-muted-foreground sm:px-7">Menampilkan {rows.length} ayat</p>}
        </Card>
      </div>
    </div>
  );
}
