import { useSession } from "next-auth/react";
import { useCallback } from "react";

export function useSignedIn(): boolean {
  const { data: session, status } = useSession();
  return status === "authenticated" && !!session?.user?.id;
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

async function postLocalRecord(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Sync failed for ${path}`);
  return (await response.json()) as { data?: { id?: string } };
}

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

    const canvasIdMap = new Map<string, string>();

    for (const canvas of local.canvases) {
      const data = await postLocalRecord("/api/canvases", {
        title: canvas.title,
        description: canvas.description,
        data: canvas.data,
      });
      if (data.data?.id) canvasIdMap.set(canvas.id, data.data.id);
    }

    for (const mission of local.missions) {
      await postLocalRecord("/api/missions", {
        title: mission.title,
        description: mission.description,
        status: mission.status,
        priority: mission.priority,
        category: mission.category,
        dueDate: mission.dueDate,
        order: mission.order,
        deadlineId: mission.deadlineId,
        canvasId: mission.canvasId ? (canvasIdMap.get(mission.canvasId) ?? null) : null,
      });
    }

    for (const deadline of local.deadlines) {
      await postLocalRecord("/api/deadlines", {
        title: deadline.title,
        description: deadline.description,
        dueDate: deadline.dueDate,
        category: deadline.category,
        status: deadline.status,
        priority: deadline.priority,
        link: deadline.link,
      });
    }

    for (const post of local.posts) {
      await postLocalRecord("/api/posts", {
        title: post.title,
        hook: post.hook,
        draft: post.draft,
        finalContent: post.finalContent,
        category: post.category,
        status: post.status,
        postedUrl: post.postedUrl,
        order: post.order,
        canvasId: post.canvasId ? (canvasIdMap.get(post.canvasId) ?? null) : null,
      });
    }

    for (const review of local.reviews) {
      await postLocalRecord("/api/weekly-reviews", {
        weekStart: review.weekStart,
        weekEnd: review.weekEnd,
        wentRight: review.wentRight,
        wentWrong: review.wentWrong,
        nextPlan: review.nextPlan,
        finalNote: review.finalNote,
      });
    }

    clearAllLocalData();
  }, [userId]);

  return { syncState: { status: "idle", message: "" }, sync };
}
