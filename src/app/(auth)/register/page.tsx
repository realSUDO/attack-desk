"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setFieldErrors({});
      setLoading(true);

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!data.success) {
          if (data.error?.fields) {
            setFieldErrors(data.error.fields);
          } else {
            setError(data.message || "Registration failed");
          }
          setLoading(false);
          return;
        }

        setSuccess(true);
      } catch {
        setError("Unable to connect. Please try again.");
        setLoading(false);
      }
    },
    [name, email, password],
  );

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl bg-surface px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-on-surface">Check your email</h1>
          <p className="mb-6 text-sm text-on-surface-variant">
            We sent a verification link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold tracking-tight text-primary">
            AttackDesk
          </Link>
          <p className="mt-2 text-sm text-on-surface-variant">Create your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-surface px-8 py-10 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-on-surface">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-outline bg-transparent px-4 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Your name"
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-error">{fieldErrors.name}</p>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-on-surface">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-outline bg-transparent px-4 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-error">{fieldErrors.email}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-on-surface">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-outline bg-transparent px-4 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="At least 6 characters"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-error">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="mt-5 text-center text-xs text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
