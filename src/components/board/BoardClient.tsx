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
      className={`flex w-80 flex-col gap-md rounded transition-colors duration-150 ${isOver ? "bg-surface-container" : ""}`}
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
    if (fetching.current || !databaseAvailable) return;
    fetching.current = true;
    try {
      const res = await fetch("/api/board/data");
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
  }, []);

  useEffect(() => {
    fetchData();
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

  const getStatusForId = useCallback(
    (id: string | number): BoardMission["status"] | null => {
      if (STATUSES.includes(id as BoardMission["status"])) return id as BoardMission["status"];
      return missions.find((m) => m.id === id)?.status ?? null;
    },
    [missions],
  );

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    const m = missions.find((m) => m.id === active.id);
    if (!m) return;
    setActiveMission(m);
    dragOriginStatus.current = m.status;
  }, [missions]);

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return;
    const overId = over.id as string;
    const activeId = active.id as string;
    if (overId === activeId) return;

    const overIsColumn = STATUSES.includes(overId as BoardMission["status"]);
    const newStatus = overIsColumn
      ? (overId as BoardMission["status"])
      : (missions.find((m) => m.id === overId)?.status ?? null);

    if (!newStatus) return;

    // Update column highlight only when column changes
    if (newStatus !== overStatusRef.current) {
      overStatusRef.current = newStatus;
      setOverStatus(newStatus);
    }

    const activeStatus = missions.find((m) => m.id === activeId)?.status;
    if (!activeStatus) return;

    setMissions((prev) => {
      const fromIdx = prev.findIndex((m) => m.id === activeId);
      if (fromIdx === -1) return prev;

      const next = [...prev];
      // Update status on the dragged card
      next[fromIdx] = { ...next[fromIdx]!, status: newStatus };

      // Find target index: if over a card, insert before/after it; if over a column, append to column
      let toIdx: number;
      if (overIsColumn) {
        // Dropping on column background — find last card of that column
        const lastIdx = next.reduce((acc, m, i) => (m.status === newStatus ? i : acc), -1);
        toIdx = lastIdx === -1 ? next.length - 1 : lastIdx;
      } else {
        toIdx = next.findIndex((m) => m.id === overId);
        if (toIdx === -1) return prev;
      }

      if (fromIdx === toIdx) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, [missions]);

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    const finalStatus = missions.find((m) => m.id === active.id)?.status;
    const originStatus = dragOriginStatus.current;
    setActiveMission(null);
    setOverStatus(null);
    overStatusRef.current = null;
    dragOriginStatus.current = null;

    if (!finalStatus || !originStatus) return;

    // Same-column reorder: move card to position of 'over' card
    if (finalStatus === originStatus && over && over.id !== active.id) {
      setMissions((prev) => {
        const ids = prev.map((m) => m.id);
        const fromIdx = ids.indexOf(active.id as string);
        const toIdx = ids.indexOf(over.id as string);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        saveOrder(next);
        return next;
      });
      return;
    }

    // Cross-column: status already updated optimistically in onDragOver, just save order + persist
    if (finalStatus !== originStatus) {
      setMissions((prev) => { saveOrder(prev); return prev; });
      void apiRequest<BoardMission>(`/api/missions/${active.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: finalStatus }),
      }).catch(() => {
        setMissions((prev) =>
          prev.map((m) => (m.id === active.id ? { ...m, status: originStatus } : m)),
        );
      });
    }
  }, [missions]);

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
        const created = normalizeMission(
          await apiRequest<BoardMission>("/api/missions", { method: "POST", body: JSON.stringify(input) }),
        );
        setMissions((c) => [...c, created]);
      } else if (selected) {
        const prev = selected;
        setMissions((c) => c.map((m) => m.id === selected.id
          ? { ...selected, ...input, dueDate: input.dueDate ? new Date(input.dueDate) : null }
          : m));
        try {
          const updated = normalizeMission(
            await apiRequest<BoardMission>(`/api/missions/${selected.id}`, { method: "PATCH", body: JSON.stringify(input) }),
          );
          setMissions((c) => c.map((m) => m.id === selected.id ? updated : m));
        } catch (e) {
          setMissions((c) => c.map((m) => m.id === prev.id ? prev : m));
          throw e;
        }
      }
      closeDrawer();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save mission");
    } finally {
      setIsSaving(false);
    }
  }, [createStatus, selected, closeDrawer, router]);

  const deleteMission = useCallback(async () => {
    if (!selected || !window.confirm(`Delete "${selected.title}"?`)) return;
    setIsSaving(true);
    const prev = missions;
    setMissions((c) => c.filter((m) => m.id !== selected.id));
    try {
      await apiRequest<BoardMission>(`/api/missions/${selected.id}`, { method: "DELETE" });
      closeDrawer();
      router.refresh();
    } catch (e) {
      setMissions(prev);
      setError(e instanceof Error ? e.message : "Unable to delete mission");
    } finally {
      setIsSaving(false);
    }
  }, [selected, missions, closeDrawer, router]);

  // Stable per-column add handlers so DroppableColumn doesn't rerender from new fn refs
  const addHandlers = useMemo(
    () => Object.fromEntries(STATUSES.map((s) => [s, () => setCreateStatus(s)])),
    [],
  ) as Record<BoardMission["status"], () => void>;

  return (
    <>
      <BoardHeader search={search} onSearchChange={setSearch} onCreate={() => setCreateStatus("PLANNED")} />
      <main className="ml-20 mt-16 flex h-[calc(100vh-64px)] overflow-hidden">
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
