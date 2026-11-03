'use client';
import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import SlideView from '@/components/SlideView';
import type { Slide, Slideshow } from '@/lib/types';

function Stage({ id }: { id: string }) {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => { api<Slideshow>(`/api/slideshows/${id}`).then((d) => setSlides(d.slides)); }, [id]);

  useEffect(() => {
    if (!slides) return;
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) setI((n) => Math.min(n + 1, slides.length - 1));
      if (['ArrowLeft', 'PageUp'].includes(e.key)) setI((n) => Math.max(n - 1, 0));
      if (e.key === 'f') document.documentElement.requestFullscreen?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides]);

  if (!slides) return <div className="stage" style={{ color: '#fff' }}>Memuat…</div>;
  if (!slides.length) return <div className="stage" style={{ color: '#fff' }}><p>Slideshow kosong</p></div>;

  return (
    <div className="stage">
      <div className="bar" style={{ width: `${((i + 1) / slides.length) * 100}%` }} />
      <div className="stage-box"><SlideView key={i} slide={slides[i]} live /></div>
      <button className="zone l" aria-label="Sebelumnya" onClick={() => setI((n) => Math.max(n - 1, 0))} />
      <button className="zone r" aria-label="Berikutnya" onClick={() => setI((n) => Math.min(n + 1, slides.length - 1))} />
      <div className="hud">{i + 1}/{slides.length} · ←/→ pindah · F layar penuh</div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = use(params); return <Stage id={id} />; }
