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
        <h1 className="text-2xl font-bold">Add an album</h1>
        <p className="text-sm text-zinc-400">
          We&apos;ll try to fetch the cover automatically — or upload your own.
        </p>
      </div>

      {sp.error && (
        <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {sp.error}
        </p>
      )}

      <AddAlbumForm />
    </div>
  );
}
