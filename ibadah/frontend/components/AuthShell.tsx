import type { ReactNode } from 'react';

export default function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="auth">
      <section className="auth-art">
        <img className="auth-logo" src="/icons/favicon_matakin.png" alt="Matakin" />
        <div>
          <h1>Melayani dengan tertib, beribadah dengan <b>tenang</b>.</h1>
          <p>Jadwal petugas, slide kebaktian, dan absensi umat — dikelola dari satu tempat.</p>
        </div>
        <div className="foot">Operasional Kebaktian · Matakin</div>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <h1 style={{ marginBottom: 6 }}>{title}</h1>
          {children}
        </div>
      </section>
    </div>
  );
}
