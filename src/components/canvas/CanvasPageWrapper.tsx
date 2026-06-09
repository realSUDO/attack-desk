"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { CanvasPage } from "./CanvasPage";
import { type Scene, EMPTY_SCENE, parseScene } from "./types";
import {
  LOCAL_CANVAS_ID,
  localGetCanvasById,
  localGetMissions,
  localGetDeadlines,
  localCreateCanvas,
} from "@/lib/local-storage-db";

type Props = {
  canvasId: string;
  initialTitle: string;
  initialScene: Scene;
  linked: {
    missions: ReadonlyArray<{ id: string; title: string }>;
    deadlines: ReadonlyArray<{ id: string; title: string }>;
  };
  availableMissions: ReadonlyArray<{
    id: string;
    title: string;
    status: string;
    priority: string;
  }>;
};

export function CanvasPageWrapper({
  canvasId,
  initialTitle,
  initialScene,
  linked,
  availableMissions,
}: Props) {
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";
  const [localData, setLocalData] = useState<{
    title: string;
    scene: Scene;
    linked: Props["linked"];
    availableMissions: Props["availableMissions"];
  } | null>(null);

  useEffect(() => {
    if (isSignedIn) return;
    if (canvasId !== LOCAL_CANVAS_ID) return;

    let canvas = localGetCanvasById(LOCAL_CANVAS_ID);
    if (!canvas) {
      canvas = localCreateCanvas({
        title: "My Scratch Canvas",
        description: null,
        data: EMPTY_SCENE,
        thumbnail: null,
        deadlineId: null,
      });
    }

    const localMissions = localGetMissions();
    const localDeadlines = localGetDeadlines();

    setLocalData({
      title: canvas?.title ?? initialTitle,
      scene: canvas?.data ? parseScene(canvas.data) : initialScene,
      linked: {
        missions: localMissions.map((m) => ({ id: m.id, title: m.title })),
        deadlines: localDeadlines.map((d) => ({ id: d.id, title: d.title })),
      },
      availableMissions: localMissions.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        priority: m.priority,
      })),
    });
  }, [isSignedIn, canvasId, initialTitle, initialScene, linked, availableMissions]);

  if (!isSignedIn && localData) {
    return (
      <CanvasPage
        canvasId={LOCAL_CANVAS_ID}
        initialTitle={localData.title}
        initialScene={localData.scene}
        linked={localData.linked}
        availableMissions={localData.availableMissions}
      />
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  return (
    <CanvasPage
      canvasId={canvasId}
      initialTitle={initialTitle}
      initialScene={initialScene}
      linked={linked}
      availableMissions={availableMissions}
      userId={session?.user?.id}
    />
  );
}
