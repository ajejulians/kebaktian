'use client';
import { use, useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Copy, ImageUp, Play, Plus, Trash2, X } from 'lucide-react';
import SlideView from '@/components/SlideView';
import AyatPicker from '@/components/AyatPicker';
import Notice from '@/components/Notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, uploadBackground, youtubeId } from '@/lib/api';
import { checkBackground, longDate, newSlide } from '@/lib/slides';
import type { Assignment, AyatSnap, Msg, Roster, Slide, SlideType, Slideshow } from '@/lib/types';

const TYPE_LABEL: Record<SlideType, string> = { text: 'Teks', youtube: 'YouTube', roster: 'Petugas', ayat: 'Ayat' };
const toRoster = (a: Assignment): Roster => ({ mc: a.mc, prayers: a.prayers, scripture: a.scripture, jiangdao: a.jiangdao });

function Editor({ id }: { id: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [sel, setSel] = useState(0);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [found, setFound] = useState<Assignment | null | undefined>(undefined); // undefined = sedang memuat
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Slideshow>(`/api/slideshows/${id}`)
      .then((d) => { setTitle(d.title); setSlides(d.slides); setLoaded(true); })
      .catch((e: Error) => setMsg({ err: e.message }));
  }, [id]);

  const cur: Slide | undefined = slides[sel];
  const rosterDate = cur?.type === 'roster' ? cur.date : undefined;

  // Tarik data petugas sesuai tanggal pada slide petugas yang sedang dipilih.
  useEffect(() => {
    if (!rosterDate) return;
    let alive = true;
    setFound(undefined);
    api<Assignment | null>(`/api/assignments?week=${rosterDate}`)
      .then((a) => alive && setFound(a))
      .catch(() => alive && setFound(null));
    return () => { alive = false; };
  }, [rosterDate]);

  const upd = (i: number, patch: Partial<Slide>) => setSlides((cs) => cs.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  // Slide baru disisipkan tepat setelah slide yang sedang dipilih (seperti Canva).
  const at = slides.length ? sel + 1 : 0;
  const add = (type: SlideType) => { setSlides([...slides.slice(0, at), newSlide(type), ...slides.slice(at)]); setSel(at); };
  const addAyat = (items: AyatSnap[]) => {
    const made: Slide[] = items.map((a) => ({ type: 'ayat', title: a.ref, body: '', url: '', ayat: a }));
    const keepBg = slides[sel]?.bg;
    setSlides([...slides.slice(0, at), ...made.map((m) => (keepBg ? { ...m, bg: keepBg } : m)), ...slides.slice(at)]);
    setSel(at);
    setPicker(false);
    setMsg({ ok: `${made.length} slide ayat ditambahkan` });
  };
  const dup = (i: number) => { setSlides([...slides.slice(0, i + 1), { ...slides[i] }, ...slides.slice(i + 1)]); setSel(i + 1); };
  const del = (i: number) => { setSlides(slides.filter((_, j) => j !== i)); setSel(Math.max(0, Math.min(sel, slides.length - 2))); };

  function drop(to: number) {
    if (drag === null || drag === to) return;
    const c = [...slides];
    const [m] = c.splice(drag, 1);
    c.splice(to, 0, m);
    setSlides(c);
    setSel(to);
  }

  async function pickBackground(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg(null);
    const bad = await checkBackground(file);
    if (bad) return setMsg({ err: bad });
    setUploading(true);
    try { upd(sel, { bg: await uploadBackground(file) }); }
    catch (err) { setMsg({ err: (err as Error).message }); }
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    try {
      await api(`/api/slideshows/${id}`, { method: 'PUT', body: { title, slides } });
      setMsg({ ok: 'Slideshow tersimpan' });
    } catch (e) { setMsg({ err: (e as Error).message }); }
    setSaving(false);
  }

  async function remove() {
    if (!confirm('Hapus slideshow ini?')) return;
    await api(`/api/slideshows/${id}`, { method: 'DELETE' });
    router.push('/slides');
  }

  const sameRoster = !!(found && cur?.roster && JSON.stringify(cur.roster) === JSON.stringify(toRoster(found)));

  return (
    <>
      <Button asChild variant="link" className="h-auto px-0 text-muted-foreground"><Link href="/slides"><ArrowLeft />Semua slideshow</Link></Button>
      <div className="page-head mt-2">
        <div className="field min-w-56 flex-1">
          <Label htmlFor="title" className="sr-only">Judul slideshow</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul slideshow"
            className="h-11 border-transparent bg-transparent px-2 font-serif text-2xl font-semibold shadow-none hover:border-input md:text-2xl" />
        </div>
        <Button variant="outline" onClick={() => add('text')}><Plus />Slide</Button>
        <Button variant="outline" onClick={() => setPicker(true)}><BookOpen />Ayat</Button>
        <Button asChild variant="outline"><Link href={`/present/${id}`}><Play />Tampilkan</Link></Button>
        <Button variant="gold" onClick={save} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
      </div>
      <Notice msg={msg} />

      <div className="editor">
        <div className="ed-main">
          {!loaded && <Skeleton className="aspect-video w-full" />}
          {loaded && !cur && <div className="empty">Belum ada slide. Tambahkan dari panel di sebelah kanan.</div>}
          {cur && <div className="canvas"><SlideView slide={cur} /></div>}
        </div>

        <div className="ed-props">
          {cur && (
            <Card>
              <CardContent className="stack">
                <div className="row">
                  <span className="slide-num">{sel + 1}</span>
                  <div className="seg" role="group" aria-label="Jenis slide">
                    {(Object.keys(TYPE_LABEL) as SlideType[]).map((t) => (
                      <button key={t} type="button" className={cur.type === t ? 'on' : ''} aria-pressed={cur.type === t}
                        onClick={() => upd(sel, t === 'roster' && !cur.date ? { type: t, date: newSlide('roster').date, title: cur.title || 'Petugas Kebaktian' } : { type: t })}>
                        {TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {cur.type === 'text' && (
                  <>
                    <div className="field"><Label htmlFor="s-title">Judul</Label><Input id="s-title" value={cur.title} onChange={(e) => upd(sel, { title: e.target.value })} /></div>
                    <div className="field"><Label htmlFor="s-body">Isi</Label><Textarea id="s-body" className="min-h-28" value={cur.body} onChange={(e) => upd(sel, { body: e.target.value })} /></div>
                  </>
                )}

                {cur.type === 'youtube' && (
                  <div className="field">
                    <Label htmlFor="s-url">Link YouTube</Label>
                    <Input id="s-url" value={cur.url} onChange={(e) => upd(sel, { url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..."
                      aria-invalid={!!cur.url && !youtubeId(cur.url)} />
                    {cur.url && !youtubeId(cur.url) && <p className="text-sm text-destructive">Link YouTube tidak dikenali</p>}
                  </div>
                )}

                {cur.type === 'ayat' && (
                  <>
                    <div className="flex items-center gap-3 rounded-md bg-gold-soft px-3 py-2 text-sm text-gold-ink">
                      <span className="flex-1 font-medium">{cur.ayat?.ref ?? 'Ayat belum dipilih'}</span>
                      <Button variant="outline" size="sm" onClick={() => setPicker(true)}>Tambah ayat lain</Button>
                    </div>
                    {cur.ayat && (
                      <>
                        <div className="field"><Label htmlFor="a-hz">Hanzi</Label>
                          <Textarea id="a-hz" className="min-h-18" value={cur.ayat.hanzi} onChange={(e) => upd(sel, { ayat: { ...cur.ayat!, hanzi: e.target.value } })} /></div>
                        <div className="field"><Label htmlFor="a-py">Pinyin</Label>
                          <Textarea id="a-py" className="min-h-15" value={cur.ayat.pinyin} onChange={(e) => upd(sel, { ayat: { ...cur.ayat!, pinyin: e.target.value } })} /></div>
                        <div className="field"><Label htmlFor="a-tr">Terjemahan</Label>
                          <Textarea id="a-tr" className="min-h-24" value={cur.ayat.terjemahan} onChange={(e) => upd(sel, { ayat: { ...cur.ayat!, terjemahan: e.target.value } })} /></div>
                      </>
                    )}
                  </>
                )}

                {cur.type === 'roster' && (
                  <>
                    <div className="grid2">
                      <div className="field"><Label htmlFor="r-title">Judul slide</Label><Input id="r-title" value={cur.title} onChange={(e) => upd(sel, { title: e.target.value })} /></div>
                      <div className="field"><Label htmlFor="r-date">Tanggal kebaktian</Label><Input id="r-date" type="date" value={cur.date || ''} onChange={(e) => upd(sel, { date: e.target.value, roster: null })} /></div>
                    </div>
                    {found === undefined && <p className="muted">Mencari data petugas…</p>}
                    {found && (
                      <Alert variant="success">
                        <AlertDescription>
                          <span>Data petugas untuk {longDate(found.week_date)} ditemukan (diisi oleh {found.created_by}).</span>
                          <Button variant="gold" size="sm" className="mt-1" disabled={sameRoster} onClick={() => upd(sel, { roster: toRoster(found) })}>
                            {sameRoster ? 'Data sudah dipakai' : cur.roster ? 'Perbarui dari data petugas' : 'Gunakan data petugas'}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                    {found === null && cur.date && (
                      <Alert variant="destructive"><AlertDescription><span>Belum ada data petugas untuk {longDate(cur.date)}. <Link href="/petugas" className="underline">Isi di halaman Petugas</Link>, lalu kembali dan pilih ulang tanggalnya.</span></AlertDescription></Alert>
                    )}
                  </>
                )}

                {cur.type !== 'youtube' && (
                  <div className="field">
                    <Label>Latar belakang</Label>
                    <div className="dropzone stack gap-3">
                      <div className="row gap-2">
                        <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                          <ImageUp />{uploading ? 'Mengunggah…' : cur.bg ? 'Ganti gambar' : 'Unggah gambar'}
                        </Button>
                        {cur.bg && <Button variant="ghost" size="sm" onClick={() => upd(sel, { bg: undefined })}><X />Hapus</Button>}
                        {cur.bg && slides.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => setSlides(slides.map((s) => (s.type === 'youtube' ? s : { ...s, bg: cur.bg })))}>Terapkan ke semua</Button>
                        )}
                      </div>
                      <div className="seg self-start" role="group" aria-label="Warna teks">
                        <button type="button" className={cur.tone !== 'dark' ? 'on' : ''} aria-pressed={cur.tone !== 'dark'} onClick={() => upd(sel, { tone: 'light' })}>Teks terang</button>
                        <button type="button" className={cur.tone === 'dark' ? 'on' : ''} aria-pressed={cur.tone === 'dark'} onClick={() => upd(sel, { tone: 'dark' })}>Teks gelap</button>
                      </div>
                      <p className="m-0 text-xs">PNG atau JPEG, rasio 16:9 (mis. 1920×1080), minimal 1280×720, maksimal 5 MB.</p>
                      <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={pickBackground} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="thumbs">
          <strong className="px-1 text-sm">Slide ({slides.length})</strong>
          {slides.map((s, i) => (
            <div key={i} draggable className={'thumb' + (i === sel ? ' sel' : '') + (i === drag ? ' drag' : '') + (i === over && drag !== null && drag !== i ? ' over' : '')}
              onClick={() => setSel(i)}
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => { e.preventDefault(); setOver(i); }}
              onDrop={(e) => { e.preventDefault(); drop(i); setDrag(null); setOver(null); }}
              onDragEnd={() => { setDrag(null); setOver(null); }}>
              <span className="n">{i + 1}</span>
              <div className="box"><SlideView slide={s} /></div>
              <div className="acts">
                <Button variant="secondary" size="icon-xs" title="Duplikat" aria-label="Duplikat slide" onClick={(e) => { e.stopPropagation(); dup(i); }}><Copy /></Button>
                <Button variant="destructive" size="icon-xs" title="Hapus" aria-label="Hapus slide" onClick={(e) => { e.stopPropagation(); del(i); }}><Trash2 /></Button>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-1.5">
            <Button variant="outline" size="xs" onClick={() => add('text')}>+ Teks</Button>
            <Button variant="outline" size="xs" onClick={() => add('youtube')}>+ Video</Button>
            <Button variant="outline" size="xs" onClick={() => add('roster')}>+ Petugas</Button>
            <Button variant="outline" size="xs" onClick={() => setPicker(true)}>+ Ayat</Button>
          </div>
          <p className="muted m-0 px-1 text-xs">Seret thumbnail untuk mengubah urutan.</p>
        </aside>
      </div>

      {picker && <AyatPicker onAdd={addAyat} onClose={() => setPicker(false)} />}

      <div className="row mt-6">
        <span className="spacer" />
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={remove}><Trash2 />Hapus slideshow</Button>
      </div>
    </>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = use(params); return <Editor id={id} />; }
