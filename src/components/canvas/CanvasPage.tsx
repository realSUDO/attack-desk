"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  deleteCanvasAction,
  saveCanvasAction,
  unlinkMissionFromCanvasAction,
} from "@/actions/canvas.actions";

import { CanvasInspector } from "./CanvasInspector";
import { CanvasSurface } from "./CanvasSurface";
import { CanvasToolbar } from "./CanvasToolbar";
import { ContextMenu } from "./ContextMenu";
import { LinkMissionModal } from "./LinkMissionModal";
import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import {
  type Scene,
  type Shape,
  type Tool,
} from "./types";
import { useScene } from "./store";

type LinkedRef = {
  missions: ReadonlyArray<{ id: string; title: string }>;
  deadlines: ReadonlyArray<{ id: string; title: string }>;
};

type AvailableMission = {
  id: string;
  title: string;
  status: string;
  priority: string;
};

type Props = {
  canvasId: string;
  initialTitle: string;
  initialScene: Scene;
  linked: LinkedRef;
  availableMissions: ReadonlyArray<AvailableMission>;
};

const TOOL_KEYBINDS: Record<string, Tool> = {
  v: "select",
  h: "pan",
  p: "pen",
  d: "pen",
  r: "rect",
  c: "ellipse",
  o: "ellipse",
  t: "text",
  a: "arrow",
  e: "eraser",
};

