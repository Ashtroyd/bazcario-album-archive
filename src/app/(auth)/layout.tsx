import { IconHeadphones } from "@/components/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-6 text-center">
        <h1 className="flex items-center justify-center gap-2.5 text-2xl font-bold tracking-tight">
          <IconHeadphones size={26} className="text-violet-400" />
          Bazcario&apos;s Album Archive
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Rate albums track-by-track. Compare with friends.
        </p>
      </div>
      {children}
    </div>
  );
}
