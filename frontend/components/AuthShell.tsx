import type { ReactNode } from 'react';
import { BrandLogo, ORG_FULL } from '@/components/Brand';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
}

// Tata letak halaman masuk/daftar: panel identitas navy di kiri, formulir di kanan.
// Di bawah lg panel menyusut menjadi pita identitas di atas formulir.
export default function AuthShell({ eyebrow, title, description, footer, children }: AuthShellProps) {
  return (
    <div className="grid min-h-screen bg-warm lg:grid-cols-[2fr_3fr]">
      <aside className="flex flex-col justify-between gap-10 bg-navy-dark px-6 py-5 text-white lg:px-14 lg:pt-[52px] lg:pb-11">
        <div className="flex items-center gap-3.5">
          <BrandLogo className="size-11" />
          <div className="flex flex-col gap-[3px]">
            <span className="text-xs font-bold tracking-[0.09em]">OPERASIONAL KEBAKTIAN</span>
            <span className="text-[11px] text-[#B5C6D6]">{ORG_FULL}</span>
          </div>
        </div>

        <div className="hidden flex-col gap-[25px] lg:flex">
          <span className="text-[11px] font-bold tracking-[0.16em] text-gold-on-navy">BERSAMA DALAM PELAYANAN</span>
          <p className="text-[44px] leading-[1.2] font-semibold">Melayani dengan tertib, beribadah dengan tenang.</p>
          <p className="max-w-[400px] text-[15px] leading-[1.7] text-[#C2D0DC]">
            Satu tempat untuk mengelola jadwal petugas, materi kebaktian, dan kehadiran umat.
          </p>
        </div>

        <div className="hidden flex-col gap-[18px] lg:flex">
          <hr className="border-t border-[#49617A]" />
          <p className="text-xs text-[#B5C6D6]">
            <span className="font-han">惟德動天</span>  ·  Hanya kebajikan Tuhan berkenan
          </p>
        </div>
      </aside>

      <main className="flex flex-col items-center justify-between gap-8 px-6 py-8 lg:px-[72px] lg:pt-11 lg:pb-9">
        <p className="flex w-full justify-end gap-2 text-[13px] text-muted-foreground">
          Butuh bantuan? <span className="font-semibold text-fg-2">Hubungi admin</span>
        </p>

        <div className="w-full max-w-[400px] py-6">
          <span className="text-[11px] font-bold tracking-[0.14em] text-gold-eyebrow">{eyebrow}</span>
          <h1 className="mt-4 text-[32px] leading-tight font-semibold text-[#172B3F]">{title}</h1>
          <p className="mt-2.5 text-sm text-muted-foreground">{description}</p>
          <div className="mt-[38px]">{children}</div>
          {footer && <div className="mt-7 flex justify-center gap-1.5 text-[13px] text-muted-foreground">{footer}</div>}
        </div>

        <div className="flex w-full flex-wrap justify-between gap-x-6 gap-y-1 text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Operasional Kebaktian · MATAKIN</span>
          <span>Portal internal pelayanan</span>
        </div>
      </main>
    </div>
  );
}
