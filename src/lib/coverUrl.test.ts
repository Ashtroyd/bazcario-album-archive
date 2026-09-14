import assert from "node:assert/strict";
import test from "node:test";
import {
  downloadTrustedCover,
  normalizeTrustedCoverUrl,
} from "./coverUrl";

test("accepts the application's cover providers", () => {
  assert.equal(
    normalizeTrustedCoverUrl("https://is1-ssl.mzstatic.com/image/thumb/cover.jpg"),
    "https://is1-ssl.mzstatic.com/image/thumb/cover.jpg",
  );
  assert.equal(
    normalizeTrustedCoverUrl(
      "https://coverartarchive.org/release-group/12345678-1234-1234-1234-123456789abc/front-500",
    ),
    "https://coverartarchive.org/release-group/12345678-1234-1234-1234-123456789abc/front-500",
  );
  assert.equal(
    normalizeTrustedCoverUrl("https://archive.org/download/example/cover.jpg"),
    "https://archive.org/download/example/cover.jpg",
  );
  assert.equal(
    normalizeTrustedCoverUrl("https://i.scdn.co/image/ab67616d00001e02example"),
    "https://i.scdn.co/image/ab67616d00001e02example",
  );
  assert.equal(
    normalizeTrustedCoverUrl(
      "https://dn123.ca.archive.org/0/items/example/cover.jpg",
    ),
    "https://dn123.ca.archive.org/0/items/example/cover.jpg",
  );
});

test("accepts only the configured Supabase project's public covers", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  try {
    assert.equal(
      normalizeTrustedCoverUrl(
        "https://project.supabase.co/storage/v1/object/public/covers/user/cover.jpg",
      ),
      "https://project.supabase.co/storage/v1/object/public/covers/user/cover.jpg",
    );
    assert.equal(
      normalizeTrustedCoverUrl(
        "https://other.supabase.co/storage/v1/object/public/covers/cover.jpg",
      ),
      null,
    );
    assert.equal(
      normalizeTrustedCoverUrl(
        "https://project.supabase.co/storage/v1/object/public/avatars/avatar.jpg",
      ),
      null,
    );
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});

test("rejects internal, insecure, credentialed, and lookalike URLs", () => {
  const rejected = [
    "http://is1-ssl.mzstatic.com/cover.jpg",
    "https://127.0.0.1/cover.jpg",
    "https://[::1]/cover.jpg",
    "https://169.254.169.254/latest/meta-data",
    "https://mzstatic.com.example.com/cover.jpg",
    "https://user:password@archive.org/cover.jpg",
    "https://archive.org:8443/cover.jpg",
    "https://archive.org/redirect?url=http://127.0.0.1/admin",
    "https://coverartarchive.org/release-group/not-a-uuid/front-500",
    "not a url",
  ];

  for (const value of rejected) {
    assert.equal(normalizeTrustedCoverUrl(value), null, value);
  }
});

test("does not follow a redirect to an untrusted destination", async () => {
  let requests = 0;
  const result = await downloadTrustedCover(
    "https://coverartarchive.org/release-group/12345678-1234-1234-1234-123456789abc/front-500",
    async () => {
      requests += 1;
      return new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" },
      });
    },
  );

  assert.equal(result, null);
  assert.equal(requests, 1);
});

test("downloads a small image response from a trusted URL", async () => {
  const result = await downloadTrustedCover(
    "https://is1-ssl.mzstatic.com/image/thumb/cover.jpg",
    async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/jpeg" },
      }),
  );

  assert.deepEqual(result, Buffer.from([1, 2, 3]));
});
