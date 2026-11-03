export type Role = 'admin' | 'user';
export type Status = 'pending' | 'active' | 'blocked';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: Status;
  created_at: string;
}

export interface UserActivity { id: number; at: string; action: string; entity: string }
export interface UserDetail extends Profile {
  last_sign_in_at: string | null;
  activity: UserActivity[];
}

export interface Assignment {
  id: string;
  week_date: string;
  mc: string;
  prayers: string[];
  scripture: string;
  jiangdao: string;
  created_by: string;
}

export interface Roster { mc: string; prayers: string[]; scripture: string; jiangdao: string }
export interface AyatSnap { ref: string; nomor: string; hanzi: string; pinyin: string; terjemahan: string }
export type SlideType = 'text' | 'youtube' | 'roster' | 'ayat';
export interface Slide {
  type: SlideType;
  title: string;
  body: string;
  url: string;
  bg?: string;
  tone?: 'light' | 'dark';
  date?: string;
  roster?: Roster | null;
  ayat?: AyatSnap | null;
}

export interface AyatBab { id: number; kitab: string; kitab_nama: string; kitab_hanzi: string | null; kitab_urut: number; bab: string; judul: string | null; urut: number }
export interface AyatRow { id: number; nomor: string; hanzi: string; pinyin: string; terjemahan: string; ayat_bab?: { kitab_nama: string; bab: string } | null }
export interface SlideshowSummary { id: string; title: string; updated_at: string; updated_by: string; slides?: Slide[] }
export interface Slideshow extends SlideshowSummary { slides: Slide[] }

export interface AuditRow {
  id: number;
  at: string;
  actor: string;
  action: string;
  entity: string;
  before: unknown;
  after: unknown;
}

export interface Umat { id: string; nama: string; telepon: string | null; alamat: string | null; aktif: boolean; created_at: string }
export interface Mark { umat_id: string; marked_by: string; marked_at: string }
export interface Rekap { dates: string[]; counts: number[]; byUmat: Record<string, string[]> }
export interface ImportRow { nama: string; telepon: string; alamat: string }
export interface ImportResult { created: number; duplicates: number; invalid: { baris: number; alasan: string }[] }

export interface Msg { ok?: string; err?: string }
