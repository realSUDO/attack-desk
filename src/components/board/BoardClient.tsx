"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

function normalizeMission(mission: BoardMission): BoardMission {
  return {
    ...mission,
    dueDate: mission.dueDate ? new Date(mission.dueDate) : null,
  };
}

export function BoardClient({
  initialMissions,
  deadlines,
  databaseError = null,
}: Props) {
  const router = useRouter();
  const [missions, setMissions] = useState(() =>
    initialMissions.map(normalizeMission),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createStatus, setCreateStatus] =
    useState<BoardMission["status"] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(databaseError);
  const [isSaving, setIsSaving] = useState(false);
  const selected = missions.find((mission) => mission.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return missions;
    return missions.filter((mission) =>
      [mission.title, mission.description, mission.category]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [missions, search]);

  const closeDrawer = () => {
    setSelectedId(null);
    setCreateStatus(null);
    setError(null);
  };

  const saveMission = async (input: MissionInput) => {
    setIsSaving(true);
    setError(null);
    try {
      if (createStatus) {
        const created = normalizeMission(
          await apiRequest<BoardMission>("/api/missions", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        );
        setMissions((current) => [...current, created]);
      } else if (selected) {
        const previous = selected;
        const optimistic: BoardMission = {
          ...selected,
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        };
        setMissions((current) =>
          current.map((mission) =>
            mission.id === selected.id ? optimistic : mission,
          ),
        );
        try {
          const updated = normalizeMission(
            await apiRequest<BoardMission>(`/api/missions/${selected.id}`, {
              method: "PATCH",
              body: JSON.stringify(input),
            }),
          );
          setMissions((current) =>
            current.map((mission) =>
              mission.id === selected.id ? updated : mission,
            ),
          );
        } catch (requestError) {
          setMissions((current) =>
            current.map((mission) =>
              mission.id === previous.id ? previous : mission,
            ),
          );
          throw requestError;
        }
      }
      closeDrawer();
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to save mission",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMission = async () => {
    if (!selected || !window.confirm(`Delete "${selected.title}"?`)) return;
    setIsSaving(true);
    const previous = missions;
    setMissions((current) =>
      current.filter((mission) => mission.id !== selected.id),
    );
    try {
      await apiRequest<BoardMission>(`/api/missions/${selected.id}`, {
        method: "DELETE",
      });
      closeDrawer();
      router.refresh();
    } catch (requestError) {
      setMissions(previous);
      setError(
        requestError instanceof Error ? requestError.message : "Unable to delete mission",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <BoardHeader
        search={search}
        onSearchChange={setSearch}
        onCreate={() => setCreateStatus("PLANNED")}
      />
      <main className="ml-20 mt-16 flex h-[calc(100vh-64px)] overflow-hidden">
        <section className="bg-background flex-1 overflow-x-auto p-lg">
          {databaseError && (
            <p className="border-error text-error mb-md border p-sm text-sm">
              {databaseError}
            </p>
          )}
          <div className="flex h-full min-w-max gap-lg">
            {STATUSES.map((status) => {
              const columnMissions = filtered.filter(
                (mission) => mission.status === status,
              );
              return (
                <div key={status} className="flex w-80 flex-col gap-md">
                  <div className="border-outline-variant flex items-center justify-between border-b pb-sm">
                    <span className="mono-label font-label-md">
                      {status} ({String(columnMissions.length).padStart(2, "0")})
                    </span>
                    <button
                      type="button"
                      onClick={() => setCreateStatus(status)}
                      aria-label={`Add ${status.toLowerCase()} mission`}
                    >
                      <MaterialIcon name="add" size={18} />
                    </button>
                  </div>
                  <div className="board-column flex flex-col gap-sm">
                    {columnMissions.length === 0 ? (
                      <div className="border-outline-variant flex h-24 items-center justify-center border border-dashed text-xs text-on-surface-variant">
                        {search ? "No matching missions." : "No missions."}
                      </div>
                    ) : (
                      columnMissions.map((mission) => (
                        <MissionCard
                          key={mission.id}
                          mission={mission}
                          onSelect={setSelectedId}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
