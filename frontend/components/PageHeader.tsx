import type { ReactNode } from 'react';

interface PageHeaderProps {
  trail: string[];
  title: string;
  description?: string;
  actions?: ReactNode;
}

// Breadcrumb + judul + deskripsi halaman, sesuai desain halaman Petugas.
export default function PageHeader({ trail, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-7">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-3 text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
          {trail.map((t, i) => (
            <li key={t} className="flex items-center gap-3" aria-current={i === trail.length - 1 ? 'page' : undefined}>
              {i > 0 && <span aria-hidden>/</span>}
              {t}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
