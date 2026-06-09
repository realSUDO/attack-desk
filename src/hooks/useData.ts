import { useSession } from "next-auth/react";
import { useCallback } from "react";

export function useSignedIn(): boolean {
  const { data: session } = useSession();
  return !!session?.user?.id;
}

export function useUserId(): string | null {
  const { data: session } = useSession();
  return session?.user?.id ?? null;
}

export function useApiUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

type SyncState = {
  status: "idle" | "syncing" | "done" | "error";
  message: string;
};

export function useCloudSync(): {
  syncState: SyncState;
  sync: () => Promise<void>;
} {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const sync = useCallback(async () => {
    if (!userId) return;

    const {
      getAllLocalData,
      clearAllLocalData,
    } = await import("@/lib/local-storage-db");
    const local = getAllLocalData();
    const hasData =
      local.missions.length > 0 ||
      local.deadlines.length > 0 ||
      local.posts.length > 0 ||
      local.canvases.length > 0 ||
      local.reviews.length > 0;

    if (!hasData) return;

    const results = [];

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

      results.push(res);
    }

    if (results.every((r) => r.ok || (results.length === 0))) {
      clearAllLocalData();
    }
  }, [userId]);

  return { syncState: { status: "idle", message: "" }, sync };
}
