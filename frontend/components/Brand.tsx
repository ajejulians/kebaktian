import { cn } from '@/lib/utils';

// Nama di desain ditandai "sementara"; ubah di sini bila nama final sudah ada.
export const APP_NAME = 'Ruang Kebaktian';
export const ORG_SHORT = 'MATAKIN';
export const ORG_FULL = 'Majelis Tinggi Agama Khonghucu Indonesia';

export function BrandLogo({ className }: { className?: string }) {
  return <img src="/icons/favicon_matakin.png" alt="" width={44} height={44} className={cn('shrink-0 object-contain', className)} />;
}
