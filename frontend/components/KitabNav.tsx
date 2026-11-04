import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AyatBab } from '@/lib/types';

interface KitabNavProps { babs: AyatBab[] | null; kitabs: AyatBab[][]; activeId: number | null; onPick: (id: number) => void; className?: string }

// Daftar kitab dan bab (dipakai dialog Tambah Ayat dan halaman Kitab).
export default function KitabNav({ babs, kitabs, activeId, onPick, className }: KitabNavProps) {
  return (
    <nav aria-label="Kitab dan bab" className={cn('flex flex-col gap-3.5 overflow-y-auto', className)}>
      {!babs && <Skeleton className="h-48" />}
      {kitabs.map((list, i) => (
        <div key={list[0].kitab} className={cn('flex flex-col gap-1.5', i > 0 && 'border-t pt-3.5')}>
          <h3 className="m-0 mb-1 font-sans text-[11px] leading-snug font-bold tracking-normal text-fg-2">
            <span className="font-han">{list[0].kitab_hanzi}</span> {list[0].kitab_nama}
          </h3>
          {list.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-current={b.id === activeId ? 'true' : undefined}
              onClick={() => onPick(b.id)}
              className={cn(
                'min-h-[34px] rounded-[5px] px-2.5 py-1.5 text-left text-[11px] leading-snug whitespace-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
                b.id === activeId ? 'bg-[#E5EEF3] font-semibold text-navy' : 'bg-transparent text-muted-foreground hover:bg-[#EEF3F6]'
              )}
            >
              {b.bab}{b.judul && <> · {b.judul}</>}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
