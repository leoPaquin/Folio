import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseConfigured } from './config';

export async function createClient() {
  if (!supabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(values) {
          try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Components cannot write cookies; proxy.ts refreshes them. */ }
        },
      },
    },
  );
}

export async function authenticatedClient() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null };
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : data.user };
}