export function CanvasPage({
  canvasId,
  initialTitle,
  initialScene,
  linked,
  availableMissions,
}: Props) {
  const router = useRouter();
  const sceneApi = useScene(initialScene);
  const [title, setTitle] = useState(initialTitle);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedIds, setSelectedIds] = useState<ReadonlyArray<string>>([]);
  const [isSaving, startSave] = useTransition();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedScene, setLastSavedScene] = useState<Scene>(initialScene);
  const [lastSavedTitle, setLastSavedTitle] = useState<string>(initialTitle);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToShapes, setSnapToShapes] = useState(true);
  const [contextMenu, setContextMenu] = useState<
    | {
        sx: number;
        sy: number;
        wx: number;
        wy: number;
        ids: ReadonlyArray<string>;
      }
    | null
  >(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const selectedShapes = useMemo<ReadonlyArray<Shape>>(() => {
    const set = new Set(selectedIds);
    return sceneApi.scene.shapes.filter((s) => set.has(s.id));
  }, [sceneApi.scene.shapes, selectedIds]);

  const isDirty = useMemo<boolean>(
    () => sceneApi.scene !== lastSavedScene || title !== lastSavedTitle,
    [sceneApi.scene, title, lastSavedScene, lastSavedTitle],
  );

  const handleSave = useCallback(() => {
    startSave(async () => {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("data", JSON.stringify(sceneApi.scene));
      const result = await saveCanvasAction(canvasId, formData);
      if (result.success) {
        setLastSavedScene(sceneApi.scene);
        setLastSavedTitle(title);
        setLastSavedAt(new Date());
      }
    });
  }, [canvasId, sceneApi.scene, title]);

  useEffect(() => {
    if (!isDirty) return;
    const t = setTimeout(() => {
      void handleSave();
    }, 1500);
    return () => clearTimeout(t);
  }, [isDirty, handleSave]);

  const handleRequestTextEdit = useCallback((id: string) => {
    if (id === "") {
      setEditingTextId(null);
      return;
    }
    setEditingTextId(id);
  }, []);

  // Commit/cancel text edit based on whether it has content.
  useEffect(() => {
    if (editingTextId === null) return;
    // We need to know whether the text shape's text is empty to decide
    // to delete or keep.
  }, [editingTextId]);

  // When a text edit finishes, validate and clean up.
  const finalizeTextEdit = useCallback(() => {
    if (!editingTextId) return;
    const shape = sceneApi.scene.shapes.find((s) => s.id === editingTextId);
    if (shape && shape.type === "text") {
      const trimmed = shape.text.trim();
      if (trimmed === "") {
        sceneApi.removeShapes([editingTextId]);
      } else if (shape.text !== trimmed) {
        sceneApi.updateShape(editingTextId, { text: trimmed });
      }
    }
    setEditingTextId(null);
  }, [editingTextId, sceneApi]);

  useEffect(() => {
    if (editingTextId === null) return;
    // Listen for blur on any text editor — but since we use a ref-based
    // editor, we can't easily listen for blur. Instead, the editor itself
    // calls onCommit, which we forward to setEditingTextId(null).
  }, [editingTextId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inTextEditor =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inTextEditor) {
        if (e.key === "Escape") {
          (target as HTMLElement).blur();
        }
        return;
      }

      const k = e.key.toLowerCase();

      if (TOOL_KEYBINDS[k] && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setTool(TOOL_KEYBINDS[k]!);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          sceneApi.removeShapes(selectedIds);
          setSelectedIds([]);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && k === "z") {
        e.preventDefault();
        sceneApi.undo();
        return;
      }

      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && k === "z") ||
        ((e.metaKey || e.ctrlKey) && k === "y")
      ) {
        e.preventDefault();
        sceneApi.redo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && k === "s") {
        e.preventDefault();
        void handleSave();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && k === "a") {
        e.preventDefault();
        setSelectedIds(sceneApi.scene.shapes.map((s) => s.id));
        return;
      }

      if ((e.metaKey || e.ctrlKey) && k === "d" && selectedIds.length > 0) {
        e.preventDefault();
        sceneApi.duplicateShapes(selectedIds, 8);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && k === "g" && selectedIds.length > 0) {
        e.preventDefault();
        const first = sceneApi.scene.shapes.find((s) => s.id === selectedIds[0]);
        if (first?.groupId) {
          sceneApi.ungroupShapes(first.groupId);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && k === "g" && selectedIds.length > 0) {
        e.preventDefault();
        sceneApi.groupShapes(selectedIds);
        return;
      }

      if (e.key === "Escape") {
        setSelectedIds([]);
        setContextMenu(null);
        return;
      }

      // Keyboard nudge.
      if (selectedIds.length > 0 && tool === "select") {
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        else if (e.key === "ArrowRight") dx = step;
        else if (e.key === "ArrowUp") dy = -step;
        else if (e.key === "ArrowDown") dy = step;
        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          sceneApi.translateShapes(selectedIds, dx, dy);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave, sceneApi, selectedIds, tool]);

  const handleUpdateSelected = useCallback(
    (patch: Partial<Shape>) => {
      for (const id of selectedIds) {
        sceneApi.updateShape(id, patch);
      }
    },
    [sceneApi, selectedIds],
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length > 0) {
      sceneApi.removeShapes(selectedIds);
      setSelectedIds([]);
    }
  }, [sceneApi, selectedIds]);

  const handleDeleteCanvas = useCallback(() => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Delete this canvas? This cannot be undone.");
      if (!ok) return;
    }
    startDelete(async () => {
      const result = await deleteCanvasAction(canvasId);
      if (result.success) {
        router.push("/canvas");
      }
    });
  }, [canvasId, router]);

  const handleUnlinkMission = useCallback(
    (missionId: string) => {
      startDelete(async () => {
        await unlinkMissionFromCanvasAction(canvasId, missionId);
      });
    },
    [canvasId],
  );

  const handleShowContextMenu = useCallback(
    (point: { sx: number; sy: number; wx: number; wy: number }, ids: ReadonlyArray<string>) => {
      if (ids.length === 0) return;
      setSelectedIds(ids);
      setContextMenu({ ...point, ids });
    },
    [],
  );

  // Finalize text edit when editingTextId changes to null.
  useEffect(() => {
    if (editingTextId === null) {
      // No-op; finalize is called from the editor's onBlur.
    }
  }, [editingTextId]);

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-20 flex flex-1 flex-col">
        <CanvasToolbar
          tool={tool}
          onTool={setTool}
          canUndo={sceneApi.canUndo}
          canRedo={sceneApi.canRedo}
          onUndo={sceneApi.undo}
          onRedo={sceneApi.redo}
          isSaving={isSaving}
          isDirty={isDirty}
          onSave={handleSave}
        />

        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex-1">
            <CanvasSurface
              shapes={sceneApi.scene.shapes}
              camera={sceneApi.scene.camera}
              tool={tool}
              selectedIds={selectedIds}
              editingTextId={editingTextId}
              snapToGrid={snapToGrid}
              snapToShapes={snapToShapes}
              onCamera={sceneApi.setCamera}
              onCommitShape={sceneApi.addShape}
              onUpdateShape={sceneApi.updateShape}
              onRemoveShapes={sceneApi.removeShapes}
              onTranslate={sceneApi.translateShapes}
              onSelectionChange={setSelectedIds}
              onRequestTextEdit={(id) => {
                if (id === "") {
                  finalizeTextEdit();
                } else {
                  handleRequestTextEdit(id);
                }
              }}
              onShowContextMenu={handleShowContextMenu}
              surfaceRef={surfaceRef}
            />

            <div className="absolute bottom-lg left-lg z-40">
              <div className="border-outline-variant bg-surface-container-lowest flex items-center gap-sm border px-md py-sm">
                <MaterialIcon
                  name="cloud_done"
                  size={18}
                  filled
                  className="text-secondary"
                />
                <span className="font-metadata text-metadata text-on-surface-variant">
                  {isSaving
                    ? "Saving…"
                    : isDirty
                      ? "Unsaved changes"
                      : "Saved to Cloud"}
                </span>
              </div>
            </div>

            <ZoomControls
              zoom={sceneApi.scene.camera.zoom}
              onZoom={(z) => sceneApi.setCamera({ zoom: z })}
            />

            <SnapTogglePills
              snapToGrid={snapToGrid}
              snapToShapes={snapToShapes}
              onToggleGrid={() => setSnapToGrid((v) => !v)}
              onToggleShapes={() => setSnapToShapes((v) => !v)}
            />
          </div>

          <CanvasInspector
            canvasTitle={title}
            onTitleChange={setTitle}
            selection={selectedShapes}
            onUpdateSelected={handleUpdateSelected}
            onDeleteSelected={handleDeleteSelected}
            linkedMissions={linked.missions}
            linkedDeadlines={linked.deadlines}
            lastSavedAt={lastSavedAt}
            isDeleting={isDeleting}
            onDeleteCanvas={handleDeleteCanvas}
            onOpenLinkModal={() => setLinkModalOpen(true)}
            onUnlinkMission={handleUnlinkMission}
            onBringToFront={(id) => sceneApi.bringToFront(id)}
            onSendToBack={(id) => sceneApi.sendToBack(id)}
            onBringForward={(id) => sceneApi.bringForward(id)}
            onSendBackward={(id) => sceneApi.sendBackward(id)}
            onGroup={() => sceneApi.groupShapes(selectedIds)}
            onUngroup={() => {
              const first = sceneApi.scene.shapes.find((s) => s.id === selectedIds[0]);
              if (first?.groupId) sceneApi.ungroupShapes(first.groupId);
            }}
            onDuplicate={() => sceneApi.duplicateShapes(selectedIds, 8)}
          />
        </div>
      </main>

      <LinkMissionModal
        canvasId={canvasId}
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        missions={availableMissions}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.sx}
          y={contextMenu.sy}
          ids={contextMenu.ids}
          onClose={() => setContextMenu(null)}
          onBringToFront={(id) => sceneApi.bringToFront(id)}
          onSendToBack={(id) => sceneApi.sendToBack(id)}
          onBringForward={(id) => sceneApi.bringForward(id)}
          onSendBackward={(id) => sceneApi.sendBackward(id)}
          onGroup={() => sceneApi.groupShapes(selectedIds)}
          onUngroup={() => {
            const first = sceneApi.scene.shapes.find((s) => s.id === selectedIds[0]);
            if (first?.groupId) sceneApi.ungroupShapes(first.groupId);
          }}
          onDuplicate={() => sceneApi.duplicateShapes(selectedIds, 8)}
          onDelete={() => {
            sceneApi.removeShapes(selectedIds);
            setSelectedIds([]);
          }}
          isGrouped={
            !!sceneApi.scene.shapes.find((s) => s.id === selectedIds[0])?.groupId
          }
        />
      )}
    </div>
  );
}

