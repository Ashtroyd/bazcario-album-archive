"use client";

import { useState, useTransition } from "react";
import {
  createExtensionToken,
  revokeExtensionToken,
} from "@/app/actions/profile";
import type { ExtensionAccessToken } from "@/lib/types";

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function SpotifyExtensionCard({
  connections,
}: {
  connections: ExtensionAccessToken[];
}) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await createExtensionToken();
      if (!result.ok) setError(result.error);
      else setToken(result.token);
    });
  }

  function revoke(id: string) {
    startTransition(async () => revokeExtensionToken(id));
  }

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section id="spotify-extension" className="card scroll-mt-24 space-y-4">
      <div>
        <div className="text-[10px] tracking-[0.16em] text-muted uppercase">
          Desktop listening
        </div>
        <h2 className="mt-1 font-serif text-xl font-bold text-ink">
          Spotify extension
        </h2>
        <p className="mt-1 text-sm text-muted">
          Rate the current track from the Album Archive panel inside Spotify.
        </p>
      </div>

      {token ? (
        <div className="rounded-xl border border-sage bg-sage-soft p-3">
          <p className="text-xs font-semibold text-ink">Copy this token now</p>
          <p className="mt-1 text-xs text-muted">
            It is only shown once. Paste it into the extension’s connection screen.
          </p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-paper px-3 py-2 text-xs whitespace-nowrap text-body">
              {token}
            </code>
            <button type="button" onClick={copyToken} className="btn btn-primary shrink-0 text-xs">
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={generate} disabled={pending} className="btn btn-primary">
          {pending ? "Creating…" : "Create connection token"}
        </button>
      )}

      {error && <p className="text-sm text-accent">{error}</p>}

      {connections.length > 0 && (
        <div className="space-y-2 border-t border-line pt-3">
          <div className="label">Connected installations</div>
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ivory px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">{connection.label}</div>
                <div className="text-xs text-muted">
                  {connection.last_used_at
                    ? `Used ${shortDate(connection.last_used_at)}`
                    : "Not used yet"}
                  {` · expires ${shortDate(connection.expires_at)}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => revoke(connection.id)}
                disabled={pending}
                className="btn btn-danger shrink-0 px-3 py-1.5 text-xs"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
