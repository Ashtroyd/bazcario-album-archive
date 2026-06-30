"use client";

import { useState, useTransition } from "react";
import {
  searchUsers,
  sendFriendRequest,
  type FoundUser,
} from "@/app/actions/friends";
import { Avatar } from "@/components/Avatar";

export function AddFriendSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await searchUsers(q);
      setResults(r);
      setSearched(true);
    });
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold">Add a friend</h2>
      <form onSubmit={doSearch} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
          className="input"
        />
        <button
          type="submit"
          disabled={pending || q.trim().length < 2}
          className="btn btn-outline whitespace-nowrap"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-sm text-zinc-500">No users found.</p>
      )}

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((u) => (
            <li key={u.id} className="flex items-center gap-2">
              <Avatar url={u.avatar_url} name={u.display_name} size={28} />
              <span className="text-sm">{u.display_name ?? u.email}</span>
              <form action={sendFriendRequest} className="ml-auto">
                <input type="hidden" name="friend_id" value={u.id} />
                <button type="submit" className="btn btn-primary px-3 py-1 text-xs">
                  Add
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
