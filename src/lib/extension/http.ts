const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
} as const;

export function extensionJson(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...init.headers },
  });
}

export function extensionOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function extensionUnauthorized(): Response {
  return extensionJson(
    { error: "This Album Archive connection is missing, expired, or revoked." },
    { status: 401 },
  );
}

export function isSpotifyId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9]{22}$/.test(value);
}
