import Link from "next/link";
import { login } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.redirect ?? "/";

  return (
    <div className="card w-full max-w-sm">
      <h2 className="mb-4 text-lg font-semibold">Sign in</h2>

      {sp.message && (
        <p className="mb-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {sp.message}
        </p>
      )}
      {sp.error && (
        <p className="mb-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {sp.error}
        </p>
      )}

      <form action={login} className="space-y-3">
        <input type="hidden" name="redirect" value={next} />
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            placeholder="••••••••"
          />
        </div>
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs text-violet-400 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Sign in
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-400">
        No account?{" "}
        <Link href="/signup" className="text-violet-400 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
