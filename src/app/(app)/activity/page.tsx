import { ActivityNotifications } from "@/components/ActivityNotifications";
import { ActivityReleases } from "@/components/ActivityReleases";
import { ActivityTabs, type ActivityView } from "@/components/ActivityTabs";
import { createClient } from "@/lib/supabase/server";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const active: ActivityView = view === "releases" ? "releases" : "notifications";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Activity</h1>
          <p className="text-sm text-muted">
            {active === "notifications"
              ? "Friend requests, comments, and ratings worth comparing."
              : "New music from the artists you follow."}
          </p>
        </div>
        <ActivityTabs active={active} />
      </div>

      {active === "releases" ? (
        <ActivityReleases userId={user!.id} />
      ) : (
        <ActivityNotifications userId={user!.id} />
      )}
    </div>
  );
}
