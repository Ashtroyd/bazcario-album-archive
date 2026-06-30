import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Safe to use in Client Components.
 * Reads only the public (anon) key.
 */
export function createClient() {
  // Permissive schema generic so inserts/updates type-check; query results are
  // cast to domain types at the call sites.
  return createBrowserClient<any>( // eslint-disable-line @typescript-eslint/no-explicit-any
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
