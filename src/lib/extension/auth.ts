import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const TOKEN_PREFIX = "baa_ext_";

export type ExtensionAuth = {
  admin: ReturnType<typeof createAdminClient>;
  tokenId: string;
  userId: string;
};

export function hashExtensionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateExtensionRequest(
  request: Request,
): Promise<ExtensionAuth | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!token.startsWith(TOKEN_PREFIX) || token.length < TOKEN_PREFIX.length + 32) {
    return null;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("extension_access_tokens")
    .select("id, user_id, expires_at, revoked_at")
    .eq("token_hash", hashExtensionToken(token))
    .maybeSingle();

  if (
    !data ||
    data.revoked_at ||
    new Date(data.expires_at).getTime() <= Date.now()
  ) {
    return null;
  }

  // Best effort: authentication should not fail because usage telemetry did.
  void admin
    .from("extension_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { admin, tokenId: data.id as string, userId: data.user_id as string };
}
