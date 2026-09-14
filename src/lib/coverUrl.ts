const MAX_REDIRECTS = 4;
const MAX_COVER_BYTES = 12 * 1024 * 1024;

type CoverFetcher = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

function isDomainOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function supabaseCoverHost(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

function isProviderCoverUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();

  if (isDomainOrSubdomain(hostname, "mzstatic.com")) {
    return url.pathname.startsWith("/image/");
  }
  if (hostname === "i.scdn.co") {
    return url.pathname.startsWith("/image/");
  }
  if (hostname === "coverartarchive.org") {
    return /^\/release-group\/[0-9a-f-]{36}\/front(?:-\d+)?$/i.test(
      url.pathname,
    );
  }
  if (hostname === "archive.org") {
    return (
      url.pathname.startsWith("/download/") &&
      /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname)
    );
  }
  if (hostname.endsWith(".archive.org")) {
    return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
  }
  return false;
}

/**
 * Accept only HTTPS cover URLs from providers the application itself uses.
 * Client-provided hidden fields and database values must both pass this check.
 */
export function normalizeTrustedCoverUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }

    const providerUrl = isProviderCoverUrl(url);
    const storageHost = supabaseCoverHost();
    const ownCoverStorage =
      storageHost === hostname &&
      url.pathname.startsWith("/storage/v1/object/public/covers/");

    return providerUrl || ownCoverStorage ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Download a trusted cover without following an unchecked redirect. Every hop
 * is revalidated, and unexpectedly large/non-image responses are discarded.
 */
export async function downloadTrustedCover(
  value: unknown,
  fetcher: CoverFetcher = (input, init) => fetch(input, init),
): Promise<Buffer | null> {
  let current = normalizeTrustedCoverUrl(value);
  if (!current) return null;

  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const response = await fetcher(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirects === MAX_REDIRECTS) return null;
        current = normalizeTrustedCoverUrl(new URL(location, current).toString());
        if (!current) return null;
        continue;
      }

      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().startsWith("image/")) return null;

      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_COVER_BYTES) {
        return null;
      }

      if (!response.body) return null;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        totalBytes += chunk.byteLength;
        if (totalBytes > MAX_COVER_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(chunk);
      }

      return Buffer.concat(chunks, totalBytes);
    }
  } catch {
    return null;
  }

  return null;
}
