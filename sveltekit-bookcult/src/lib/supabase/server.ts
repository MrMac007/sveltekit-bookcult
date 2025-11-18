import { createServerClient } from '@supabase/ssr';
import { type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function createClient(cookies: any) {
  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookies.get(name);
      },
      set(name: string, value: string, options: any) {
        cookies.set(name, value, { ...options, path: '/' });
      },
      remove(name: string, options: any) {
        cookies.delete(name, { ...options, path: '/' });
      },
    },
  });
}
