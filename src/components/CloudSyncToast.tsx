"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function CloudSyncToast() {
  const { status } = useSession();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;

    const run = async () => {
      const { getAllLocalData, clearAllLocalData } = await import("@/lib/local-storage-db");
      const local = getAllLocalData();
      const hasData =
        local.missions.length > 0 ||
        local.deadlines.length > 0 ||
        local.posts.length > 0 ||
        local.canvases.length > 0 ||
        local.reviews.length > 0;

      if (!hasData) return;

      setVisible(true);
      setMessage("Saving to cloud...");

      try {
        for (const canvas of local.canvases) {
          const res = await fetch("/api/canvases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: canvas.title, description: canvas.description, data: canvas.data }),
          });
          const data = await res.json();
          const newCanvasId = data.data?.id;
          for (const mission of local.missions) {
            await fetch("/api/missions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...mission, canvasId: newCanvasId ?? mission.canvasId }),
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
              body: JSON.stringify({ ...post, canvasId: newCanvasId ?? post.canvasId }),
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
        setMessage("Cloud sync complete");
        setTimeout(() => setVisible(false), 2000);
      } catch {
        setMessage("Cloud sync failed");
        setTimeout(() => setVisible(false), 3000);
      }
    };

    run();
  }, [status]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-4 py-2.5 shadow-lg">
      <svg
        className="h-4 w-4 animate-pulse text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
        />
      </svg>
      <span className="text-label-md text-on-surface-variant">{message}</span>
    </div>
  );
}
