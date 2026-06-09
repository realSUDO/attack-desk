"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import { apiRequest } from "@/lib/client-api";
import {
  localCreateMission,
  localDeleteMission,
  localGetDeadlines,
  localGetMissions,
  localGetCanvases,
  localUpdateMission,
  type LocalMission,
  type LocalDeadline,
} from "@/lib/local-storage-db";
import { useSignedIn } from "@/hooks/useData";

import { BoardHeader } from "./BoardHeader";
import { DeadlineRadar, type RadarDeadline } from "./DeadlineRadar";
import { MissionCard, type BoardMission } from "./MissionCard";
import { MissionDrawer, type MissionInput } from "./MissionDrawer";

type Props = {
  databaseAvailable: boolean;
};

const CACHE_KEY = "ad:board:data";

const STATUSES = ["PLANNED", "DOING", "DONE"] as const;

function normalizeMission(m: BoardMission): BoardMission {
  return { ...m, dueDate: m.dueDate ? new Date(m.dueDate) : null };
}

function localMissionToBoard(m: LocalMission): BoardMission {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    status: m.status as BoardMission["status"],
    priority: m.priority as BoardMission["priority"],
    dueDate: m.dueDate ? new Date(m.dueDate) : null,
    category: m.category,
  };
}

function localDeadlineToRadar(d: LocalDeadline): RadarDeadline {
  return {
    id: d.id,
    title: d.title,
    dueDate: new Date(d.dueDate),
    priority: d.priority as RadarDeadline["priority"],
  };
}

