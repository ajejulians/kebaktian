'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, type LucideIcon } from 'lucide-react';
import { APP_NAME, BrandLogo, ORG_SHORT } from '@/components/Brand';
import { cn } from '@/lib/utils';

// Desktop: kolom navy 240px. Di bawah md: bilah atas satu baris (hanya ikon).
export function Sidebar({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-label="Navigasi utama"
      className="sticky top-0 z-20 flex bg-navy-dark text-on-navy-2 max-md:items-center max-md:gap-1 max-md:overflow-x-auto max-md:px-3 max-md:py-2 md:h-screen md:flex-col md:justify-between md:px-4 md:pt-[30px] md:pb-[22px]"
    >
      {children}
    </aside>
  );
}

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 md:px-1.5">
      <BrandLogo className="size-7 md:size-10" />
      <div className="flex flex-col gap-1 max-md:sr-only">
        <span className="text-sm leading-none font-bold text-white">{APP_NAME}</span>
        <span className="text-[10px] leading-none tracking-[0.1em] text-[#A8BCD0]">{ORG_SHORT}</span>
      </div>
    </div>
  );
}

export function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[5px] max-md:flex-row max-md:items-center">
      <span className="pb-1.5 text-[10px] font-bold tracking-[0.11em] text-[#91A9BF] uppercase max-md:sr-only">{label}</span>
      {children}
    </div>
  );
}

interface NavItemProps { href: string; icon: LucideIcon; children: string }

export function NavItem({ href, icon: Icon, children }: NavItemProps) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      title={children}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-[42px] items-center gap-3 rounded-md px-3 text-[13px] max-md:h-10 max-md:px-2.5 whitespace-nowrap no-underline transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gold/70',
        active ? 'bg-navy-active font-semibold text-white' : 'text-on-navy-2 hover:bg-navy-active/50 hover:text-white'
      )}
    >
      <Icon aria-hidden className={cn('size-[18px] shrink-0', active ? 'text-gold-icon' : 'text-on-navy-3')} />
      <span className="max-md:sr-only">{children}</span>
    </Link>
  );
}

export function SidebarUser({ name, role, onLogout }: { name: string; role: string; onLogout: () => void }) {
  return (
    <div className="flex flex-col gap-[18px] max-md:ml-auto">
      <hr className="border-t border-navy-rule max-md:hidden" />
      <div className="flex items-center gap-2.5 max-md:gap-1">
        <span aria-hidden className="grid size-9 max-md:size-8 shrink-0 place-items-center rounded-full bg-gold text-sm font-bold text-navy-dark">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px] max-md:sr-only">
          <span className="truncate text-[13px] leading-none font-semibold text-white">{name}</span>
          <span className="text-[11px] leading-none text-on-navy-3">{role}</span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Keluar"
          title="Keluar"
          className="grid size-8 shrink-0 place-items-center rounded-md text-[#B8CAD9] transition-colors outline-none hover:bg-navy-active/50 hover:text-white focus-visible:ring-2 focus-visible:ring-gold/70"
        >
          <LogOut aria-hidden className="size-[17px]" />
        </button>
      </div>
    </div>
  );
}
