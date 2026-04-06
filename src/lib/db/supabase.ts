import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return _client;
}

// Mantém compatibilidade com imports existentes
export const supabase = {
  from: (...args: Parameters<ReturnType<typeof createBrowserClient>["from"]>) =>
    getSupabase().from(...args),
  storage: {
    from: (...args: any[]) => getSupabase().storage.from(...args),
  },
  auth: {
    signInWithPassword: (...args: any[]) =>
      getSupabase().auth.signInWithPassword(...args),
    signUp: (...args: any[]) => getSupabase().auth.signUp(...args),
    signOut: () => getSupabase().auth.signOut(),
    getSession: () => getSupabase().auth.getSession(),
    getUser: () => getSupabase().auth.getUser(),
  },
};
