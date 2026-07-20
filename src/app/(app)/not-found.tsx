import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h2 className="text-lg font-semibold">Not found</h2>
      <p className="mt-1 text-sm text-muted">
        That page or album doesn&apos;t exist.
      </p>
      <Link href="/albums" className="btn btn-primary mt-4">
        Back to library
      </Link>
    </div>
  );
}
