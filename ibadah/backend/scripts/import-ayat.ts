// Pemakaian:
//   npx tsx scripts/import-ayat.ts            -> dry-run: mem-parse folder Ayat dan menampilkan ringkasan
//   npx tsx --env-file=.env scripts/import-ayat.ts --write   -> menimpa tabel ayat_bab + ayat di Supabase
// Jalankan dulu bagian "Ayat" di schema.sql pada Supabase SQL Editor.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '..', '..', 'Ayat');

interface Kitab { slug: string; nama: string; hanzi: string; urut: number; files: (n: string) => boolean }
const KITAB: Kitab[] = [
  { slug: 'da-xue', nama: 'Da Xue – Thai Hak', hanzi: '大學', urut: 1, files: (n) => /^1[._]/.test(n) },
  { slug: 'zhong-yong', nama: 'Zhong Yong – Tiong Yong', hanzi: '中庸', urut: 2, files: (n) => /^2[._]/.test(n) },
  { slug: 'lun-yu', nama: 'Lun Yu – Lun Gi', hanzi: '論語', urut: 3, files: (n) => /^3[._]/.test(n) },
  { slug: 'meng-zi', nama: 'Meng Zi – Bing Cu', hanzi: '孟子', urut: 4, files: (n) => /^4 /.test(n) },
];

interface Verse { nomor: string; hanzi: string[]; pinyin: string[]; terj: string[] }
interface Bab { label: string; judul: string; verses: Verse[] }

