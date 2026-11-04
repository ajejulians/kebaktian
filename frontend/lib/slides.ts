import type { Slide, SlideType } from './types';

export function nextSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return d.toLocaleDateString('sv');
}

export const todayISO = (): string => new Date().toLocaleDateString('sv');

// Hari Minggu terakhir (hari ini bila hari ini Minggu): tanggal bawaan untuk absensi.
export function thisSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toLocaleDateString('sv');
}

export function longDate(iso: string): string {
  return new Date(iso + 'T00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function newSlide(type: SlideType): Slide {
  return {
    type, title: type === 'roster' ? 'Petugas Kebaktian' : '', body: '', url: '',
    ...(type === 'roster' ? { date: nextSunday(), roster: null } : {}),
  };
}

export const MAX_BG_BYTES = 5 * 1024 * 1024;

// Validasi latar: hanya PNG/JPEG, rasio 16:9, minimal 1280x720. Mengembalikan pesan galat atau null.
export function checkBackground(file: File): Promise<string | null> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) return Promise.resolve('Format harus PNG atau JPEG');
  if (file.size > MAX_BG_BYTES) return Promise.resolve('Ukuran file maksimal 5 MB');
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width: w, height: h } = img;
      if (Math.abs(w * 9 - h * 16) > h * 16 * 0.01) return resolve(`Rasio harus 16:9 (gambar Anda ${w}×${h})`);
      if (w < 1280) return resolve(`Resolusi minimal 1280×720 (gambar Anda ${w}×${h})`);
      resolve(null);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve('File gambar tidak dapat dibaca'); };
    img.src = url;
  });
}
