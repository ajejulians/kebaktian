'use client';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '@/lib/api';
import SlideView from '@/components/SlideView';
import Notice from '@/components/Notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { longDate, nextSunday } from '@/lib/slides';
import type { Assignment, Msg } from '@/lib/types';

interface FormState { mc: string; prayers: string[]; scripture: string; jiangdao: string }
const empty: FormState = { mc: '', prayers: ['', '', ''], scripture: '', jiangdao: '' };

function Form() {
  const [week, setWeek] = useState(nextSunday());
  const [f, setF] = useState<FormState>(empty);
  const [saved, setSaved] = useState<Assignment | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMsg(null);
    api<Assignment | null>(`/api/assignments?week=${week}`)
      .then((d) => {
        setSaved(d);
        setF(d ? { mc: d.mc, prayers: d.prayers, scripture: d.scripture, jiangdao: d.jiangdao } : empty);
      })
      .catch((e: Error) => setMsg({ err: e.message }));
  }, [week]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      setSaved(await api<Assignment>('/api/assignments', { method: 'PUT', body: { week_date: week, ...f } }));
      setMsg({ ok: 'Petugas tersimpan' });
    } catch (e2) { setMsg({ err: (e2 as Error).message }); }
    setBusy(false);
  }

  const set = (k: 'mc' | 'scripture' | 'jiangdao') => (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const setPrayer = (i: number) => (e: ChangeEvent<HTMLInputElement>) => setF({ ...f, prayers: f.prayers.map((p, j) => (j === i ? e.target.value : p)) });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Petugas Kebaktian</h1>
          <p>{longDate(week)}</p>
        </div>
        <span className="spacer" />
        {saved ? <Badge variant="ok">Terisi · oleh {saved.created_by}</Badge> : <Badge variant="warn">Belum diisi</Badge>}
      </div>

      <div className="split">
        <Card>
          <CardContent>
            <form onSubmit={save} className="stack">
              <div className="field max-w-60">
                <Label htmlFor="week">Tanggal kebaktian</Label>
                <Input id="week" type="date" value={week} onChange={(e) => setWeek(e.target.value)} required />
              </div>
              <div className="grid2">
                <div className="field"><Label htmlFor="mc">Pembawa Acara</Label><Input id="mc" value={f.mc} onChange={set('mc')} required /></div>
                <div className="field"><Label htmlFor="jd">Jiang Dao (Pengkhotbah)</Label><Input id="jd" value={f.jiangdao} onChange={set('jiangdao')} required /></div>
              </div>
              <div className="field"><Label htmlFor="sc">Pembaca Ayat Suci</Label><Input id="sc" value={f.scripture} onChange={set('scripture')} required /></div>

              <fieldset>
                <legend>Petugas Doa</legend>
                <div className="grid3">
                  {f.prayers.map((p, i) => (
                    <div key={i} className="field"><Label htmlFor={`doa${i}`}>Doa {i + 1}</Label><Input id={`doa${i}`} value={p} onChange={setPrayer(i)} required /></div>
                  ))}
                </div>
              </fieldset>

              <Notice msg={msg} className="my-0" />
              <div><Button variant="gold" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan petugas'}</Button></div>
            </form>
          </CardContent>
        </Card>

        <aside className="side-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Pratinjau slide</CardTitle>
              <CardDescription>Beginilah daftar petugas tampil di slideshow.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md ring-1 ring-input">
                <SlideView slide={{ type: 'roster', title: 'Petugas Kebaktian', body: '', url: '', date: week, roster: f }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>
                {saved
                  ? <>Terakhir disimpan oleh <strong className="text-foreground">{saved.created_by}</strong>. Setiap simpan membuat versi baru; riwayat dicatat di log audit.</>
                  : <>Belum ada data untuk tanggal ini. Isi formulir lalu simpan, kemudian gunakan di slideshow lewat slide “Petugas”.</>}
              </CardDescription>
            </CardHeader>
          </Card>
        </aside>
      </div>
    </>
  );
}

export default Form;