const CJK = /[㐀-鿿]/g;
const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
const fromRoman = (s: string) => [...s].reduce((t, c, i, a) => t + (ROMAN[c] < (ROMAN[a[i + 1]] ?? 0) ? -ROMAN[c] : ROMAN[c]), 0);
function toRoman(n: number) {
  let out = '';
  for (const [v, s] of [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']] as [number, string][])
    while (n >= v) { out += s; n -= v; }
  return out;
}

// Tabel markdown dijadikan baris biasa; sel digabung dengan spasi.
function normalize(md: string): string[] {
  const out: string[] = [];
  for (const raw of md.split(/\r?\n/)) {
    const t = raw.trim();
    if (t.startsWith('|')) {
      if (/^\|[\s:|-]+\|?$/.test(t)) continue;
      const cells = t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length) out.push(cells.join(' ').replace(/\s+/g, ' '));
    } else out.push(t.replace(/\s+/g, ' '));
  }
  return out;
}

const isHanzi = (l: string) => {
  const c = (l.match(CJK) || []).length;
  const latin = (l.match(/[A-Za-z]/g) || []).length;
  return c > 0 && c * 2 >= latin;
};
const NUM = /^(?:(\d+(?:\.\d+)*)[.．]|(\d+\.\d+))\s*(?=\S)/;
const isJunk = (l: string) => (!/[a-z]/.test(l) && !/[㐀-鿿]/.test(l)) || (/^[A-Z0-9 .,()–-]+$/.test(l) && l.length > 3);

function cleanHanzi(s: string) {
  const H = '[\\u3000-\\u303f\\uff00-\\uffef\\u3400-\\u9fff]';
  return s.replace(/\s*\([㐀-鿿]+\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(new RegExp(`(?<=${H})\\s+(?=${H})`, 'g'), '')
    .replace(/([㐀-鿿])\s*\?/g, '$1？').replace(/([㐀-鿿])\s*!/g, '$1！').replace(/([㐀-鿿])\s*;/g, '$1；')
    .trim();
}
const V = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü';
function cleanPinyin(s: string) {
  // \b tidak mengenal huruf bernada (ì, ǐ), jadi batas kata ditulis dengan \p{L}.
  return s.replace(new RegExp(`(?<!\\p{L})([bpmfdtnlgkhjqxzcsryw]{1,2}) (?=[${V}])`, 'gu'), '$1')
    .replace(new RegExp(`([${V}]) (r|n|ng)(?!\\p{L})`, 'gu'), '$1$2')
    .replace(/\s+/g, ' ').trim();
}

function parse(kitab: Kitab, files: string[]): Bab[] {
  const babs: Bab[] = [];
  let cur: Bab | null = null;
  let verse: Verse | null = null;
  let pH: string[] = [], pP: string[] = [], tBuf: string[] = [];

  const flushT = () => {
    if (!tBuf.length) return;
    const text = tBuf.join(' ').replace(/\s+/g, ' ').trim();
    const hz = cleanHanzi(pH.join(' ')), py = cleanPinyin(pP.join(' '));
    const m = text.match(NUM);
    if (m && cur) {
      // Lun Yu: nomor kembali ke 1 tanpa judul jilid baru => jilid yang headernya hilang dari sumber.
      if (kitab.slug === 'lun-yu' && cur.verses.length && (m[1] ?? m[2]) === cur.verses[0].nomor) {
        const prev = fromRoman(cur.label.replace(/^Jilid /, ''));
        cur = { label: `Jilid ${toRoman(prev + 1)}`, judul: '', verses: [] };
        babs.push(cur);
        console.warn(`  ! header ${cur.label} tidak ada di sumber; dibuat otomatis`);
      }
      verse = { nomor: m[1] ?? m[2], hanzi: hz ? [hz] : [], pinyin: py ? [py] : [], terj: [text.replace(NUM, '')] };
      cur.verses.push(verse);
    } else if (verse && cur) {
      if (hz) verse.hanzi.push(hz);
      if (py) verse.pinyin.push(py);
      verse.terj.push(text);
    } else if (cur && !cur.verses.length && !cur.judul && hz) cur.judul = hz;
    tBuf = []; pH = []; pP = [];
  };

  for (const f of files) {
    const lines = normalize(readFileSync(join(DIR, f), 'utf8'));
    const nextNonEmpty = (i: number) => { for (let j = i + 1; j < lines.length; j++) if (lines[j]) return lines[j]; return ''; };

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l) { flushT(); continue; }

      const jl = l.match(/^JILID\s+([IVX]+)\b\.?\s*(?:([AB])\b)?\s*(.*)$/);
      const bb = !jl && l.match(/^BAB\b\.?\s*(UTAMA|[IVX]+)\b\.?\s*(.*)$/);
      if (jl || bb) {
        flushT(); pH = []; pP = []; verse = null;
        if (jl) cur = { label: `Jilid ${jl[1]}${jl[2] ? ' ' + jl[2] : ''}`, judul: cleanHanzi(jl[3]), verses: [] };
        else { const g = bb as RegExpMatchArray; cur = { label: g[1] === 'UTAMA' ? 'Bab Utama' : `Bab ${g[1]}`, judul: g[2].replace(/\s+/g, ' ').trim(), verses: [] }; }
        babs.push(cur);
        continue;
      }

      if (isHanzi(l)) { flushT(); pH.push(l); continue; }
      const nx = nextNonEmpty(i);
      if (nx && isHanzi(nx) && !NUM.test(l)) { flushT(); pP.push(l); continue; }
      if (isJunk(l)) continue;
      if (NUM.test(l) && tBuf.length) flushT();
      tBuf.push(l);
    }
    flushT();
  }
  return babs.filter((b) => b.verses.length);
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();
const result = KITAB.map((k) => ({ ...k, babs: parse(k, files.filter((f) => k.files(f))) }));

for (const k of result) {
  console.log(`\n${k.nama}: ${k.babs.length} bab, ${k.babs.reduce((n, b) => n + b.verses.length, 0)} ayat`);
  for (const b of k.babs) console.log(`  ${b.label.padEnd(12)} ${String(b.verses.length).padStart(4)} ayat  ${b.judul.slice(0, 40)}`);
}

if (process.argv.includes('--sample')) {
  for (const k of result) for (const b of k.babs.slice(0, 2)) for (const v of b.verses.slice(0, 2))
    console.log(`\n[${k.slug} ${b.label} ${v.nomor}]\nH: ${v.hanzi.join(' / ')}\nP: ${v.pinyin.join(' / ')}\nT: ${v.terj.join(' / ')}`);
}
const dump = process.argv.find((a) => a.startsWith('--json='));
if (dump) writeFileSync(dump.slice(7), JSON.stringify(result, null, 1));

if (process.argv.includes('--write')) {
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const del = await db.from('ayat_bab').delete().gt('id', 0);
  if (del.error) throw del.error;
  let urut = 0;
  for (const k of result) {
    for (const b of k.babs) {
      const { data, error } = await db.from('ayat_bab').insert({
        kitab: k.slug, kitab_nama: k.nama, kitab_hanzi: k.hanzi, kitab_urut: k.urut, bab: b.label, judul: b.judul || null, urut: ++urut,
      }).select('id').single();
      if (error) throw error;
      const rows = b.verses.map((v, i) => ({
        bab_id: data.id, nomor: v.nomor, urut: i + 1,
        hanzi: v.hanzi.join('\n'), pinyin: v.pinyin.join('\n'), terjemahan: v.terj.join('\n'),
      }));
      for (let i = 0; i < rows.length; i += 500) {
        const r = await db.from('ayat').insert(rows.slice(i, i + 500));
        if (r.error) throw r.error;
      }
    }
  }
  console.log('\nSelesai menulis ke database.');
}