function ZoomControls({
  zoom,
  onZoom,
}: {
  zoom: number;
  onZoom: (z: number) => void;
}) {
  return (
    <div className="border-outline-variant bg-surface absolute bottom-lg left-1/2 z-40 flex -translate-x-1/2 overflow-hidden border">
      <button
        type="button"
        onClick={() => onZoom(Math.max(0.2, zoom * 0.8))}
        className="hover:bg-surface-container-highest border-outline-variant flex h-10 w-10 items-center justify-center border-r"
        aria-label="Zoom out"
      >
        <MaterialIcon name="remove" size={18} />
      </button>
      <div className="bg-surface-container flex min-w-[60px] items-center justify-center px-md font-label-md">
        {Math.round(zoom * 100)}%
      </div>
      <button
        type="button"
        onClick={() => onZoom(Math.min(4, zoom * 1.25))}
        className="hover:bg-surface-container-highest border-outline-variant flex h-10 w-10 items-center justify-center border-l"
        aria-label="Zoom in"
      >
        <MaterialIcon name="add" size={18} />
      </button>
    </div>
  );
}

function SnapTogglePills({
  snapToGrid,
  snapToShapes,
  onToggleGrid,
  onToggleShapes,
}: {
  snapToGrid: boolean;
  snapToShapes: boolean;
  onToggleGrid: () => void;
  onToggleShapes: () => void;
}) {
  return (
    <div className="absolute right-lg bottom-lg z-40 flex gap-sm">
      <button
        type="button"
        onClick={onToggleGrid}
        title="Toggle snap to grid (8px)"
        className={`border-outline-variant bg-surface flex h-9 items-center gap-xs border px-sm font-label-sm uppercase ${
          snapToGrid ? "text-primary" : "text-on-surface-variant"
        }`}
      >
        <MaterialIcon name="grid_4x4" size={16} />
        Grid
      </button>
      <button
        type="button"
        onClick={onToggleShapes}
        title="Toggle snap to other shapes"
        className={`border-outline-variant bg-surface flex h-9 items-center gap-xs border px-sm font-label-sm uppercase ${
          snapToShapes ? "text-primary" : "text-on-surface-variant"
        }`}
      >
        <MaterialIcon name="align_horizontal_left" size={16} />
        Align
      </button>
    </div>
  );
}
