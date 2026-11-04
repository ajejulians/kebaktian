import { supabase } from './supabase';

export async function api<T = any>(
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token || ''}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json as T;
}

export function youtubeId(url: string): string | null {
  const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export async function uploadBackground(file: File): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/backgrounds', {
    method: 'POST',
    headers: { 'Content-Type': file.type, Authorization: `Bearer ${data.session?.access_token || ''}` },
    body: file,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || (res.status === 413 ? 'Ukuran file maksimal 5 MB' : `Error ${res.status}`));
  return json.url as string;
}
