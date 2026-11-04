'use client';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CalendarDays, Info, Save } from 'lucide-react';
import { api } from '@/lib/api';
import SlideView from '@/components/SlideView';
import Notice from '@/components/Notice';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { IconInput } from '@/components/ui/icon-input';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
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
  const dateRef = useRef<HTMLInputElement>(null);

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

  const baseline: FormState = saved ? { mc: saved.mc, prayers: saved.prayers, scripture: saved.scripture, jiangdao: saved.jiangdao } : empty;
  const dirty = JSON.stringify(f) !== JSON.stringify(baseline);

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        trail={['Ibadah', 'Petugas']}
        title="Petugas Kebaktian"
        description="Atur petugas pelayanan untuk setiap jadwal kebaktian."
      />

      <div className="grid items-start gap-6 min-[1180px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Card className="gap-0 py-7 shadow-none">
          <CardContent className="px-5 sm:px-7">
            <form onSubmit={save} className="flex flex-col gap-[22px]">
              <div className="flex flex-col gap-[7px]">
                <h2 className="m-0 text-[17px] leading-snug font-bold">Data petugas</h2>
                <p className="text-[13px] text-muted-foreground">Pilih tanggal, lalu isi nama petugas sesuai perannya.</p>
              </div>

              <Field label="Tanggal kebaktian" htmlFor="week" hint={longDate(week)}>
                <IconInput
                  ref={dateRef} id="week" type="date" fieldSize="md" value={week} required
                  onChange={(e) => setWeek(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:hidden"
                  trailing={
                    <button
                      type="button" aria-label="Buka kalender"
                      onClick={() => { try { dateRef.current?.showPicker(); } catch { dateRef.current?.focus(); } }}
                      className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CalendarDays aria-hidden className="size-4" />
                    </button>
                  }
                />
              </Field>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pembawa Acara" htmlFor="mc">
                  <Input id="mc" fieldSize="md" value={f.mc} onChange={set('mc')} placeholder="Masukkan nama petugas" required />
                </Field>
                <Field label="Jiang Dao (Pengkhotbah)" htmlFor="jd">
                  <Input id="jd" fieldSize="md" value={f.jiangdao} onChange={set('jiangdao')} placeholder="Masukkan nama petugas" required />
                </Field>
              </div>
              <Field label="Pembaca Ayat Suci" htmlFor="sc">
                <Input id="sc" fieldSize="md" value={f.scripture} onChange={set('scripture')} placeholder="Masukkan nama petugas" required />
              </Field>

              <fieldset className="m-0 flex min-w-0 flex-col gap-[22px] border-0 p-0">
                <legend className="sr-only">Petugas doa</legend>
                <div className="flex flex-col gap-1.5" aria-hidden>
                  <span className="text-sm font-bold text-foreground">Petugas doa</span>
                  <span className="text-xs text-muted-foreground">Isi nama petugas untuk setiap sesi doa.</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {f.prayers.map((p, i) => (
                    <Field key={i} label={`Doa ${i + 1}`} htmlFor={`doa${i}`}>
                      <Input id={`doa${i}`} fieldSize="md" value={p} onChange={setPrayer(i)} placeholder="Masukkan nama" required />
                    </Field>
                  ))}
                </div>
              </fieldset>

              <Notice msg={msg} className="my-0" />
              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {dirty ? 'Perubahan belum disimpan' : saved ? `Tersimpan oleh ${saved.created_by}` : 'Belum ada data tersimpan'}
                </p>
                <Button size="md" disabled={busy} className="max-sm:w-full"><Save />{busy ? 'Menyimpan…' : 'Simpan petugas'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-[18px] min-[1180px]:sticky min-[1180px]:top-6">
          <Card className="gap-3 py-5 shadow-none">
            <CardContent className="flex flex-col gap-3 px-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 text-[13px] font-bold">Status pengisian</h2>
                {saved
                  ? <Badge variant="ok" className="rounded-[5px] px-[9px] py-1.5 text-[11px] font-semibold">Terisi</Badge>
                  : <Badge variant="warn" className="rounded-[5px] px-[9px] py-1.5 text-[11px] font-semibold">Belum diisi</Badge>}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {saved
                  ? <>Terakhir disimpan oleh <strong className="text-foreground">{saved.created_by}</strong>. Setiap simpan membuat versi baru; riwayat dicatat di log audit.</>
                  : <>Belum ada data petugas untuk tanggal ini. Isi formulir dan simpan untuk digunakan di slideshow.</>}
              </p>
            </CardContent>
          </Card>

          <Card className="gap-4 py-5 shadow-none">
            <CardContent className="flex flex-col gap-4 px-5">
              <div className="flex flex-col gap-1.5">
                <h2 className="m-0 text-sm font-bold">Pratinjau slide</h2>
                <p className="text-xs text-muted-foreground">Tampilan petugas di slideshow kebaktian.</p>
              </div>
              <div className="overflow-hidden rounded-md ring-1 ring-input">
                <SlideView slide={{ type: 'roster', title: 'Petugas Kebaktian', body: '', url: '', date: week, roster: f }} />
              </div>
            </CardContent>
          </Card>

          <p className="flex gap-2.5 p-0.5 text-xs leading-normal text-muted-foreground">
            <Info aria-hidden className="mt-px size-4 shrink-0" />
            Data yang tersimpan dapat ditampilkan melalui slide “Petugas”.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default Form;
