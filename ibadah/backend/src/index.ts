import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  status: 'pending' | 'active' | 'blocked';
  created_at: string;
}

declare global {
  namespace Express {
    interface Request { profile: Profile; actor: string }
  }
}

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const app = express();
// FRONTEND_ORIGIN boleh berisi beberapa alamat dipisah koma; localhost/127.0.0.1 diizinkan untuk development.
const origins = (process.env.FRONTEND_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || origins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)),
}));
app.use(express.json({ limit: '1mb' }));

const wrap = (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler => (req, res) => { fn(req, res).catch((e: Error) => {
  console.error(e);
  res.status(500).json({ error: e.message });
}); };

// Memuat user dari token + profilnya. Status akun diperiksa di sini (bukan di Supabase)
// supaya blokir berlaku seketika, tanpa menunggu token kedaluwarsa.
async function loadUser(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Belum login' });
  const { data: profile } = await db.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if (!profile) return res.status(403).json({ error: 'Akun belum terdaftar', status: 'none' });
  req.profile = profile as Profile;
  req.actor = profile.email;
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  loadUser(req, res, () => {
    if (req.profile.status === 'active') return next();
    const msg = req.profile.status === 'pending' ? 'Akun menunggu persetujuan admin' : 'Akun diblokir';
    res.status(403).json({ error: msg, status: req.profile.status });
  });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.profile.role === 'admin') return next();
    res.status(403).json({ error: 'Khusus admin' });
  });
}

const audit = (actor: string, action: string, entity: string, entity_id: string, before: unknown, after: unknown) =>
  db.from('audit_log').insert({ actor, action, entity, entity_id, before, after });

const str = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v.trim() : null;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Profil sendiri (boleh walau pending/diblokir, supaya login bisa menampilkan pesan yang tepat)
app.get('/api/me', loadUser, (req, res) => res.json(req.profile));

