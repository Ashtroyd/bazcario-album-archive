import { authenticateExtensionRequest } from "@/lib/extension/auth";
import {
  extensionJson,
  extensionOptions,
  extensionUnauthorized,
} from "@/lib/extension/http";

export function OPTIONS() {
  return extensionOptions();
}

export async function GET(request: Request) {
  const auth = await authenticateExtensionRequest(request);
  if (!auth) return extensionUnauthorized();

  const { data: profile } = await auth.admin
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", auth.userId)
    .maybeSingle();

  return extensionJson({
    displayName:
      typeof profile?.display_name === "string" && profile.display_name.trim()
        ? profile.display_name.trim()
        : "Your account",
    avatarUrl:
      typeof profile?.avatar_url === "string" && profile.avatar_url.trim()
        ? profile.avatar_url
        : null,
  });
}
