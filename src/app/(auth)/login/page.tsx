"use client";

import { useCallback, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    },
    [email, password, router],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f0eb] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold tracking-tight text-[#f28a5c]">
            AttackDesk
          </Link>
          <p className="mt-2 text-sm text-[#5e5b55]">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-white px-8 py-10 shadow-sm"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1e1b15]">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#d4cdc6] px-4 py-2.5 text-sm text-[#1e1b15] outline-none transition-colors focus:border-[#f28a5c] focus:ring-1 focus:ring-[#f28a5c]"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#1e1b15]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#d4cdc6] px-4 py-2.5 text-sm text-[#1e1b15] outline-none transition-colors focus:border-[#f28a5c] focus:ring-1 focus:ring-[#f28a5c]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#f28a5c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07a4a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-5 text-center text-xs text-[#8e8a85]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-[#f28a5c] hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
