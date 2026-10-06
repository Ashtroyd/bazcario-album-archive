"use client";

import { useState } from "react";
import { changePassword } from "@/app/actions/profile";

export function PasswordSettingsCard() {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(formData: FormData) {
    setSaving(true); setError(null); setMessage(null);
    try {
      const result = await changePassword(formData);
      if (result.error) { setError(result.error); return; }
      setEditing(false); setMessage("Password changed.");
    } catch { setError("Couldn't change your password. Check your connection and try again."); }
    finally { setSaving(false); }
  }
  return <section className="card space-y-3" aria-labelledby="password-settings">
    <h2 id="password-settings" className="font-semibold text-ink">Password</h2>
    {message && <p role="status" className="text-sm text-body">{message}</p>}
    {!editing ? <button type="button" className="btn btn-outline text-sm" onClick={() => { setEditing(true); setError(null); setMessage(null); }}>Change password</button> :
      <form action={submit} className="space-y-3">
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <div><label className="label" htmlFor="current-password">Current password</label><input id="current-password" name="current_password" type="password" autoComplete="current-password" required disabled={saving} className="input" /></div>
        <div><label className="label" htmlFor="new-password">New password</label><input id="new-password" name="new_password" type="password" autoComplete="new-password" minLength={12} required disabled={saving} className="input" /><p className="mt-1 text-xs text-muted">Use at least 12 characters.</p></div>
        <div><label className="label" htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" required disabled={saving} className="input" /></div>
        <div className="flex gap-2"><button type="button" disabled={saving} className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button><button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Saving…" : "Update password"}</button></div>
      </form>}
  </section>;
}