const SortableCard = memo(function SortableCard({
  mission,
  onSelect,
}: {
  mission: BoardMission;
  onSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: mission.id, data: { status: mission.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MissionCard mission={mission} onSelect={onSelect} />
    </div>
  );
});

const STATUS_META: Record<string, { color: string; dot: string }> = {
  PLANNED: { color: "text-on-surface-variant", dot: "bg-outline" },
  DOING:   { color: "text-primary",            dot: "bg-primary" },
  DONE:    { color: "text-on-surface-variant", dot: "bg-[#4caf7d]" },
};

const DroppableColumn = memo(function DroppableColumnInner({
  status,
  isOver,
  count,
  onAdd,
  children,
}: {
  status: string;
  isOver: boolean;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useSortable({ id: status, data: { type: "column" } });
  const meta = STATUS_META[status] ?? { color: "text-on-surface-variant", dot: "bg-outline" };
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-col gap-md rounded transition-colors duration-150 md:w-80 ${isOver ? "bg-surface-container" : ""}`}
    >
      <div className="border-outline-variant flex items-center justify-between border-b pb-sm">
        <div className="flex items-center gap-sm">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <span className={`mono-label font-label-md ${meta.color}`}>
            {status}
          </span>
          <span className="font-metadata text-on-surface-variant text-[11px]">
            {String(count).padStart(2, "0")}
          </span>
        </div>
        <button type="button" onClick={onAdd} aria-label={`Add ${status.toLowerCase()} mission`} className="text-on-surface-variant hover:text-primary transition-colors">
          <MaterialIcon name="add" size={18} />
        </button>
      </div>
      <div className="board-column flex flex-col gap-sm">{children}</div>
    </div>
  );
});

const STORAGE_KEY = "attackdesk:board:order";

function loadOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

function saveOrder(missions: BoardMission[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(missions.map((m) => m.id))); } catch {}
}

function applyOrder(missions: BoardMission[]): BoardMission[] {
  const order = loadOrder();
  if (!order.length) return missions;
  const map = new Map(missions.map((m) => [m.id, m]));
  const sorted: BoardMission[] = [];
  // First: ordered ids that still exist
  for (const id of order) { const m = map.get(id); if (m) { sorted.push(m); map.delete(id); } }
  // Then: any new missions not in saved order
  for (const m of map.values()) sorted.push(m);
  return sorted;
}

export function BoardClient({
  databaseAvailable,
}: Props) {
  const router = useRouter();
  const isSignedIn = useSignedIn();
  const [missions, setMissions] = useState<BoardMission[]>(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const m = (parsed.missions ?? []).map(normalizeMission);
        return applyOrder(m);
      }
    } catch {}
    return [];
  });
  const [deadlines, setDeadlines] = useState<RadarDeadline[]>(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return (parsed.deadlines ?? []).map((d: RadarDeadline) => ({
          ...d,
          dueDate: new Date(d.dueDate),
        }));
      }
    } catch {}
    return [];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<BoardMission["status"] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMission, setActiveMission] = useState<BoardMission | null>(null);
  const fetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (!isSignedIn) {
      const localDeadlines = localGetDeadlines();
      const localMissions = localGetMissions();
      const localCanvases = localGetCanvases();

      const deadlinesForRadar = localDeadlines.map(localDeadlineToRadar);
      const missionsForBoard = localMissions.map((m) => {
        const mission = localMissionToBoard(m);
        if (m.deadlineId) {
          const d = localDeadlines.find((dl) => dl.id === m.deadlineId);
          if (d) mission.deadline = { id: d.id, title: d.title };
        }
        if (m.canvasId) {
          const c = localCanvases.find((cv) => cv.id === m.canvasId);
          if (c) mission.canvas = { id: c.id, title: c.title };
        }
        return mission;
      });

      setMissions(applyOrder(missionsForBoard));
      setDeadlines(deadlinesForRadar);
      return;
    }
    if (fetching.current || !databaseAvailable) return;
    fetching.current = true;
    try {
      const res = await fetch("/api/board/data");
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      const m = (data.missions ?? []).map(normalizeMission);
      const d = (data.deadlines ?? []).map((dl: RadarDeadline) => ({
        ...dl,
        dueDate: new Date(dl.dueDate),
      }));
      setMissions(applyOrder(m));
      setDeadlines(d);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {}
    } catch {
      setError("Database unavailable. Start PostgreSQL and configure DATABASE_URL.");
    } finally {
      fetching.current = false;
    }
  }, [databaseAvailable, isSignedIn]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);
  // overStatus drives column highlight — keep as state but only set on actual column change
  const [overStatus, setOverStatus] = useState<BoardMission["status"] | null>(null);
  const overStatusRef = useRef<BoardMission["status"] | null>(null);
  // Track original status before drag for rollback
  const dragOriginStatus = useRef<BoardMission["status"] | null>(null);

  const selected = missions.find((m) => m.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return missions;
    return missions.filter((m) =>
      [m.title, m.description, m.category].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
  }, [missions, search]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    // Find the mission in the CURRENT state at the moment drag starts
    setMissions((prev) => {
      const m = prev.find((item) => item.id === active.id);
      if (m) {
        setActiveMission(m);
        dragOriginStatus.current = m.status;
      }
      return prev;
    });
  }, []);

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return;
    const overId = over.id as string;
    const activeId = active.id as string;
    if (overId === activeId) return;

    const overIsColumn = STATUSES.includes(overId as BoardMission["status"]);

    // Update column highlight only when column changes
    const newOverStatus = overIsColumn
      ? (overId as BoardMission["status"])
      : (over.data.current?.status as BoardMission["status"] ?? null);

    if (newOverStatus && newOverStatus !== overStatusRef.current) {
      overStatusRef.current = newOverStatus;
      setOverStatus(newOverStatus);
    }

    setMissions((prev) => {
      const fromIdx = prev.findIndex((m) => m.id === activeId);
      if (fromIdx === -1) return prev;

      const activeItem = prev[fromIdx]!;
      const newStatus = overIsColumn
        ? (overId as BoardMission["status"])
        : (prev.find((m) => m.id === overId)?.status ?? activeItem.status);

      const next = [...prev];
      // Update status on the dragged card
      next[fromIdx] = { ...activeItem, status: newStatus };

      // Find target index
      let toIdx: number;
      if (overIsColumn) {
        const lastIdx = next.reduce((acc, m, i) => (m.status === newStatus ? i : acc), -1);
        toIdx = lastIdx === -1 ? next.length - 1 : lastIdx;
      } else {
        toIdx = next.findIndex((m) => m.id === overId);
        if (toIdx === -1) return prev;
      }

      if (fromIdx === toIdx && next[fromIdx]?.status === activeItem.status) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    const originStatus = dragOriginStatus.current;
    setActiveMission(null);
    setOverStatus(null);
    overStatusRef.current = null;
    dragOriginStatus.current = null;

    setMissions((prev) => {
      const finalItem = prev.find((m) => m.id === active.id);
      if (!finalItem || !originStatus) return prev;

      const finalStatus = finalItem.status;

      // Persist change
      if (finalStatus !== originStatus) {
        saveOrder(prev);
        if (!isSignedIn) {
          localUpdateMission(active.id as string, { status: finalStatus });
        } else {
          void apiRequest<BoardMission>(`/api/missions/${active.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: finalStatus }),
          }).catch(() => {
            // Rollback if needed (though optimistic UI usually just stays and lets user try again)
            // For now, keep it simple.
          });
        }
      } else if (over && over.id !== active.id) {
        saveOrder(prev);
      }

      return prev;
    });
  }, [isSignedIn]);

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    setCreateStatus(null);
    setError(null);
  }, []);

  const saveMission = useCallback(async (input: MissionInput) => {
    setIsSaving(true);
    setError(null);
    try {
      if (createStatus) {
        let created: BoardMission;
        if (!isSignedIn) {
          const local = localCreateMission({
            ...input,
            order: 0, // Will be corrected by functional update if needed
            deadlineId: null,
            canvasId: null,
          });
          created = localMissionToBoard(local);
        } else {
          created = normalizeMission(
            await apiRequest<BoardMission>("/api/missions", { method: "POST", body: JSON.stringify(input) }),
          );
        }
        setMissions((c) => [...c, created]);
      } else if (selected) {
        const prevId = selected.id;
        const prevItem = selected;

        // Optimistic update
        setMissions((c) => c.map((m) => m.id === prevId
          ? { ...m, ...input, dueDate: input.dueDate ? new Date(input.dueDate) : null }
          : m));

        try {
          let updated: BoardMission;
          if (isSignedIn) {
            updated = normalizeMission(
              await apiRequest<BoardMission>(`/api/missions/${prevId}`, {
                method: "PATCH",
                body: JSON.stringify(input),
              }),
            );
          } else {
            const updatedLocal = localUpdateMission(prevId, input);
            if (!updatedLocal) throw new Error("Mission no longer exists");
            updated = localMissionToBoard(updatedLocal);
          }
          setMissions((c) => c.map((m) => m.id === prevId ? updated : m));
        } catch (e) {
          // Rollback
          setMissions((c) => c.map((m) => m.id === prevId ? prevItem : m));
          throw e;
        }
      }
      closeDrawer();
      if (isSignedIn) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save mission");
    } finally {
      setIsSaving(false);
    }
  }, [createStatus, isSignedIn, selected, closeDrawer, router]);

  const deleteMission = useCallback(async () => {
    const target = selected;
    if (!target || !window.confirm(`Delete "${target.title}"?`)) return;
    setIsSaving(true);
    setError(null);

    try {
      if (isSignedIn) {
        await apiRequest<BoardMission>(`/api/missions/${target.id}`, { method: "DELETE" });
      } else {
        localDeleteMission(target.id);
      }
      setMissions((c) => c.filter((m) => m.id !== target.id));
      closeDrawer();
      if (isSignedIn) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete mission");
    } finally {
      setIsSaving(false);
    }
  }, [selected, isSignedIn, closeDrawer, router]);

  // Stable per-column add handlers so DroppableColumn doesn't rerender from new fn refs
  const addHandlers = useMemo(
    () => Object.fromEntries(STATUSES.map((s) => [s, () => setCreateStatus(s)])),
    [],
  ) as Record<BoardMission["status"], () => void>;

  return (
    <>
      <BoardHeader search={search} onSearchChange={setSearch} onCreate={() => setCreateStatus("PLANNED")} />
      <main className="ml-0 mt-16 flex h-[calc(100vh-64px)] overflow-hidden md:ml-20">
        <section className="bg-background flex-1 overflow-x-auto p-lg">
          {error && (
            <p className="border-error text-error mb-md border p-sm text-sm">{error}</p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            <div className="flex h-full min-w-max gap-lg">
              {STATUSES.map((status) => {
                const col = filtered.filter((m) => m.status === status);
                return (
                  <DroppableColumn
                    key={status}
                    status={status}
                    isOver={overStatus === status}
                    count={col.length}
                    onAdd={addHandlers[status]}
                  >
                    <SortableContext items={col.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                      {col.length === 0 ? (
                        <div className={`border-outline-variant flex h-24 items-center justify-center border border-dashed text-xs text-on-surface-variant transition-colors ${overStatus === status ? "border-primary text-primary" : ""}`}>
                          Drop here
                        </div>
                      ) : (
                        col.map((m) => (
                          <SortableCard key={m.id} mission={m} onSelect={setSelectedId} />
                        ))
                      )}
                    </SortableContext>
                  </DroppableColumn>
                );
              })}
            </div>
            <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
              {activeMission ? (
                <div className="rotate-1 shadow-2xl scale-[1.03] opacity-95">
                  <MissionCard mission={activeMission} onSelect={() => {}} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>
        <DeadlineRadar deadlines={deadlines} />
      </main>
      <MissionDrawer
        key={createStatus ? `new-${createStatus}` : (selectedId ?? "closed")}
        mission={selected}
        mode={createStatus ? "create" : "edit"}
        initialStatus={createStatus ?? "PLANNED"}
        error={error}
        isSaving={isSaving}
        onClose={closeDrawer}
        onSave={saveMission}
        onDelete={deleteMission}
      />
    </>
  );
}
