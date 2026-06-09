"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    token ? "verifying" : "error",
  );
  const [message, setMessage] = useState("");

  const verify = useCallback(async () => {
    if (!token) {
      setMessage("No verification token provided.");
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage("Email verified! You can now sign in.");
      } else {
        setStatus("error");
        setMessage(data.message || "Verification failed.");
      }
    } catch {
      setStatus("error");
      setMessage("Unable to verify. Please try again.");
    }
  }, [token]);

  useEffect(() => {
    if (token) verify();
  }, [token, verify]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl bg-surface px-8 py-10 text-center shadow-sm">
        {status === "verifying" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-primary/20" />
            <h1 className="mb-2 text-xl font-semibold text-on-surface">Verifying…</h1>
            <p className="text-sm text-on-surface-variant">Please wait while we verify your email.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-semibold text-on-surface">{message}</h1>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
            >
              Sign in
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mb-2 text-xl font-semibold text-on-surface">Verification failed</h1>
            <p className="mb-6 text-sm text-on-surface-variant">{message || "Invalid or expired token."}</p>
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Go to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl bg-surface px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-primary/20" />
          <h1 className="mb-2 text-xl font-semibold text-on-surface">Verifying…</h1>
          <p className="text-sm text-on-surface-variant">Please wait while we verify your email.</p>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
