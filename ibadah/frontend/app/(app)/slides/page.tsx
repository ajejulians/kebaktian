'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Play, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import SlideView from '@/components/SlideView';
import Notice from '@/components/Notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Slideshow, SlideshowSummary } from '@/lib/types';

function List() {
  const router = useRouter();
  const [items, setItems] = useState<SlideshowSummary[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

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

  return (
    <>
      <div className="page-head">
        <div><h1>Slideshow</h1><p>Susun urutan slide dan video untuk kebaktian.</p></div>
        <span className="spacer" />
        <Button variant="gold" onClick={create} disabled={busy}><Plus />Slideshow baru</Button>
      </div>
      <Notice msg={err ? { err } : null} />
      <div className="cards-grid">
        {!items && [0, 1, 2].map((n) => <Skeleton key={n} className="h-60" />)}
        {items?.map((s) => (
          <Card key={s.id} className="gap-0 overflow-hidden py-0 transition-colors hover:border-input">
            <SlideView slide={s.slides?.[0] ?? { type: 'text', title: s.title, body: '', url: '' }} />
            <CardContent className="flex-1 border-t pt-4 pb-3">
              <CardTitle className="font-serif text-lg">{s.title}</CardTitle>
              <CardDescription className="mt-1">{s.slides?.length ?? 0} slide · diubah {new Date(s.updated_at).toLocaleString('id-ID')} oleh {s.updated_by}</CardDescription>
            </CardContent>
            <CardFooter className="gap-2 pb-4">
              <Button asChild variant="outline" className="flex-1"><Link href={`/slides/${s.id}`}><Pencil />Edit</Link></Button>
              <Button asChild className="flex-1"><Link href={`/present/${s.id}`}><Play />Tampilkan</Link></Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      {items && !items.length && !err && <div className="empty">Belum ada slideshow. Klik “Slideshow baru” untuk memulai.</div>}
    </>
  );
}

export default List;
