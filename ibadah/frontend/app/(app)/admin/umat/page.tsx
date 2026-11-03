'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';
import { FileUp, Search } from 'lucide-react';
import { api } from '@/lib/api';
import Notice from '@/components/Notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <>
      <div className="page-head">
        <div><h1>Data Umat</h1><p>Kelola daftar umat yang dipakai untuk absensi mingguan.</p></div>
        <span className="spacer" />
        {list && <Badge variant="ok">{aktifCount} aktif</Badge>}
      </div>
      <Notice msg={msg} />

      <div className="split">
        <div>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="bg-card pl-9" placeholder="Cari nama, telepon, atau alamat…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {!list && [0, 1, 2, 3].map((n) => <Skeleton key={n} className="mb-2 h-12" />)}
          {list && !list.length && <div className="empty">Belum ada umat. Tambahkan manual atau impor dari Excel/CSV.</div>}
          {!!shown.length && (
            <Card className="py-0">
              <Table>
                <TableHeader><TableRow><TableHead className="pl-5">Nama</TableHead><TableHead>Telepon</TableHead><TableHead>Alamat</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {shown.map((u) => (
                    <TableRow key={u.id} className={u.aktif ? '' : 'opacity-55'}>
                      <TableCell className="pl-5"><strong>{u.nama}</strong> {!u.aktif && <Badge variant="secondary">nonaktif</Badge>}</TableCell>
                      <TableCell className="tabular-nums">{u.telepon || '—'}</TableCell>
                      <TableCell className="max-w-64 truncate">{u.alamat || '—'}</TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditId(u.id); setF({ nama: u.nama, telepon: u.telepon ?? '', alamat: u.alamat ?? '' }); setMsg(null); }}>Edit</Button>
                        {u.aktif
                          ? <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setAktif(u, false)}>Nonaktifkan</Button>
                          : <Button variant="ghost" size="sm" onClick={() => setAktif(u, true)}>Aktifkan</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
          {list && !!list.length && !shown.length && <div className="empty">Tidak ada yang cocok.</div>}
        </div>

        <aside className="side-col gap-4">
          <Card>
            <CardHeader><CardTitle>{editId ? 'Edit umat' : 'Tambah umat'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={save} className="stack">
                <div className="field"><Label htmlFor="u-nama">Nama umat <span className="text-destructive">*</span></Label>
                  <Input id="u-nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} required /></div>
                <div className="field"><Label htmlFor="u-tel">Nomor telepon <span className="font-normal text-muted-foreground">(opsional)</span></Label>
                  <Input id="u-tel" value={f.telepon} onChange={(e) => setF({ ...f, telepon: e.target.value })} inputMode="tel" placeholder="08xxxxxxxxxx" /></div>
                <div className="field"><Label htmlFor="u-alamat">Alamat <span className="font-normal text-muted-foreground">(opsional)</span></Label>
                  <Textarea id="u-alamat" className="min-h-18" value={f.alamat} onChange={(e) => setF({ ...f, alamat: e.target.value })} /></div>
                <div className="row">
                  <Button variant="gold">{editId ? 'Simpan perubahan' : 'Tambah umat'}</Button>
                  {editId && <Button type="button" variant="outline" onClick={() => { setEditId(null); setF(empty); }}>Batal</Button>}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Impor Excel / CSV</CardTitle>
              <CardDescription>
                Baris pertama berisi header <strong>Nama</strong>, <strong>Telepon</strong>, <strong>Alamat</strong> (urutan bebas; hanya Nama yang wajib).
                Duplikat (nama + telepon sama) dilewati. <a href={template} download="template-umat.csv">Unduh template</a>
              </CardDescription>
            </CardHeader>
            <CardContent className="stack">
              <input ref={fileRef} type="file" accept=".xlsx,.csv,text/csv" hidden onChange={(e) => pick(e.target.files?.[0])} />
              <div><Button variant="outline" onClick={() => fileRef.current?.click()}><FileUp />Pilih file…</Button></div>

              {preview && (
                <div className="stack gap-3">
                  <Alert variant="success"><AlertDescription><span><strong>{fileName}</strong>: {preview.length} baris siap diimpor.</span></AlertDescription></Alert>
                  <div className="rounded-md border">
                    <Table className="text-xs">
                      <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Telepon</TableHead><TableHead>Alamat</TableHead></TableRow></TableHeader>
                      <TableBody>{preview.slice(0, 5).map((r, i) => <TableRow key={i}><TableCell>{r.nama || <em className="text-destructive">kosong</em>}</TableCell><TableCell>{r.telepon}</TableCell><TableCell className="max-w-32 truncate">{r.alamat}</TableCell></TableRow>)}</TableBody>
                    </Table>
                  </div>
                  {preview.length > 5 && <p className="muted">…dan {preview.length - 5} baris lainnya</p>}
                  <div className="row">
                    <Button variant="gold" disabled={busy || !preview.length} onClick={doImport}>{busy ? 'Mengimpor…' : `Impor ${preview.length} umat`}</Button>
                    <Button variant="outline" onClick={() => setPreview(null)}>Batal</Button>
                  </div>
                </div>
              )}

              {result && (
                <div>
                  <Alert variant="success"><AlertDescription><span>Berhasil menambah <strong>{result.created}</strong> umat. {result.duplicates > 0 && <>{result.duplicates} duplikat dilewati. </>}{result.invalid.length > 0 && <>{result.invalid.length} baris ditolak.</>}</span></AlertDescription></Alert>
                  {result.invalid.slice(0, 10).map((x) => <p key={x.baris} className="muted mt-1">Baris {x.baris}: {x.alasan}</p>)}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

export default Page;
