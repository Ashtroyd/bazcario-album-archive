"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";
import { Avatar } from "@/components/Avatar";
import { startTour } from "@/lib/tour-bus";
import type { Visibility } from "@/lib/types";

const visibilityLabels = { friends: "Friends only", public: "Public", private: "Private" };

/** The profile's avatar/name/email settings, collapsed to a view with an Edit button. */
export function ProfileSettingsCard({
  avatarUrl,
  displayName,
  email,
  visibility,
}: {
  avatarUrl: string | null;
  displayName: string | null;
  email: string | null;
  visibility: Visibility;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    try {
      const result = await updateProfile(formData);
      if (result.error) { setError(result.error); return; }
      setEditing(false); router.refresh();
    } catch { setError("Couldn't save your profile. Check your connection and try again."); }
    finally { setSaving(false); }
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
          <span className="chip">{visibilityLabels[visibility]}</span>
          <p className="mt-1 text-xs text-muted">
            {visibility === "private" ? "Your ratings are visible only to you." : visibility === "public" ? "Your ratings are public." : "Your ratings are visible to you and your accepted friends."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn btn-outline text-sm"
          >
            Edit profile
          </button>
          <button
            type="button"
            onClick={() => startTour()}
            className="btn btn-ghost text-sm"
          >
            Take a tour
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="card space-y-4">
      {error && <p role="alert" className="text-sm text-accent">{error}</p>}
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
        <label className="label" htmlFor="visibility">Ratings visibility</label>
        <select id="visibility" name="visibility" defaultValue={visibility} className="input">
          <option value="friends">Friends only</option>
          <option value="public">Public</option>
          <option value="private">Private — only me</option>
        </select>
        <p className="mt-1 text-xs text-muted">
          Controls ratings, reviews and monthly favourites. Your name remains discoverable to signed-in users for friend requests.
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
