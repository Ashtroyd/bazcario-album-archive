import { AddAlbumForm } from "@/components/AddAlbumForm";

export default async function NewAlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">Add an album</h1>
        <p className="text-sm text-muted">
          We&apos;ll try to fetch the cover automatically — or upload your own.
        </p>
      </div>

      {sp.error && (
        <p className="rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent">
          {sp.error}
        </p>
      )}

      <AddAlbumForm />
    </div>
  );
}