// ---- Pendaftaran publik: akun dibuat berstatus pending, menunggu persetujuan admin ----
const regHits = new Map<string, number[]>();
app.post('/api/register', wrap(async (req, res) => {
  const ip = req.ip ?? '';
  const hits = (regHits.get(ip) || []).filter((t) => Date.now() - t < 3600_000);
  if (hits.length >= 5) return res.status(429).json({ error: 'Terlalu banyak percobaan, coba lagi nanti' });
  regHits.set(ip, [...hits, Date.now()]);

  const name = str(req.body.name), email = str(req.body.email)?.toLowerCase(), password = req.body.password;
  if (!name || !email || !EMAIL.test(email)) return res.status(400).json({ error: 'Nama dan email wajib diisi dengan benar' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter' });

  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return res.status(400).json({ error: 'Email tidak dapat didaftarkan' });
  const { data: profile, error: e2 } = await db.from('profiles')
    .insert({ id: data.user.id, email, name, role: 'user', status: 'pending' }).select().single();
  if (e2) { await db.auth.admin.deleteUser(data.user.id); throw e2; }
  await audit(email, 'register', 'user', profile.id, null, profile);
  res.json({ ok: true });
}));

// ---- Manajemen user (admin) ----
app.get('/api/users', requireAdmin, wrap(async (_req, res) => {
  const { data, error } = await db.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

app.get('/api/users/:id', requireAdmin, wrap(async (req, res) => {
  const { data: user, error } = await db.from('profiles').select('*').eq('id', String(req.params.id)).single();
  if (error) return res.status(404).json({ error: 'Tidak ditemukan' });
  const { data: auth } = await db.auth.admin.getUserById(String(req.params.id));
  const { data: activity } = await db.from('audit_log').select('id,at,action,entity').eq('actor', user.email)
    .order('at', { ascending: false }).limit(20);
  res.json({ ...user, last_sign_in_at: auth?.user?.last_sign_in_at || null, activity: activity || [] });
}));

app.post('/api/users', requireAdmin, wrap(async (req, res) => {
  const name = str(req.body.name), email = str(req.body.email)?.toLowerCase(), password = req.body.password;
  const role = req.body.role === 'admin' ? 'admin' : 'user';
  if (!name || !email || !EMAIL.test(email)) return res.status(400).json({ error: 'Nama dan email wajib diisi dengan benar' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter' });
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return res.status(400).json({ error: 'Email tidak dapat didaftarkan' });
  const { data: profile, error: e2 } = await db.from('profiles')
    .insert({ id: data.user.id, email, name, role, status: 'active' }).select().single();
  if (e2) { await db.auth.admin.deleteUser(data.user.id); throw e2; }
  await audit(req.actor, 'create', 'user', profile.id, null, profile);
  res.json(profile);
}));

// Ubah status (active/blocked) dan/atau role. Admin tidak boleh mengubah dirinya sendiri.
app.patch('/api/users/:id', requireAdmin, wrap(async (req, res) => {
  if (String(req.params.id) === req.profile.id) return res.status(400).json({ error: 'Tidak bisa mengubah akun sendiri' });
  const { data: before } = await db.from('profiles').select('*').eq('id', String(req.params.id)).single<Profile>();
  if (!before) return res.status(404).json({ error: 'Tidak ditemukan' });
  const patch: { status?: Profile['status']; role?: Profile['role'] } = {};
  if (['active', 'blocked'].includes(req.body.status)) patch.status = req.body.status;
  if (['admin', 'user'].includes(req.body.role)) patch.role = req.body.role;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Tidak ada perubahan' });
  const { data, error } = await db.from('profiles').update(patch).eq('id', String(req.params.id)).select().single();
  if (error) throw error;
  if (patch.status) await db.auth.admin.updateUserById(String(req.params.id), { ban_duration: patch.status === 'blocked' ? '876000h' : 'none' });
  const action = patch.status === 'active' ? (before.status === 'pending' ? 'approve' : 'unblock')
    : patch.status === 'blocked' ? 'block' : 'change-role';
  await audit(req.actor, action, 'user', data.id, before, data);
  res.json(data);
}));

// Tolak pendaftaran: hapus akun yang masih pending
app.delete('/api/users/:id', requireAdmin, wrap(async (req, res) => {
  const { data: before } = await db.from('profiles').select('*').eq('id', String(req.params.id)).single<Profile>();
  if (!before) return res.status(404).json({ error: 'Tidak ditemukan' });
  if (before.status !== 'pending') return res.status(400).json({ error: 'Hanya pendaftaran pending yang bisa ditolak; gunakan blokir untuk akun aktif' });
  await db.from('profiles').delete().eq('id', before.id);
  await db.auth.admin.deleteUser(before.id);
  await audit(req.actor, 'reject', 'user', before.id, before, null);
  res.json({ ok: true });
}));

// ---- Petugas (setiap simpan = versi baru, riwayat tidak ditimpa) ----
app.get('/api/assignments', requireAuth, wrap(async (req, res) => {
  const { data, error } = await db.from('assignments').select('*')
    .eq('week_date', String(req.query.week)).order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  res.json(data?.[0] || null);
}));

app.put('/api/assignments', requireAuth, wrap(async (req, res) => {
  const { week_date, mc, prayers, scripture, jiangdao } = req.body;
  const p = Array.isArray(prayers) ? prayers.map(str) : [];
  if (!week_date || !str(mc) || p.length !== 3 || p.some((x) => !x) || !str(scripture) || !str(jiangdao))
    return res.status(400).json({ error: 'Semua petugas wajib diisi (3 petugas doa)' });
  const { data: prev } = await db.from('assignments').select('*')
    .eq('week_date', week_date).order('created_at', { ascending: false }).limit(1);
  const { data, error } = await db.from('assignments').insert({
    week_date, mc: str(mc), prayers: p, scripture: str(scripture), jiangdao: str(jiangdao), created_by: req.actor,
  }).select().single();
  if (error) throw error;
  await audit(req.actor, prev?.[0] ? 'update' : 'create', 'assignment', data.id, prev?.[0] || null, data);
  res.json(data);
}));

// ---- Slideshow ----
app.get('/api/slideshows', requireAuth, wrap(async (_req, res) => {
  const { data, error } = await db.from('slideshows').select('id,title,updated_at,updated_by,slides').order('updated_at', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

app.get('/api/slideshows/:id', requireAuth, wrap(async (req, res) => {
  const { data, error } = await db.from('slideshows').select('*').eq('id', String(req.params.id)).single();
  if (error) return res.status(404).json({ error: 'Tidak ditemukan' });
  res.json(data);
}));

const BUCKET = 'slide-backgrounds';
const BG_PREFIX = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
// Bucket publik untuk latar slide; dibuat otomatis bila belum ada.
db.storage.createBucket(BUCKET, { public: true }).then(({ error }) => {
  if (error && !/already exists/i.test(error.message)) console.error('Gagal menyiapkan bucket latar:', error.message);
});

// Ukuran gambar dibaca dari header file (tanpa library): PNG lewat IHDR, JPEG lewat marker SOFn.
function imageSize(b: Buffer): { type: 'png' | 'jpg'; w: number; h: number } | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(4) === 0x0d0a1a0a)
    return { type: 'png', w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { type: 'jpg', h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

app.post('/api/backgrounds', requireAuth, express.raw({ type: ['image/png', 'image/jpeg'], limit: '5mb' }), wrap(async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Hanya PNG atau JPEG' });
  const img = imageSize(req.body);
  if (!img) return res.status(400).json({ error: 'File bukan PNG/JPEG yang valid' });
  if (Math.abs(img.w * 9 - img.h * 16) > img.h * 16 * 0.01) return res.status(400).json({ error: `Rasio harus 16:9 (gambar ${img.w}x${img.h})` });
  if (img.w < 1280) return res.status(400).json({ error: `Resolusi minimal 1280x720 (gambar ${img.w}x${img.h})` });
  const path = `${randomUUID()}.${img.type}`;
  const { error } = await db.storage.from(BUCKET).upload(path, req.body, { contentType: img.type === 'png' ? 'image/png' : 'image/jpeg' });
  if (error) throw error;
  res.json({ url: BG_PREFIX + path });
}));

const short = (v: unknown, n: number) => String(v ?? '').slice(0, n);
const cleanRoster = (r: any) => (r && typeof r === 'object' ? {
  mc: short(r.mc, 200),
  prayers: (Array.isArray(r.prayers) ? r.prayers : []).slice(0, 3).map((p: unknown) => short(p, 200)),
  scripture: short(r.scripture, 200),
  jiangdao: short(r.jiangdao, 200),
} : null);

const cleanSlides = (s: unknown) => (Array.isArray(s) ? s : []).slice(0, 200).map((x: Record<string, any>) => ({
  type: ['youtube', 'roster', 'ayat'].includes(x.type) ? x.type : 'text',
  title: short(x.title, 200),
  body: short(x.body, 5000),
  url: short(x.url, 500),
  // Latar hanya boleh berasal dari bucket kita sendiri.
  bg: typeof x.bg === 'string' && x.bg.startsWith(BG_PREFIX) && x.bg.length < 300 ? x.bg : undefined,
  tone: x.tone === 'dark' ? 'dark' : 'light',
  date: /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : undefined,
  roster: x.type === 'roster' ? cleanRoster(x.roster) : null,
  ayat: x.type === 'ayat' && x.ayat ? {
    ref: short(x.ayat.ref, 200), nomor: short(x.ayat.nomor, 20),
    hanzi: short(x.ayat.hanzi, 3000), pinyin: short(x.ayat.pinyin, 6000), terjemahan: short(x.ayat.terjemahan, 6000),
  } : null,
}));

app.post('/api/slideshows', requireAuth, wrap(async (req, res) => {
  const { data, error } = await db.from('slideshows').insert({
    title: str(req.body.title) || 'Tanpa judul', slides: cleanSlides(req.body.slides), updated_by: req.actor,
  }).select().single();
  if (error) throw error;
  await audit(req.actor, 'create', 'slideshow', data.id, null, data);
  res.json(data);
}));

app.put('/api/slideshows/:id', requireAuth, wrap(async (req, res) => {
  const { data: before } = await db.from('slideshows').select('*').eq('id', String(req.params.id)).single();
  if (!before) return res.status(404).json({ error: 'Tidak ditemukan' });
  const { data, error } = await db.from('slideshows').update({
    title: str(req.body.title) || 'Tanpa judul', slides: cleanSlides(req.body.slides),
    updated_by: req.actor, updated_at: new Date().toISOString(),
  }).eq('id', String(req.params.id)).select().single();
  if (error) throw error;
  await audit(req.actor, 'update', 'slideshow', data.id, before, data);
  res.json(data);
}));

app.delete('/api/slideshows/:id', requireAuth, wrap(async (req, res) => {
  const { data: before } = await db.from('slideshows').select('*').eq('id', String(req.params.id)).single();
  if (!before) return res.status(404).json({ error: 'Tidak ditemukan' });
  const { error } = await db.from('slideshows').delete().eq('id', String(req.params.id));
  if (error) throw error;
  await audit(req.actor, 'delete', 'slideshow', String(req.params.id), before, null);
  res.json({ ok: true });
}));

// ---- Ayat (read-only; datanya diisi lewat scripts/import-ayat.ts) ----
app.get('/api/ayat/kitab', requireAuth, wrap(async (_req, res) => {
  const { data, error } = await db.from('ayat_bab').select('id,kitab,kitab_nama,kitab_hanzi,kitab_urut,bab,judul,urut').order('urut');
  if (error) throw error;
  res.json(data);
}));

app.get('/api/ayat/search', requireAuth, wrap(async (req, res) => {
  const q = String(req.query.q ?? '').replace(/[,()%*\\]/g, ' ').trim();
  if (q.length < 2) return res.json([]);
  const { data, error } = await db.from('ayat').select('id,nomor,hanzi,pinyin,terjemahan,ayat_bab(kitab_nama,bab)')
    .or(`terjemahan.ilike.%${q}%,hanzi.ilike.%${q}%,pinyin.ilike.%${q}%`).order('id').limit(50);
  if (error) throw error;
  res.json(data);
}));

app.get('/api/ayat', requireAuth, wrap(async (req, res) => {
  const babId = Number(req.query.bab_id);
  if (!Number.isInteger(babId)) return res.status(400).json({ error: 'bab_id wajib' });
  const { data, error } = await db.from('ayat').select('id,nomor,hanzi,pinyin,terjemahan').eq('bab_id', babId).order('urut');
  if (error) throw error;
  res.json(data);
}));

// ---- Umat & absensi ----
// Supabase membatasi 1000 baris per permintaan, jadi daftar besar diambil per halaman.
async function fetchAll<T>(build: () => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

interface Umat { id: string; nama: string; telepon: string | null; alamat: string | null; aktif: boolean }
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const todayWib = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

// Telepon opsional. Excel sering menghapus angka 0 di depan (812... bukan 0812...), jadi dipulihkan.
function cleanPhone(v: unknown): { value: string | null; error?: string } {
  let t = String(v ?? '').replace(/[\s().-]/g, '');
  if (!t) return { value: null };
  if (/^8\d{8,12}$/.test(t)) t = '0' + t;
  if (!/^\+?\d{6,16}$/.test(t)) return { value: null, error: 'Nomor telepon tidak valid' };
  return { value: t };
}
const dupKey = (nama: string, telepon: string | null) => `${nama.toLowerCase().replace(/\s+/g, ' ')}|${telepon ?? ''}`;

app.get('/api/umat', requireAuth, wrap(async (req, res) => {
  const all = req.query.all === '1' && req.profile.role === 'admin';
  res.json(await fetchAll<Umat>(() => {
    const q = db.from('umat').select('id,nama,telepon,alamat,aktif,created_at').order('nama').order('id');
    return all ? q : q.eq('aktif', true);
  }));
}));

app.post('/api/umat', requireAdmin, wrap(async (req, res) => {
  const nama = str(req.body.nama);
  const ph = cleanPhone(req.body.telepon);
  if (!nama) return res.status(400).json({ error: 'Nama umat wajib diisi' });
  if (ph.error) return res.status(400).json({ error: ph.error });
  const existing = await fetchAll<Umat>(() => db.from('umat').select('id,nama,telepon').order('id'));
  if (existing.some((u) => dupKey(u.nama, u.telepon) === dupKey(nama, ph.value))) return res.status(409).json({ error: 'Umat dengan nama dan nomor yang sama sudah ada' });
  const { data, error } = await db.from('umat').insert({
    nama: nama.slice(0, 200), telepon: ph.value, alamat: str(req.body.alamat)?.slice(0, 500) ?? null, created_by: req.actor,
  }).select().single();
  if (error) throw error;
  await audit(req.actor, 'create', 'umat', data.id, null, data);
  res.json(data);
}));

app.patch('/api/umat/:id', requireAdmin, wrap(async (req, res) => {
  const id = String(req.params.id);
  const { data: before } = await db.from('umat').select('*').eq('id', id).maybeSingle();
  if (!before) return res.status(404).json({ error: 'Tidak ditemukan' });
  const patch: Record<string, unknown> = {};
  if ('nama' in req.body) { const n = str(req.body.nama); if (!n) return res.status(400).json({ error: 'Nama umat wajib diisi' }); patch.nama = n.slice(0, 200); }
  if ('telepon' in req.body) { const ph = cleanPhone(req.body.telepon); if (ph.error) return res.status(400).json({ error: ph.error }); patch.telepon = ph.value; }
  if ('alamat' in req.body) patch.alamat = str(req.body.alamat)?.slice(0, 500) ?? null;
  if (typeof req.body.aktif === 'boolean') patch.aktif = req.body.aktif;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Tidak ada perubahan' });
  const { data, error } = await db.from('umat').update(patch).eq('id', id).select().single();
  if (error) throw error;
  const action = patch.aktif === false ? 'deactivate' : patch.aktif === true && !before.aktif ? 'activate' : 'update';
  await audit(req.actor, action, 'umat', id, before, data);
  res.json(data);
}));

// Impor massal. Baris dibaca di browser (csv/xlsx); server memvalidasi ulang dan melewati duplikat.
app.post('/api/umat/import', requireAdmin, wrap(async (req, res) => {
  const rows: unknown[] = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'Tidak ada baris untuk diimpor' });
  if (rows.length > 3000) return res.status(400).json({ error: 'Maksimal 3000 baris per impor' });

  const seen = new Set((await fetchAll<Umat>(() => db.from('umat').select('id,nama,telepon').order('id'))).map((u) => dupKey(u.nama, u.telepon)));
  const toInsert: { nama: string; telepon: string | null; alamat: string | null; created_by: string }[] = [];
  const invalid: { baris: number; alasan: string }[] = [];
  let duplicates = 0;
  rows.forEach((r: any, i) => {
    const nama = str(r?.nama);
    if (!nama) return void invalid.push({ baris: i + 1, alasan: 'Nama kosong' });
    const ph = cleanPhone(r?.telepon);
    if (ph.error) return void invalid.push({ baris: i + 1, alasan: `${ph.error} (${nama})` });
    const key = dupKey(nama, ph.value);
    if (seen.has(key)) return void duplicates++;
    seen.add(key);
    toInsert.push({ nama: nama.slice(0, 200), telepon: ph.value, alamat: str(r?.alamat)?.slice(0, 500) ?? null, created_by: req.actor });
  });
  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await db.from('umat').insert(toInsert.slice(i, i + 500));
    if (error) throw error;
  }
  const result = { created: toInsert.length, duplicates, invalid };
  await audit(req.actor, 'import', 'umat', 'bulk', null, { created: toInsert.length, duplicates, invalid: invalid.length, total_rows: rows.length });
  res.json(result);
}));

app.get('/api/absensi', requireAuth, wrap(async (req, res) => {
  const week = String(req.query.week ?? '');
  if (!DATE.test(week)) return res.status(400).json({ error: 'Tanggal tidak valid' });
  res.json(await fetchAll(() => db.from('absensi').select('umat_id,marked_by,marked_at').eq('week_date', week).order('id')));
}));

// Tandai / batalkan kehadiran. Idempoten; hanya perubahan nyata yang masuk audit.
app.put('/api/absensi', requireAuth, wrap(async (req, res) => {
  const week_date = String(req.body.week_date ?? ''), umat_id = String(req.body.umat_id ?? ''), hadir = req.body.hadir === true;
  if (!DATE.test(week_date)) return res.status(400).json({ error: 'Tanggal tidak valid' });
  if (week_date > todayWib()) return res.status(400).json({ error: 'Tidak bisa mencatat absensi untuk tanggal yang belum tiba' });
  const { data: umat } = await db.from('umat').select('id,nama,aktif').eq('id', umat_id).maybeSingle();
  if (!umat || !umat.aktif) return res.status(404).json({ error: 'Umat tidak ditemukan atau sudah nonaktif' });

  if (hadir) {
    const { data, error } = await db.from('absensi').insert({ week_date, umat_id, marked_by: req.actor }).select().single();
    if (error && error.code !== '23505') throw error;
    if (data) await audit(req.actor, 'hadir', 'absensi', data.id, null, { week_date, umat_id, nama: umat.nama });
    return res.json({ ok: true, changed: !!data });
  }
  const { data, error } = await db.from('absensi').delete().eq('week_date', week_date).eq('umat_id', umat_id).select();
  if (error) throw error;
  if (data?.length) await audit(req.actor, 'batal-hadir', 'absensi', data[0].id, { week_date, umat_id, nama: umat.nama, marked_by: data[0].marked_by }, null);
  res.json({ ok: true, changed: !!data?.length });
}));

// Rekap beberapa minggu terakhir: jumlah hadir per tanggal + tanggal hadir tiap umat.
app.get('/api/absensi/rekap', requireAdmin, wrap(async (req, res) => {
  const weeks = Math.min(Math.max(Number(req.query.weeks) || 8, 1), 26);
  const from = new Date(Date.now() + 7 * 3600_000 - weeks * 7 * 86400_000).toISOString().slice(0, 10);
  const rows = await fetchAll<{ week_date: string; umat_id: string }>(() =>
    db.from('absensi').select('week_date,umat_id').gte('week_date', from).order('week_date').order('id'));
  const dates = [...new Set(rows.map((r) => r.week_date))].sort();
  const byUmat: Record<string, string[]> = {};
  for (const r of rows) (byUmat[r.umat_id] ||= []).push(r.week_date);
  res.json({ dates, counts: dates.map((d) => rows.filter((r) => r.week_date === d).length), byUmat });
}));

// ---- Audit ----
app.get('/api/audit', requireAdmin, wrap(async (_req, res) => {
  const { data, error } = await db.from('audit_log').select('*').order('at', { ascending: false }).limit(200);
  if (error) throw error;
  res.json(data);
}));

app.listen(process.env.PORT || 4000, () => console.log('API siap di port', process.env.PORT || 4000));
