'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Pencil, Play, Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import SlideView from '@/components/SlideView';
import Notice from '@/components/Notice';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { IconInput } from '@/components/ui/icon-input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { Slideshow, SlideshowSummary } from '@/lib/types';

type SortKey = 'updated' | 'title' | 'count';
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'updated', label: 'Terakhir diubah' },
  { value: 'title', label: 'Nama (A–Z)' },
  { value: 'count', label: 'Jumlah slide' },
];

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

function List() {
  const router = useRouter();
  const [items, setItems] = useState<SlideshowSummary[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');

  useEffect(() => { api<SlideshowSummary[]>('/api/slideshows').then(setItems).catch((e: Error) => { setItems([]); setErr(e.message); }); }, []);

  async function create() {
    setErr(''); setBusy(true);
    try {
      const d = await api<Slideshow>('/api/slideshows', { method: 'POST', body: { title: 'Kebaktian baru', slides: [] } });
      router.push(`/slides/${d.id}`);
    } catch (e) {
      setBusy(false);
      setErr(e instanceof TypeError ? 'Tidak dapat terhubung ke server. Pastikan backend berjalan.' : (e as Error).message);
    }
  }

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (items ?? []).filter((s) => !term || s.title.toLowerCase().includes(term));
    return list.sort((a, b) =>
      sort === 'title' ? a.title.localeCompare(b.title, 'id')
        : sort === 'count' ? (b.slides?.length ?? 0) - (a.slides?.length ?? 0)
        : +new Date(b.updated_at) - +new Date(a.updated_at));
  }, [items, q, sort]);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        trail={['Ibadah', 'Slideshow']}
        title="Slideshow"
        description="Susun dan kelola materi untuk kebaktian."
        actions={<Button size="md" onClick={create} disabled={busy}><Plus />{busy ? 'Membuat…' : 'Slideshow baru'}</Button>}
      />

      <Notice msg={err ? { err } : null} className="my-0" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <IconInput
          icon={Search} type="search" fieldSize="md" aria-label="Cari slideshow" placeholder="Cari nama slideshow…"
          value={q} onChange={(e) => setQ(e.target.value)} wrapperClassName="w-full sm:w-80"
        />
        <label className="relative flex h-[46px] items-center rounded-md border border-input bg-card text-xs text-fg-2 focus-within:ring-2 focus-within:ring-ring/40">
          <span className="sr-only">Urutkan</span>
          <select
            value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-full cursor-pointer appearance-none bg-transparent pr-9 pl-[13px] outline-none"
          >
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-3 size-4 text-muted-foreground" />
        </label>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[15px] font-bold">Semua slideshow</h2>
        {items && <span className="text-xs text-muted-foreground" aria-live="polite">{shown.length} slideshow</span>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 min-[1180px]:grid-cols-3">
        {!items && [0, 1, 2].map((n) => <Skeleton key={n} className="h-[330px]" />)}
        {shown.map((s) => (
          <Card key={s.id} className="gap-0 overflow-hidden rounded-lg py-0 shadow-none transition-colors hover:border-input">
            <SlideView slide={s.slides?.[0] ?? { type: 'text', title: s.title, body: '', url: '' }} />
            <div className="flex flex-1 flex-col gap-2.5 border-t p-[18px]">
              <h3 className="m-0 truncate text-[15px] font-bold">{s.title}</h3>
              <p className="text-[11px] text-muted-foreground">{s.slides?.length ?? 0} slide · Diubah {shortDate(s.updated_at)}</p>
              <p className="text-[11px] text-muted-foreground">Oleh {s.updated_by}</p>
              <Separator className="mt-auto" />
              <div className="flex gap-[9px]">
                <Button asChild variant="outline" className="h-[38px] flex-1 rounded-[5px] text-xs font-semibold"><Link href={`/slides/${s.id}`}><Pencil />Edit</Link></Button>
                <Button asChild className="h-[38px] flex-1 rounded-[5px] text-xs font-semibold"><Link href={`/present/${s.id}`}><Play />Tampilkan</Link></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {items && !items.length && !err && <div className="empty">Belum ada slideshow. Klik “Slideshow baru” untuk memulai.</div>}
      {items && !!items.length && !shown.length && <div className="empty">Tidak ada slideshow yang cocok dengan “{q}”.</div>}
    </div>
  );
}

export default List;
