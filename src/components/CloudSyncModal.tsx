"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

type Phase = "confirm" | "syncing" | "done" | "error";

export function CloudSyncModal() {
  const { status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("confirm");
  const [message, setMessage] = useState("");
  const offeredRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || offeredRef.current) return;

    const check = async () => {
      const { getAllLocalData } = await import("@/lib/local-storage-db");
      const local = getAllLocalData();
      const hasData =
        local.missions.length > 0 ||
        local.deadlines.length > 0 ||
        local.posts.length > 0 ||
        local.canvases.length > 0 ||
        local.reviews.length > 0;

      if (hasData) {
        offeredRef.current = true;
        setPhase("confirm");
        setOpen(true);
      }
    };

    check();
  }, [status]);

  const handleSync = useCallback(async () => {
    setPhase("syncing");
    setMessage("Saving to cloud...");
    try {
      const { getAllLocalData, clearAllLocalData } = await import(
        "@/lib/local-storage-db"
      );
      const local = getAllLocalData();

      for (const canvas of local.canvases) {
        const res = await fetch("/api/canvases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: canvas.title,
            description: canvas.description,
            data: canvas.data,
          }),
        });
        const data = await res.json();
        const newCanvasId = data.data?.id;

        for (const mission of local.missions) {
          await fetch("/api/missions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...mission,
              canvasId: newCanvasId ?? mission.canvasId,
            }),
          });
        }

        for (const deadline of local.deadlines) {
          await fetch("/api/deadlines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(deadline),
          });
        }

        for (const post of local.posts) {
          await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...post,
              canvasId: newCanvasId ?? post.canvasId,
            }),
          });
        }

        for (const review of local.reviews) {
          await fetch("/api/weekly-reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(review),
          });
        }
      }

      clearAllLocalData();
      setPhase("done");
      setMessage("Cloud sync complete");
      router.refresh();
    } catch {
      setPhase("error");
      setMessage("Cloud sync failed");
    }
  }, [router]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleDismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-md"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== "syncing")
          handleDismiss();
      }}
    >
      <div className="border-outline-variant bg-surface w-full max-w-sm border">
        <div className="border-outline-variant flex items-center justify-between border-b px-md py-sm">
          <h2 className="font-headline-md text-headline-md">
            {phase === "confirm"
              ? "Sync to Cloud?"
              : phase === "syncing"
                ? "Syncing..."
                : phase === "done"
                  ? "Synced"
                  : "Sync Failed"}
          </h2>
          {phase !== "syncing" && (
            <button
              type="button"
              onClick={handleDismiss}
              className="text-on-surface-variant hover:text-primary"
            >
              <MaterialIcon name="close" size={18} />
            </button>
          )}
        </div>

        <div className="p-lg">
          {phase === "confirm" && (
            <>
              <p className="font-body-md text-on-surface-variant mb-md">
                You have data saved locally on this device. Would you like to
                sync it to your account?
              </p>
              <p className="font-metadata text-metadata text-on-surface-variant mb-lg">
                Your local data will be uploaded and then cleared from this
                device.
              </p>
              <div className="flex gap-md">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="border-outline-variant hover:bg-surface-container-highest flex-1 border py-sm font-label-md uppercase transition-colors"
                >
                  Keep local
                </button>
                <button
                  type="button"
                  onClick={handleSync}
                  className="bg-primary text-on-primary flex-1 py-sm font-label-md uppercase transition-colors"
                >
                  Sync to cloud
                </button>
              </div>
            </>
          )}

          {phase === "syncing" && (
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 animate-spin text-primary"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span className="font-body-md text-on-surface-variant">
                {message}
              </span>
            </div>
          )}

          {(phase === "done" || phase === "error") && (
            <>
              <div className="mb-lg flex items-center gap-3">
                <MaterialIcon
                  name={phase === "done" ? "check_circle" : "error"}
                  size={20}
                  className={
                    phase === "done" ? "text-primary" : "text-error"
                  }
                />
                <span
                  className={`font-body-md ${phase === "done" ? "text-on-surface" : "text-error"}`}
                >
                  {message}
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="bg-primary text-on-primary w-full py-sm font-label-md uppercase transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
