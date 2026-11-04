begin;

-- Abort before making changes if the requested account has no profile.
do $$ begin
  if not exists (select 1 from profiles where lower(email) = 'aariel.tron48@gmail.com') then
    raise exception 'Profil aariel.tron48@gmail.com tidak ditemukan';
  end if;
end $$;
alter table profiles add column if not exists birth_date date;
alter table profiles add column if not exists domicile text;
alter table profiles add column if not exists pakin_makin text;
alter table profiles drop constraint if exists profiles_role_check;
update profiles set role = 'superadmin' where role = 'admin' or lower(email) = 'aariel.tron48@gmail.com';
update profiles set role = 'pengurus' where role = 'user';
alter table profiles alter column role set default 'pengurus';
alter table profiles add constraint profiles_role_check check (role in ('superadmin', 'pengurus'));
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table announcements enable row level security;

-- Even if an old policy exists, clients cannot query workspace tables directly.
revoke all on assignments, slideshows, umat, absensi from public, anon, authenticated;
alter table assignments add column if not exists owner_id uuid references profiles(id);
alter table slideshows add column if not exists owner_id uuid references profiles(id);
alter table umat add column if not exists owner_id uuid references profiles(id);
alter table absensi add column if not exists owner_id uuid references profiles(id);

-- Only original creators identify ownership reliably. Slideshow updated_by is not a creator.
update assignments a set owner_id = p.id from (select lower(email) as email, min(id::text)::uuid as id from profiles group by lower(email) having count(*) = 1) p where a.owner_id is null and lower(a.created_by) = p.email;
update umat u set owner_id = p.id from (select lower(email) as email, min(id::text)::uuid as id from profiles group by lower(email) having count(*) = 1) p where u.owner_id is null and lower(u.created_by) = p.email;
update absensi a set owner_id = u.owner_id from umat u where a.owner_id is null and a.umat_id = u.id and u.owner_id is not null;

create unique index if not exists umat_id_owner_key on umat(id, owner_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'absensi_umat_owner_fkey' and conrelid = 'absensi'::regclass) then
    alter table absensi add constraint absensi_umat_owner_fkey foreign key (umat_id, owner_id) references umat(id, owner_id);
  end if;
end $$;
create index if not exists assignments_owner_week_idx on assignments(owner_id, week_date, created_at desc);
create index if not exists slideshows_owner_idx on slideshows(owner_id, updated_at desc);
create index if not exists umat_owner_idx on umat(owner_id, nama);
create index if not exists absensi_owner_week_idx on absensi(owner_id, week_date);
-- Disable anonymous access to old backgrounds while preserving the files.
update storage.buckets set public = false where id = 'slide-backgrounds';
-- Null owners are quarantined: the API always filters with the authenticated UUID.
select 'assignments' as entity, count(*) filter (where owner_id is null) as unassigned, count(*) filter (where owner_id is not null) as assigned from assignments
union all select 'slideshows', count(*) filter (where owner_id is null), count(*) filter (where owner_id is not null) from slideshows
union all select 'umat', count(*) filter (where owner_id is null), count(*) filter (where owner_id is not null) from umat
union all select 'absensi', count(*) filter (where owner_id is null), count(*) filter (where owner_id is not null) from absensi;

commit;
