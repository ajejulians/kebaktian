import { CircleAlert, CircleCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { Msg } from '@/lib/types';

// Satu tempat untuk pesan sukses/galat dari bentuk { ok } | { err }.
export default function Notice({ msg, className }: { msg: Msg | null; className?: string }) {
  if (!msg) return null;
  const bad = !!msg.err;
  return (
    <Alert variant={bad ? 'destructive' : 'success'} className={cn('my-4', className)}>
      {bad ? <CircleAlert /> : <CircleCheck />}
      <AlertDescription>{msg.err || msg.ok}</AlertDescription>
    </Alert>
  );
}
