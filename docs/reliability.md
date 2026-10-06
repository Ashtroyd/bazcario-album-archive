# Profile settings and database health

The profile screen supports changing the account password after verifying the
current password. New passwords must match and contain at least 12 characters.
Save failures remain visible and never show a successful-save message.

Ratings visibility supports Friends only (default), Public, and Private.
Private ratings, reviews and monthly favourites are owner-only, including
against accepted friends. Profile identity remains discoverable to signed-in
users for friend requests. This setting does not erase previous exports or
screenshots, and covers shared album metadata are not made private.

The 2026-10-06 database check added five missing foreign-key indexes and fixed
the `can_view_user` helper so friendship does not override Private.

Broader security hardening was blocked by automatic review and deliberately
left out of this deployment: SECURITY DEFINER helper exposure and older RLS
policy inefficiencies still need a separately approved migration with full
friendship/extension regression tests. Leaked-password protection also remains
a dashboard/plan-dependent setting. No data cleanup was performed.

Verified: lint, TypeScript production build, existing unit tests, and live
database function/index inspection. Password controls are browser-tested with
mocked actions, including failed-save feedback and clearing fields on success.
Password-changing success has not been
tested against a real user's password; no user credentials were changed.
