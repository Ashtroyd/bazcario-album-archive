"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";
import { Avatar } from "@/components/Avatar";

/** The profile's avatar/name/email settings, collapsed to a view with an Edit button. */
export function ProfileSettingsCard({
  avatarUrl,
  displayName,
  email,
}: {
  avatarUrl: string | null;
  displayName: string | null;
  email: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    await updateProfile(formData);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <Avatar url={avatarUrl} name={displayName} size={64} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-ink">
              {displayName || "—"}
            </div>
            <div className="truncate text-sm text-muted">{email}</div>
          </div>
        </div>
        <div>
          <span className="chip">Friends-only (default)</span>
          <p className="mt-1 text-xs text-muted">
            A public/private toggle is coming. For now, your ratings are
            visible only to you and your accepted friends.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="btn btn-outline text-sm"
        >
          Edit profile
        </button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="card space-y-4">
      <div className="flex items-center gap-4">
        <Avatar url={avatarUrl} name={displayName} size={64} />
        <div className="min-w-0 flex-1">
          <label className="label" htmlFor="avatar">
            Avatar
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            className="block w-full max-w-full text-xs text-muted file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-ivory file:px-2.5 file:py-1.5 file:text-body"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="display_name">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={displayName ?? ""}
          className="input"
        />
      </div>

      <div>
        <label className="label">Email</label>
        <input
          type="email"
          value={email ?? ""}
          disabled
          className="input opacity-60"
        />
      </div>

      <div>
        <label className="label">Visibility</label>
        <span className="chip">Friends-only (default)</span>
        <p className="mt-1 text-xs text-muted">
          A public/private toggle is coming. For now, your ratings are
          visible only to you and your accepted friends.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="btn btn-outline text-sm"
        >
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
