import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client that BYPASSES Row Level Security.
 *
 * Server-only. Never import this into a Client Component or expose the
 * service-role key to the browser. Used by the one-time import script and
 * any trusted server-side admin task.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createSupabaseClient<any>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
