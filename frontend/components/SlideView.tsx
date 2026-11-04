import { youtubeId } from '@/lib/api';
import { longDate } from '@/lib/slides';
import type { Slide } from '@/lib/types';

// Satu-satunya komponen yang menggambar slide: dipakai editor, thumbnail, dan layar tayang.
// Ukuran font memakai satuan cqw sehingga skalanya mengikuti lebar kotak slide.
export default function SlideView({ slide, live = false }: { slide: Slide; live?: boolean }) {
  const vid = slide.type === 'youtube' ? youtubeId(slide.url) : null;
  const cls = 'sv' + (slide.bg ? ' has-bg' : '') + (slide.tone === 'dark' ? ' dark' : '');
  const r = slide.roster;
  const rows: [string, string][] = r ? [
    ['Pembawa Acara', r.mc],
    ['Pembaca Ayat Suci', r.scripture],
    ...r.prayers.map((p, i): [string, string] => [`Petugas Doa ${i + 1}`, p]),
    ['Jiang Dao', r.jiangdao],
  ] : [];

  const a = slide.ayat;
  const size = a ? (a.hanzi.length + a.terjemahan.length > 520 ? ' xs' : a.hanzi.length + a.terjemahan.length > 280 ? ' sm' : '') : '';

  return (
    <div className={cls} style={slide.bg ? { backgroundImage: `url("${slide.bg}")` } : undefined}>
      {slide.type === 'text' && (
        <div className="sv-text"><h1>{slide.title}</h1><p>{slide.body}</p></div>
      )}
      {slide.type === 'youtube' && (
        vid ? (live
          ? <iframe src={`https://www.youtube-nocookie.com/embed/${vid}?rel=0`} allow="autoplay; fullscreen" allowFullScreen />
          : <div className="sv-yt"><img alt="" src={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`} /><span>▶</span></div>)
          : <div className="sv-text"><p>Link YouTube tidak valid</p></div>
      )}
      {slide.type === 'ayat' && (
        a ? (
          <div className={'sv-ayat' + size}>
            <div className="hz">{a.hanzi}</div>
            {a.pinyin && <div className="py">{a.pinyin}</div>}
            <div className="tr">{a.terjemahan}</div>
            <div className="ref">{a.ref}</div>
          </div>
        ) : <p className="sv-empty">Ayat belum dipilih</p>
      )}
      {slide.type === 'roster' && (
        <div className="sv-roster">
          <h1>{slide.title || 'Petugas Kebaktian'}</h1>
          {slide.date && <div className="sv-date">{longDate(slide.date)}</div>}
          {r ? (
            <table><tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
          ) : <p className="sv-empty">Data petugas belum dipilih</p>}
        </div>
      )}
    </div>
  );
}
