'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';
import { Pencil, Plus, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import Notice from '@/components/Notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/PageHeader';
import { Avatar, CountChip, Hint, Panel, PanelFooter, PanelHeader, SearchField, StatusPill } from '@/components/Panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ImportResult, ImportRow, Msg, Umat } from '@/lib/types';

const HEAD: Record<string, keyof ImportRow> = {
  nama: 'nama', 'nama umat': 'nama', name: 'nama',
  telepon: 'telepon', 'nomor telepon': 'telepon', 'no telepon': 'telepon', 'no. telepon': 'telepon', 'no hp': 'telepon', hp: 'telepon', phone: 'telepon', telp: 'telepon',
  alamat: 'alamat', address: 'alamat',
};

// Baris pertama dianggap header; kolom dikenali dari namanya, urutan bebas.
function toRows(grid: unknown[][]): ImportRow[] {
  const header = (grid[0] ?? []).map((h) => HEAD[String(h ?? '').trim().toLowerCase()]);
  if (!header.includes('nama')) throw new Error('Kolom "Nama" tidak ditemukan di baris pertama. Pakai header: Nama, Telepon, Alamat.');
  return grid.slice(1)
    .filter((r) => r.some((c) => String(c ?? '').trim()))
    .map((r) => {
      const o: ImportRow = { nama: '', telepon: '', alamat: '' };
      header.forEach((k, i) => { if (k) o[k] = String(r[i] ?? '').trim(); });
      return o;
    });
}

async function parseFile(file: File): Promise<ImportRow[]> {
  if (/\.xlsx$/i.test(file.name)) return toRows((await readSheet(file)) as unknown[][]);
  if (/\.(csv|txt)$/i.test(file.name)) {
    const res = Papa.parse<string[]>(await file.text(), { skipEmptyLines: true });
    return toRows(res.data);
  }
  throw new Error('Format harus .xlsx atau .csv');
}

const empty = { nama: '', telepon: '', alamat: '' };

function Page() {
  const [list, setList] = useState<Umat[] | null>(null);
  const [q, setQ] = useState('');
  const [f, setF] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [preview, setPreview] = useState<ImportRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const goForm = () => { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => document.getElementById('u-nama')?.focus({ preventScroll: true }), 300); };

  const load = useCallback(() => api<Umat[]>('/api/umat?all=1').then(setList).catch((e: Error) => { setList([]); setMsg({ err: e.message }); }), []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list ?? []).filter((u) => !t || u.nama.toLowerCase().includes(t) || (u.telepon ?? '').includes(t) || (u.alamat ?? '').toLowerCase().includes(t));
  }, [list, q]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      if (editId) await api(`/api/umat/${editId}`, { method: 'PATCH', body: f });
      else await api('/api/umat', { method: 'POST', body: f });
      setMsg({ ok: editId ? 'Data umat diperbarui' : 'Umat ditambahkan' });
      setF(empty); setEditId(null); load();
    } catch (e2) { setMsg({ err: (e2 as Error).message }); }
  }

  async function setAktif(u: Umat, aktif: boolean) {
    if (!aktif && !confirm(`Nonaktifkan ${u.nama}? Riwayat absensinya tetap tersimpan.`)) return;
    try { await api(`/api/umat/${u.id}`, { method: 'PATCH', body: { aktif } }); load(); } catch (e) { setMsg({ err: (e as Error).message }); }
  }

  async function pick(file?: File) {
    setResult(null); setPreview(null); setMsg(null);
    if (!file) return;
    setFileName(file.name);
    try { setPreview(await parseFile(file)); } catch (e) { setMsg({ err: (e as Error).message }); }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function doImport() {
    if (!preview) return;
    setBusy(true);
    try {
      setResult(await api<ImportResult>('/api/umat/import', { method: 'POST', body: { rows: preview } }));
      setPreview(null); load();
    } catch (e) { setMsg({ err: (e as Error).message }); }
    setBusy(false);
  }

  const aktifCount = list?.filter((u) => u.aktif).length ?? 0;
  const template = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿Nama,Telepon,Alamat\nBudi Santoso,081234567890,Jl. Merdeka No. 1\n');

  const COLS = 'md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_96px_auto]';
  const mini = 'h-[34px] rounded-[5px] px-2.5 text-[11px]';

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        trail={['Administrasi', 'Umat']}
        title="Data Umat"
        description="Kelola data umat yang terdaftar untuk kebutuhan pelayanan."
        actions={<Button size="md" onClick={() => { setEditId(null); setF(empty); goForm(); }}><Plus />Tambah umat</Button>}
      />
      <Notice msg={msg} className="my-0" />

      <Panel>
        <PanelHeader title="Daftar umat" description="Kelola daftar umat yang dipakai untuk absensi mingguan." aside={list && <CountChip>{aktifCount} aktif · {list.length} umat</CountChip>}>
          <SearchField className="w-full sm:w-[400px]" aria-label="Cari umat" placeholder="Cari nama, telepon, atau alamat…" value={q} onChange={(e) => setQ(e.target.value)} />
        </PanelHeader>

        <div className={`hidden gap-5 border-t bg-[#F8FAFA] px-6 py-3.5 text-[10px] font-bold tracking-[0.08em] text-[#7A8B96] md:grid ${COLS}`}>
          <span>NAMA UMAT</span><span>NOMOR TELEPON</span><span>ALAMAT</span><span>STATUS</span><span className="w-[170px] text-right">AKSI</span>
        </div>
        {!list && [0, 1, 2, 3].map((n) => <div key={n} className="border-t px-6 py-4"><Skeleton className="h-10" /></div>)}
        {list && !list.length && <div className="border-t p-6"><div className="empty">Belum ada umat. Tambahkan manual atau impor dari Excel/CSV.</div></div>}
        {shown.map((u) => (
          <div key={u.id} className={`grid items-center gap-x-5 gap-y-2 border-t px-5 py-4 sm:px-6 ${COLS} ${u.aktif ? '' : 'opacity-60'}`}>
            <div className="flex min-w-0 items-center gap-3"><Avatar name={u.nama} className="size-9 text-[13px]" /><strong className="truncate text-[13px] font-semibold">{u.nama}</strong></div>
            <span className="truncate text-xs text-[#4F6573] tabular-nums"><span className="text-muted-foreground md:hidden">Telepon: </span>{u.telepon || '—'}</span>
            <span className="truncate text-xs text-[#4F6573]"><span className="text-muted-foreground md:hidden">Alamat: </span>{u.alamat || '—'}</span>
            <span><StatusPill tone={u.aktif ? 'ok' : 'muted'}>{u.aktif ? 'Aktif' : 'Nonaktif'}</StatusPill></span>
            <div className="flex gap-1.5 md:justify-end">
              <Button variant="outline" size="sm" className={mini} onClick={() => { setEditId(u.id); setF({ nama: u.nama, telepon: u.telepon ?? '', alamat: u.alamat ?? '' }); setMsg(null); goForm(); }}><Pencil className="size-[13px]" />Edit</Button>
              {u.aktif
                ? <Button variant="ghost" size="sm" className={`${mini} text-[#A84C47] hover:bg-[#FBEDEA] hover:text-[#A84C47]`} onClick={() => setAktif(u, false)}>Nonaktifkan</Button>
                : <Button variant="ghost" size="sm" className={mini} onClick={() => setAktif(u, true)}>Aktifkan</Button>}
            </div>
          </div>
        ))}
        {list && !!list.length && !shown.length && <div className="border-t p-6"><div className="empty">Tidak ada yang cocok.</div></div>}
        <PanelFooter><span>Menampilkan {shown.length} dari {list?.length ?? 0} umat</span></PanelFooter>
      </Panel>

      <Hint>Data umat digunakan untuk pencatatan kehadiran kebaktian.</Hint>

      <div ref={formRef} className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_350px]">
        <Panel className="p-[22px]">
          <form onSubmit={save} className="flex flex-col gap-3.5">
            <h2 className="m-0 text-[15px] font-bold">{editId ? 'Edit umat' : 'Tambah umat'}</h2>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Nama umat *" htmlFor="u-nama"><Input id="u-nama" fieldSize="md" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} placeholder="Masukkan nama" required /></Field>
              <Field label="Nomor telepon (opsional)" htmlFor="u-tel"><Input id="u-tel" fieldSize="md" value={f.telepon} onChange={(e) => setF({ ...f, telepon: e.target.value })} inputMode="tel" placeholder="08xxxxxxxxxx" /></Field>
            </div>
            <Field label="Alamat (opsional)" htmlFor="u-alamat"><Textarea id="u-alamat" className="min-h-14" value={f.alamat} onChange={(e) => setF({ ...f, alamat: e.target.value })} placeholder="Masukkan alamat" /></Field>
            <div className="flex flex-wrap gap-2.5">
              <Button size="md">{editId ? 'Simpan perubahan' : 'Tambah umat'}</Button>
              {editId && <Button type="button" variant="outline" size="md" onClick={() => { setEditId(null); setF(empty); }}>Batal</Button>}
            </div>
          </form>
        </Panel>

        <Panel className="flex flex-col gap-3 p-[22px]">
          <h2 className="m-0 text-[15px] font-bold">Impor Excel / CSV</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">Gunakan kolom Nama, Telepon, Alamat. Hanya Nama yang wajib; duplikat nama dan telepon dilewati.</p>
          <a href={template} download="template-umat.csv" className="w-fit text-xs font-semibold">Unduh template</a>
          <input ref={fileRef} type="file" accept=".xlsx,.csv,text/csv" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <Button variant="outline" size="md" className="w-fit" onClick={() => fileRef.current?.click()}><Upload />Pilih file</Button>

          {preview && (
            <div className="flex flex-col gap-3">
              <Alert variant="success"><AlertDescription><span><strong>{fileName}</strong>: {preview.length} baris siap diimpor.</span></AlertDescription></Alert>
              <div className="rounded-md border">
                <Table className="text-xs">
                  <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Telepon</TableHead><TableHead>Alamat</TableHead></TableRow></TableHeader>
                  <TableBody>{preview.slice(0, 5).map((r, i) => <TableRow key={i}><TableCell>{r.nama || <em className="text-destructive">kosong</em>}</TableCell><TableCell>{r.telepon}</TableCell><TableCell className="max-w-32 truncate">{r.alamat}</TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
              {preview.length > 5 && <p className="text-xs text-muted-foreground">…dan {preview.length - 5} baris lainnya</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="md" disabled={busy || !preview.length} onClick={doImport}>{busy ? 'Mengimpor…' : `Impor ${preview.length} umat`}</Button>
                <Button variant="outline" size="md" onClick={() => setPreview(null)}>Batal</Button>
              </div>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-1">
              <Alert variant="success"><AlertDescription><span>Berhasil menambah <strong>{result.created}</strong> umat. {result.duplicates > 0 && <>{result.duplicates} duplikat dilewati. </>}{result.invalid.length > 0 && <>{result.invalid.length} baris ditolak.</>}</span></AlertDescription></Alert>
              {result.invalid.slice(0, 10).map((x) => <p key={x.baris} className="text-xs text-muted-foreground">Baris {x.baris}: {x.alasan}</p>)}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default Page;
