import Link from "next/link";
import { signup } from "@/app/actions/auth";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="card w-full max-w-sm">
      <h2 className="mb-4 font-serif text-xl font-semibold text-ink">
        Create your account
      </h2>

      {sp.error && (
        <p className="mb-3 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent">
          {sp.error}
        </p>
      )}

      <form action={signup} className="space-y-3">
        <div>
          <label className="label" htmlFor="display_name">
            Display name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            className="input"
            placeholder="Bazcario"
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={6}
            className="input"
            placeholder="At least 6 characters"
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Sign up
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
