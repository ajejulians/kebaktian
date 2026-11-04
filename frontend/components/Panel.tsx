import type { ComponentProps, ReactNode } from 'react';
import { Info, Search } from 'lucide-react';
import { IconInput } from '@/components/ui/icon-input';
import { cn } from '@/lib/utils';

// Blok bangunan halaman daftar/kelola (Absensi, User, Umat, Audit, Dashboard) sesuai desain.

export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('overflow-hidden rounded-[9px] border border-border bg-card', className)} {...props} />;
}

export function PanelHeader({ title, description, aside, children, className }: { title: string; description?: string; aside?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-[18px] p-5 sm:p-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="m-0 text-base font-bold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

export function CountChip({ children }: { children: ReactNode }) {
  return <span className="rounded-[5px] bg-[#EFF4F6] px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap text-[#526D7D]">{children}</span>;
}

export function PanelFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap justify-between gap-x-4 gap-y-1 border-t px-5 py-4 text-[11px] text-muted-foreground sm:px-6', className)}>{children}</div>;
}

export function SearchField({ className, ...props }: Omit<ComponentProps<typeof IconInput>, 'icon' | 'fieldSize'>) {
  return <IconInput icon={Search} type="search" fieldSize="md" wrapperClassName={cn('h-11', className)} {...props} />;
}

export function FilterTabs<T extends string>({ options, value, onChange, label }: { options: Record<T, string>; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {(Object.keys(options) as T[]).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={cn(
            'h-[34px] rounded-[5px] px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
            value === k ? 'bg-[#EAF0F4] font-semibold text-navy' : 'bg-card text-[#5E7281] hover:bg-[#F3F6F8]'
          )}
        >
          {options[k]}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, tone = 'slate', className }: { name: string; tone?: 'slate' | 'gold'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold',
        tone === 'gold' ? 'bg-[#F7EBD4] text-[#99743A]' : 'bg-[#EAF0F3] text-[#547081]',
        className
      )}
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}

const PILL = {
  ok: 'bg-[#E8F5EC] text-[#2F6B44]',
  bad: 'bg-[#FBEDEA] text-[#A04740]',
  warn: 'bg-warn-bg text-warn',
  gold: 'bg-[#F7EBD4] text-[#7C5C26]',
  muted: 'bg-[#F0F3F5] text-[#566B79]',
} as const;

export function StatusPill({ tone = 'muted', children, className }: { tone?: keyof typeof PILL; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex w-fit items-center rounded-[5px] px-2 py-[5px] text-[11px] leading-none font-semibold whitespace-nowrap', PILL[tone], className)}>{children}</span>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="flex items-center gap-[9px] text-xs text-muted-foreground"><Info aria-hidden className="size-[15px] shrink-0" />{children}</p>;
}

// Baris dalam panel: pembatas atas, padding konsisten.
export function Row({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-3 border-t px-5 py-4 sm:px-6', className)} {...props} />;
}
