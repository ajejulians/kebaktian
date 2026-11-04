\set ON_ERROR_STOP on
do $$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if; if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if; end $$;
create schema storage;
create table storage.buckets (id text primary key, public boolean not null);
insert into storage.buckets values ('slide-backgrounds', true);
create table profiles (id uuid primary key, email text not null);
create table assignments (id uuid primary key, created_by text not null, week_date date, created_at timestamptz default now());
create table slideshows (id uuid primary key, updated_by text not null, updated_at timestamptz default now());
create table umat (id uuid primary key, created_by text not null, nama text not null);
create table absensi (id uuid primary key, umat_id uuid references umat(id), week_date date);
insert into profiles values ('00000000-0000-0000-0000-000000000001','a@example.test'), ('00000000-0000-0000-0000-000000000002','b@example.test');
insert into assignments(id,created_by) values ('10000000-0000-0000-0000-000000000001','a@example.test'), ('10000000-0000-0000-0000-000000000002','missing@example.test');
insert into slideshows(id,updated_by) values ('20000000-0000-0000-0000-000000000001','a@example.test');
insert into umat values ('30000000-0000-0000-0000-000000000001','a@example.test','Test');
insert into absensi(id,umat_id) values ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001');
\i /migration.sql
do $$ begin
 if (select public from storage.buckets where id='slide-backgrounds') then raise exception 'legacy images remain public'; end if;
 if (select owner_id from assignments where created_by='a@example.test') <> '00000000-0000-0000-0000-000000000001' then raise exception 'wrong assignment owner'; end if;
 if (select owner_id from assignments where created_by='missing@example.test') is not null then raise exception 'unmatched assignment not quarantined'; end if;
 if (select owner_id from slideshows limit 1) is not null then raise exception 'slideshow incorrectly assigned'; end if;
 if (select owner_id from absensi limit 1) <> '00000000-0000-0000-0000-000000000001' then raise exception 'wrong attendance owner'; end if;
 begin
  insert into absensi(id,umat_id,owner_id) values ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
  raise exception 'cross-owner attendance accepted';
 exception when foreign_key_violation then null; end;
end $$;
