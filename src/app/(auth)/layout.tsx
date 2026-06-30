export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          🎧 Bazcario&apos;s Album Archive
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Rate albums track-by-track. Compare with friends.
        </p>
      </div>
      {children}
    </div>
  );
}
