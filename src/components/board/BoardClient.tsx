"use client";

import { useMemo, useRef, useState } from "react";
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
  initialMissions: ReadonlyArray<BoardMission>;
  deadlines: ReadonlyArray<RadarDeadline>;
  databaseError?: string | null;
};

const STATUSES = ["PLANNED", "DOING", "DONE"] as const;

function normalizeMission(m: BoardMission): BoardMission {
  return { ...m, dueDate: m.dueDate ? new Date(m.dueDate) : null };
}

// Sortable wrapper for a card inside a column
function SortableCard({
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
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MissionCard mission={mission} onSelect={onSelect} />
    </div>
  );
}

export function BoardClient({
  initialMissions,
  deadlines,
  databaseError = null,
}: Props) {
  const router = useRouter();
  const [missions, setMissions] = useState(() => initialMissions.map(normalizeMission));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<BoardMission["status"] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(databaseError);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMission, setActiveMission] = useState<BoardMission | null>(null);
  const [overStatus, setOverStatus] = useState<BoardMission["status"] | null>(null);
  const pendingMove = useRef<{ id: string; prevStatus: BoardMission["status"] } | null>(null);

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

  const onDragStart = ({ active }: DragStartEvent) => {
    const m = missions.find((m) => m.id === active.id);
    if (m) setActiveMission(m);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    // over could be a column id or a card id
    const overStatusVal = STATUSES.includes(over.id as BoardMission["status"])
      ? (over.id as BoardMission["status"])
      : (missions.find((m) => m.id === over.id)?.status ?? null);
    setOverStatus(overStatusVal);

    const activeStatus = missions.find((m) => m.id === active.id)?.status;
    if (overStatusVal && activeStatus && overStatusVal !== activeStatus) {
      setMissions((prev) =>
        prev.map((m) => (m.id === active.id ? { ...m, status: overStatusVal } : m)),
      );
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveMission(null);
    setOverStatus(null);
    if (!over) return;

    const newStatus = STATUSES.includes(over.id as BoardMission["status"])
      ? (over.id as BoardMission["status"])
      : (missions.find((m) => m.id === over.id)?.status ?? null);

    const mission = missions.find((m) => m.id === active.id);
    if (!mission || !newStatus) return;

    const prevStatus = pendingMove.current?.id === active.id
      ? pendingMove.current.prevStatus
      : mission.status;

    if (newStatus === prevStatus && !pendingMove.current) return;

    pendingMove.current = null;

    void apiRequest<BoardMission>(`/api/missions/${active.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {
      // Roll back
      setMissions((prev) =>
        prev.map((m) => (m.id === active.id ? { ...m, status: prevStatus } : m)),
      );
    });
  };

  const closeDrawer = () => { setSelectedId(null); setCreateStatus(null); setError(null); };

  const saveMission = async (input: MissionInput) => {
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
        setMissions((c) => c.map((m) => m.id === selected.id ? { ...selected, ...input, dueDate: input.dueDate ? new Date(input.dueDate) : null } : m));
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
  };

  const deleteMission = async () => {
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
  };

  return (
    <>
      <BoardHeader search={search} onSearchChange={setSearch} onCreate={() => setCreateStatus("PLANNED")} />
      <main className="ml-20 mt-16 flex h-[calc(100vh-64px)] overflow-hidden">
        <section className="bg-background flex-1 overflow-x-auto p-lg">
          {databaseError && (
            <p className="border-error text-error mb-md border p-sm text-sm">{databaseError}</p>
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
                const isOver = overStatus === status;
                return (
                  <DroppableColumn
                    key={status}
                    status={status}
                    isOver={isOver}
                    count={col.length}
                    onAdd={() => setCreateStatus(status)}
                  >
                    <SortableContext items={col.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                      {col.length === 0 ? (
                        <div className={`border-outline-variant flex h-24 items-center justify-center border border-dashed text-xs text-on-surface-variant transition-colors ${isOver ? "border-primary text-primary" : ""}`}>
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
            <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
              {activeMission ? (
                <div className="rotate-1 shadow-2xl opacity-95 scale-[1.02]">
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

function DroppableColumn({
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
  return (
    <div
      ref={setNodeRef}
      className={`flex w-80 flex-col gap-md rounded transition-colors duration-150 ${isOver ? "bg-surface-container" : ""}`}
    >
      <div className="border-outline-variant flex items-center justify-between border-b pb-sm">
        <span className="mono-label font-label-md">
          {status} ({String(count).padStart(2, "0")})
        </span>
        <button type="button" onClick={onAdd} aria-label={`Add ${status.toLowerCase()} mission`}>
          <MaterialIcon name="add" size={18} />
        </button>
      </div>
      <div className="board-column flex flex-col gap-sm">{children}</div>
    </div>
  );
}
