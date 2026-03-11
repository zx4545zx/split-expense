import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';
import type { Database } from './database.types';

// Browser client for client-side usage
export const createClient = () => {
  return createBrowserClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  );
};

// Server client for SSR
export const createServerSupabaseClient = (cookies: {
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options: Record<string, any>) => void;
  delete: (name: string, options: Record<string, any>) => void;
}) => {
  return createServerClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    {
      cookies: {
        get: (key) => cookies.get(key),
        set: (key, value, options) => cookies.set(key, value, options),
        remove: (key, options) => cookies.delete(key, options),
      },
    }
  );
};

// Client singleton for browser usage
let browserClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (isBrowser()) {
    if (!browserClient) {
      browserClient = createClient();
    }
    return browserClient;
  }
  return null;
};
