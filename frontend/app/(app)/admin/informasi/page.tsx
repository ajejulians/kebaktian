'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { Announcement } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function Informasi() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [published, setPublished] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setItems(await api<Announcement[]>('/api/announcements?all=1')); } catch (e) { setMessage((e as Error).message); } }, []);
  useEffect(() => { void load(); }, [load]);
  function reset() { setEditing(null); setTitle(''); setBody(''); setPublished(false); }
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try { await api(editing ? `/api/announcements/${editing.id}` : '/api/announcements', { method: editing ? 'PUT' : 'POST', body: { title, body, published } }); reset(); await load(); setMessage('Informasi disimpan.'); }
    catch (err) { setMessage((err as Error).message); } finally { setBusy(false); }
  }
  async function remove(item: Announcement) {
    if (!confirm(`Hapus informasi ${item.title}?`)) return;
    try { await api(`/api/announcements/${item.id}`, { method: 'DELETE' }); if (editing?.id === item.id) reset(); await load(); setMessage('Informasi dihapus.'); } catch (err) { setMessage((err as Error).message); }
  }
  return <div className="flex flex-col gap-6"><PageHeader trail={['Administrasi', 'Informasi']} title="Kelola informasi" description="Buat dan terbitkan informasi untuk pengguna." />
    {message && <p role="status">{message}</p>}
    <Panel className="p-6"><form onSubmit={save} className="flex flex-col gap-4"><h2 className="font-bold">{editing ? 'Ubah informasi' : 'Informasi baru'}</h2>
      <label>Judul<Input value={title} onChange={e => setTitle(e.target.value)} required /></label>
      <label>Isi<Textarea value={body} onChange={e => setBody(e.target.value)} required /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} /> Terbitkan untuk pengguna</label>
      <div className="flex gap-2"><Button disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>{editing && <Button type="button" variant="outline" onClick={reset}>Batal</Button>}</div>
    </form></Panel>
    <Panel className="p-6"><h2 className="font-bold">Daftar informasi</h2>{!items.length && <p className="mt-3 text-sm">Belum ada informasi.</p>}{items.map(item => <article key={item.id} className="mt-4 border-t pt-4"><h3 className="font-semibold">{item.title} · {item.published ? 'Terbit' : 'Draf'}</h3><p className="my-2 whitespace-pre-wrap text-sm">{item.body}</p><div className="flex gap-2"><Button variant="outline" onClick={() => { setEditing(item); setTitle(item.title); setBody(item.body); setPublished(item.published); }}>Ubah</Button><Button variant="outline" onClick={() => remove(item)}>Hapus</Button></div></article>)}</Panel>
  </div>;
}
