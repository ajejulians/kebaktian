'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import Notice from '@/components/Notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Msg, Profile, Status, UserDetail } from '@/lib/types';

const STATUS: Record<Status, [string, 'warn' | 'ok' | 'bad']> = { pending: ['Menunggu', 'warn'], active: ['Aktif', 'ok'], blocked: ['Diblokir', 'bad'] };
const fmt = (d: string) => new Date(d).toLocaleString('id-ID');

function RoleSelect(props: { name?: string; value?: string; defaultValue?: string; disabled?: boolean; onValueChange?: (v: string) => void; id?: string }) {
  const { id, ...rest } = props;
  return (
    <Select {...rest}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="user">user</SelectItem>
        <SelectItem value="admin">admin</SelectItem>
      </SelectContent>
    </Select>
  );
}

function Users() {
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);

  const load = useCallback(() => api<Profile[]>('/api/users').then(setUsers).catch((e: Error) => { setUsers([]); setMsg({ err: e.message }); }), []);
  useEffect(() => { load(); }, [load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); setMsg({ ok }); load(); } catch (e) { setMsg({ err: (e as Error).message }); }
  }
  const patch = (u: Profile, body: object, ok: string) => run(() => api(`/api/users/${u.id}`, { method: 'PATCH', body }), ok);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    await run(() => api('/api/users', { method: 'POST', body }), 'User ditambahkan');
    form.reset();
  }

  async function view(u: Profile) { setDetail(await api<UserDetail>(`/api/users/${u.id}`)); }
  const pending = users?.filter((u) => u.status === 'pending').length || 0;

  return (
    <>
      <div className="page-head">
        <div><h1>Manajemen User</h1><p>Setujui pendaftaran, blokir akun, dan tambah user.</p></div>
        <span className="spacer" />
        {pending > 0 && <Badge variant="warn">{pending} menunggu persetujuan</Badge>}
      </div>
      <Notice msg={msg} />

      <div className="split">
        <div>
          {!users && [0, 1, 2].map((n) => <Skeleton key={n} className="mb-2 h-16" />)}
          {!!users?.length && (
            <Card className="gap-0 py-0">
              {users.map((u) => (
                <div key={u.id} className="row border-b px-5 py-3 last:border-b-0">
                  <span className="avatar">{u.name.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-44 flex-1">
                    <div className="flex items-center gap-2"><strong>{u.name}</strong>{u.role === 'admin' && <Badge variant="gold">admin</Badge>}</div>
                    <div className="muted">{u.email}</div>
                  </div>
                  <Badge variant={STATUS[u.status][1]}>{STATUS[u.status][0]}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => view(u)}>Info</Button>
                  {u.status === 'pending' && <>
                    <Button size="sm" onClick={() => patch(u, { status: 'active' }, 'User disetujui')}>Setujui</Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => confirm(`Tolak pendaftaran ${u.email}?`) && run(() => api(`/api/users/${u.id}`, { method: 'DELETE' }), 'Pendaftaran ditolak')}>Tolak</Button>
                  </>}
                  {u.status === 'active' && <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => confirm(`Blokir ${u.email}?`) && patch(u, { status: 'blocked' }, 'User diblokir')}>Blokir</Button>}
                  {u.status === 'blocked' && <Button size="sm" variant="outline" onClick={() => patch(u, { status: 'active' }, 'Blokir dibuka')}>Buka blokir</Button>}
                </div>
              ))}
            </Card>
          )}
          {users && !users.length && <div className="empty">Belum ada user.</div>}
        </div>

        <aside className="side-col gap-4">
          {detail && (
            <Card className="border-gold">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="avatar">{detail.name.slice(0, 1).toUpperCase()}</span>
                  <div><CardTitle>{detail.name}</CardTitle><CardDescription>{detail.email}</CardDescription></div>
                </div>
                <CardAction><Button variant="ghost" size="icon-sm" aria-label="Tutup" onClick={() => setDetail(null)}><X /></Button></CardAction>
              </CardHeader>
              <CardContent className="stack">
                <p className="muted">Terdaftar {fmt(detail.created_at)} · Login terakhir {detail.last_sign_in_at ? fmt(detail.last_sign_in_at) : 'belum pernah'}</p>
                <div className="field max-w-40">
                  <Label htmlFor="detail-role">Role</Label>
                  <RoleSelect id="detail-role" value={detail.role} disabled={detail.status === 'pending'}
                    onValueChange={(v) => patch(detail, { role: v }, 'Role diubah').then(() => view(detail))} />
                </div>
                <Separator />
                <div>
                  <strong className="text-sm">Aktivitas terakhir</strong>
                  {detail.activity.map((a) => <div key={a.id} className="muted">{fmt(a.at)} · {a.action} {a.entity}</div>)}
                  {!detail.activity.length && <div className="muted">Belum ada aktivitas.</div>}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tambah user</CardTitle>
              <CardDescription>User yang ditambahkan admin langsung aktif.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={add} className="stack">
                <div className="grid2">
                  <div className="field"><Label htmlFor="nu-name">Nama</Label><Input id="nu-name" name="name" required /></div>
                  <div className="field"><Label htmlFor="nu-email">Email</Label><Input id="nu-email" name="email" type="email" required /></div>
                  <div className="field"><Label htmlFor="nu-pw">Password awal</Label><Input id="nu-pw" name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="min. 8 karakter" /></div>
                  <div className="field"><Label htmlFor="nu-role">Role</Label><RoleSelect id="nu-role" name="role" defaultValue="user" /></div>
                </div>
                <div><Button variant="gold">Tambah user</Button></div>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

export default Users;
