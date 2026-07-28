import Link from "next/link";
import { login } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    redirect?: string;
    email?: string;
  }>;
}) {
  const sp = await searchParams;
  const next = sp.redirect ?? "/";

  return (
    <div className="card w-full max-w-sm">
      <h2 className="mb-4 font-serif text-xl font-semibold text-ink">Sign in</h2>

      {sp.message && (
        <p className="mb-3 rounded-lg border border-sage/40 bg-sage-soft px-3 py-2 text-sm text-sage">
          {sp.message}
        </p>
      )}
      {sp.error && (
        <p className="mb-3 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent">
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
            defaultValue={sp.email ?? ""}
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
            className="text-xs text-accent hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Sign in
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        No account?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
