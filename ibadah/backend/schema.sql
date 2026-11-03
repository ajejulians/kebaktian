-- Jalankan di Supabase > SQL Editor
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  week_date date not null,
  mc text not null,
  prayers text[] not null,
  scripture text not null,
  jiangdao text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists assignments_week_idx on assignments (week_date, created_at desc);

create table if not exists slideshows (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slides jsonb not null default '[]',
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb
);

-- Hanya backend (service role) yang boleh akses; blokir akses langsung dari browser.
alter table assignments enable row level security;
alter table slideshows enable row level security;
alter table audit_log enable row level security;

-- Profil & role user (jalankan bagian ini saja jika tabel lain sudah dibuat)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null default 'user' check (role in ('admin','user')),
  status text not null default 'pending' check (status in ('pending','active','blocked')),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- ---- Ayat (Si Shu). Isi datanya dengan: npm run import-ayat ----
create table if not exists ayat_bab (
  id serial primary key,
  kitab text not null,
  kitab_nama text not null,
  kitab_hanzi text,
  kitab_urut int not null,
  bab text not null,
  judul text,
  urut int not null
);
create table if not exists ayat (
  id bigserial primary key,
  bab_id int not null references ayat_bab(id) on delete cascade,
  nomor text not null,
  urut int not null,
  hanzi text not null,
  pinyin text not null default '',
  terjemahan text not null
);
create index if not exists ayat_bab_urut_idx on ayat (bab_id, urut);
alter table ayat_bab enable row level security;
alter table ayat enable row level security;

-- ---- Absensi ----
create table if not exists umat (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  telepon text,
  alamat text,
  aktif boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists umat_nama_idx on umat (nama);

-- Hanya yang hadir yang dicatat; tidak ada baris = belum/tidak hadir. Satu umat satu kali per tanggal.
create table if not exists absensi (
  id uuid primary key default gen_random_uuid(),
  week_date date not null,
  umat_id uuid not null references umat(id),
  marked_by text not null,
  marked_at timestamptz not null default now(),
  unique (week_date, umat_id)
);
create index if not exists absensi_week_idx on absensi (week_date);
alter table umat enable row level security;
alter table absensi enable row level security;
