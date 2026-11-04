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
commit;
