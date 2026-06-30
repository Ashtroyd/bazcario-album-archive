import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for Server Components, Route Handlers, and
 * Server Actions. Runs as the signed-in user, so Row Level Security applies.
 *
 * Next.js 16: `cookies()` is async and must be awaited.
 */
export async function createClient() {
  const cookieStore = await cookies();

  // Permissive schema generic (see client.ts).
  return createServerClient<any>( // eslint-disable-line @typescript-eslint/no-explicit-any
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, where setting
            // cookies is not allowed. Safe to ignore — the middleware
            // refreshes the session on every request.
          }
        },
      },
    },
  );
}
