"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card mx-auto max-w-md text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm text-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="btn btn-primary mt-4">
        Try again
      </button>
    </div>
  );
}
