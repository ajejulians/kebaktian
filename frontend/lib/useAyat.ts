'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { AyatBab, AyatRow } from '@/lib/types';

export interface AyatItem extends AyatRow { ref: string }

// Telusuri kitab → bab, atau cari kata (min. 2 huruf). Dipakai pemilih ayat dan halaman Kitab.
export function useAyat() {
  const [babs, setBabs] = useState<AyatBab[] | null>(null);
  const [babId, setBabId] = useState<number | null>(null);
  const [rows, setRows] = useState<AyatItem[] | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api<AyatBab[]>('/api/ayat/kitab')
      .then((b) => { setBabs(b); if (b[0]) setBabId(b[0].id); })
      .catch((e: Error) => { setBabs([]); setErr(e.message); });
  }, []);

  const kitabs = useMemo(() => {
    const m = new Map<string, AyatBab[]>();
    for (const b of babs ?? []) m.set(b.kitab, [...(m.get(b.kitab) ?? []), b]);
    return [...m.values()];
  }, [babs]);

  const searching = q.trim().length >= 2;
  const bab = babs?.find((b) => b.id === babId) ?? null;

  useEffect(() => {
    if (searching) {
      setRows(null);
      const t = setTimeout(() => {
        api<AyatRow[]>(`/api/ayat/search?q=${encodeURIComponent(q.trim())}`)
          .then((r) => setRows(r.map((x) => ({ ...x, ref: `${x.ayat_bab?.kitab_nama.split(' – ')[0] ?? ''} · ${x.ayat_bab?.bab ?? ''} · ${x.nomor}` }))))
          .catch((e: Error) => { setRows([]); setErr(e.message); });
      }, 300);
      return () => clearTimeout(t);
    }
    const cur = babs?.find((b) => b.id === babId);
    if (!cur) return;
    setRows(null);
    let alive = true;
    api<AyatRow[]>(`/api/ayat?bab_id=${cur.id}`)
      .then((r) => alive && setRows(r.map((x) => ({ ...x, ref: `${cur.kitab_nama.split(' – ')[0]} · ${cur.bab} · ${x.nomor}` }))))
      .catch((e: Error) => { if (alive) { setRows([]); setErr(e.message); } });
    return () => { alive = false; };
  }, [babId, babs, q, searching]);

  // Bab sesudahnya dalam urutan data (lintas kitab), atau null bila sudah terakhir.
  const nextBab = bab && babs ? babs[babs.indexOf(bab) + 1] ?? null : null;
  const pickBab = (id: number) => { setQ(''); setBabId(id); };

  return { babs, kitabs, bab, babId, pickBab, nextBab, rows, q, setQ, searching, err };
}
