import { Avatar } from "@/components/Avatar";
import { IconDisc } from "@/components/icons";

export type AlbumLibraryFriend = {
  name: string | null;
  avatarUrl: string | null;
};

export function AlbumLibraryStatus({
  isInMyLibrary,
  friends,
}: {
  isInMyLibrary: boolean;
  friends: AlbumLibraryFriend[];
}) {
  const primaryFriend = friends[0];
  const primaryName = primaryFriend?.name?.trim() || "A friend";
  const isFromFriends = !isInMyLibrary && friends.length > 0;

  const label = isInMyLibrary
    ? "Your library"
    : isFromFriends
      ? friends.length === 1
        ? "Friend’s library"
        : "Friends’ libraries"
      : "Shared catalogue";

  const heading = isInMyLibrary
    ? "This is your rating space"
    : isFromFriends
      ? friends.length === 1
        ? `${primaryName} has rated this album`
        : `${primaryName} and ${friends.length - 1} more ${friends.length === 2 ? "friend have" : "friends have"} rated this album`
      : "Not in your library yet";

  const description = isInMyLibrary
    ? "The track scores, listening details and notes below belong only to your account."
    : isFromFriends
      ? "You haven’t rated it yet. Anything you add below saves only to your account and adds the album to Mine."
      : "Start rating below to add it to Mine. Your scores and notes stay separate from everyone else’s.";

  return (
    <aside
      aria-label="Album library status"
      className="animate-context-in rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(38,37,33,0.06)]"
    >
      <div className="flex gap-3 p-4 sm:items-center sm:p-5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isInMyLibrary ? "bg-ink text-paper" : isFromFriends ? "bg-ivory text-body" : "border border-dashed border-line-strong text-muted"}`}
          aria-hidden="true"
        >
          {isFromFriends ? (
            <Avatar
              url={primaryFriend.avatarUrl}
              name={primaryFriend.name}
              size={40}
            />
          ) : (
            <IconDisc size={20} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
            {label}
          </div>
          <h2 className="font-serif text-lg font-semibold text-ink">
            {heading}
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">
            {description}
          </p>
        </div>
      </div>
    </aside>
  );
}
