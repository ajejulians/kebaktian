'use client';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import Notice from '@/components/Notice';
import PageHeader from '@/components/PageHeader';
import { Avatar, CountChip, FilterTabs, Panel, PanelFooter, PanelHeader, SearchField, StatusPill } from '@/components/Panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconInput } from '@/components/ui/icon-input';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Msg, Profile, Status, UserDetail } from '@/lib/types';

const FILTERS = { all: 'Semua', pending: 'Menunggu', active: 'Aktif', blocked: 'Diblokir' } as const;
const STATUS: Record<Status, [string, 'warn' | 'ok' | 'bad']> = { pending: ['Menunggu', 'warn'], active: ['Aktif', 'ok'], blocked: ['Diblokir', 'bad'] };
const fmt = (d: string) => new Date(d).toLocaleString('id-ID');
const small = 'h-[34px] rounded-[5px] text-[11px]';
const danger = 'border-[#E8C9C5] text-[#A84C47] hover:bg-[#FBEDEA] hover:text-[#A84C47]';

function RoleSelect(props: { name?: string; value?: string; defaultValue?: string; disabled?: boolean; onValueChange?: (v: string) => void; id?: string }) {
  const { id, ...rest } = props;
  return (
    <Select {...rest}>
      <SelectTrigger id={id} className="h-[43px] w-full rounded-[5px] bg-card"><SelectValue /></SelectTrigger>
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
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<keyof typeof FILTERS>('all');
  const [showPw, setShowPw] = useState(false);

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

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (users ?? []).filter((u) => (filter === 'all' || u.status === filter) && (!t || u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t)));
  }, [users, q, filter]);
  const pending = users?.filter((u) => u.status === 'pending').length || 0;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        trail={['Administrasi', 'User']}
        title="Manajemen User"
        description="Kelola akses, persetujuan pendaftaran, dan status akun."
        actions={pending > 0 ? <StatusPill tone="warn" className="px-3 py-2">{pending} menunggu persetujuan</StatusPill> : undefined}
      />
      <Notice msg={msg} className="my-0" />

      <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
        <Panel>
          <PanelHeader title="Daftar user" description="Akun yang memiliki akses ke aplikasi." aside={users && <CountChip>{users.length} user</CountChip>}>
            <SearchField aria-label="Cari user" placeholder="Cari nama atau email…" value={q} onChange={(e) => setQ(e.target.value)} />
            <FilterTabs label="Saring status" options={FILTERS} value={filter} onChange={setFilter} />
          </PanelHeader>

          {!users && [0, 1, 2].map((n) => <div key={n} className="border-t px-6 py-4"><Skeleton className="h-12" /></div>)}
          {shown.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-3 border-t px-5 py-4 sm:px-6">
              <Avatar name={u.name} tone={u.role === 'admin' ? 'gold' : 'slate'} />
              <div className="flex min-w-44 flex-1 flex-col gap-[5px]">
                <div className="flex items-center gap-2"><strong className="text-[13px] font-bold">{u.name}</strong><span className="text-[11px] text-muted-foreground capitalize">{u.role}</span></div>
                <span className="text-[11px] break-all text-muted-foreground">{u.email}</span>
              </div>
              <StatusPill tone={STATUS[u.status][1]}>{STATUS[u.status][0]}</StatusPill>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className={small} onClick={() => view(u)}>Info</Button>
                {u.status === 'pending' && <>
                  <Button size="sm" className={small} onClick={() => patch(u, { status: 'active' }, 'User disetujui')}>Setujui</Button>
                  <Button variant="outline" size="sm" className={`${small} ${danger}`} onClick={() => confirm(`Tolak pendaftaran ${u.email}?`) && run(() => api(`/api/users/${u.id}`, { method: 'DELETE' }), 'Pendaftaran ditolak')}>Tolak</Button>
                </>}
                {u.status === 'active' && <Button variant="outline" size="sm" className={`${small} ${danger}`} onClick={() => confirm(`Blokir ${u.email}?`) && patch(u, { status: 'blocked' }, 'User diblokir')}>Blokir</Button>}
                {u.status === 'blocked' && <Button size="sm" variant="outline" className={small} onClick={() => patch(u, { status: 'active' }, 'Blokir dibuka')}>Buka blokir</Button>}
              </div>
            </div>
          ))}
          {users && !users.length && <div className="border-t p-6"><div className="empty">Belum ada user.</div></div>}
          {users && !!users.length && !shown.length && <div className="border-t p-6"><div className="empty">Tidak ada user yang cocok.</div></div>}
          <PanelFooter><span>Menampilkan {shown.length} dari {users?.length ?? 0} user</span></PanelFooter>
        </Panel>

        <aside className="flex flex-col gap-[18px] min-[1100px]:sticky min-[1100px]:top-6">
          {detail && (
            <Panel className="border-gold p-6">
              <div className="flex items-start gap-3">
                <Avatar name={detail.name} tone={detail.role === 'admin' ? 'gold' : 'slate'} />
                <div className="flex min-w-0 flex-1 flex-col gap-1"><h2 className="m-0 truncate text-[15px] font-bold">{detail.name}</h2><span className="text-xs break-all text-muted-foreground">{detail.email}</span></div>
                <Button variant="ghost" size="icon-sm" aria-label="Tutup" onClick={() => setDetail(null)}><X /></Button>
              </div>
              <div className="mt-4 flex flex-col gap-4">
                <p className="text-xs text-muted-foreground">Terdaftar {fmt(detail.created_at)} · Login terakhir {detail.last_sign_in_at ? fmt(detail.last_sign_in_at) : 'belum pernah'}</p>
                <Field label="Role" htmlFor="detail-role" className="max-w-44">
                  <RoleSelect id="detail-role" value={detail.role} disabled={detail.status === 'pending'}
                    onValueChange={(v) => patch(detail, { role: v }, 'Role diubah').then(() => view(detail))} />
                </Field>
                <Separator />
                <div className="flex flex-col gap-1.5">
                  <strong className="text-sm">Aktivitas terakhir</strong>
                  {detail.activity.map((a) => <div key={a.id} className="text-xs text-muted-foreground">{fmt(a.at)} · {a.action} {a.entity}</div>)}
                  {!detail.activity.length && <div className="text-xs text-muted-foreground">Belum ada aktivitas.</div>}
                </div>
              </div>
            </Panel>
          )}

          <Panel className="p-6">
            <form onSubmit={add} className="flex flex-col gap-[19px]">
              <div className="flex flex-col gap-1.5"><h2 className="m-0 text-base font-bold">Tambah user</h2><p className="text-xs text-muted-foreground">User yang ditambahkan admin langsung aktif.</p></div>
              <Field label="Nama" htmlFor="nu-name"><Input id="nu-name" name="name" fieldSize="md" placeholder="Masukkan nama lengkap" required /></Field>
              <Field label="Email" htmlFor="nu-email"><Input id="nu-email" name="email" type="email" fieldSize="md" placeholder="nama@email.com" required /></Field>
              <Field label="Password awal" htmlFor="nu-pw">
                <IconInput
                  id="nu-pw" name="password" type={showPw ? 'text' : 'password'} fieldSize="md" minLength={8} required autoComplete="new-password" placeholder="Minimal 8 karakter"
                  trailing={
                    <button type="button" aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShowPw(!showPw)}
                      className="grid size-8 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                      {showPw ? <EyeOff aria-hidden className="size-[15px]" /> : <Eye aria-hidden className="size-[15px]" />}
                    </button>
                  }
                />
              </Field>
              <Field label="Role" htmlFor="nu-role"><RoleSelect id="nu-role" name="role" defaultValue="user" /></Field>
              <Button size="md" className="w-full"><Plus />Tambah user</Button>
            </form>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

export default Users;
