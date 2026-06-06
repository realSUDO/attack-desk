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
import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import {
  deleteCanvasAction,
  saveCanvasAction,
  unlinkMissionFromCanvasAction,
} from "@/actions/canvas.actions";

import { CanvasInspector } from "./CanvasInspector";
import { CanvasToolbar } from "./CanvasToolbar";
import { ContextMenu } from "./ContextMenu";
import { KonvaCanvas } from "./KonvaCanvas";
import { LinkMissionModal } from "./LinkMissionModal";
import { useScene } from "./store";
import {
  type Scene,
  type Shape,
  type Tool,
  type ToolDefaults,
  DEFAULT_TOOL_DEFAULTS,
  MAX_ZOOM,
  MIN_ZOOM,
} from "./types";

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
  r: "rect",
  o: "ellipse",
  a: "arrow",
  t: "text",
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
  const api = useScene(initialScene);
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
  const [toolDefaults, setToolDefaults] = useState<ToolDefaults>(DEFAULT_TOOL_DEFAULTS);
  const [contextMenu, setContextMenu] = useState<
    | { x: number; y: number; ids: ReadonlyArray<string> }
    | null
  >(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedShapes = useMemo<ReadonlyArray<Shape>>(() => {
    const set = new Set(selectedIds);
    return api.scene.shapes.filter((s) => set.has(s.id));
  }, [api.scene.shapes, selectedIds]);

  const isDirty = useMemo<boolean>(
    () => api.scene !== lastSavedScene || title !== lastSavedTitle,
    [api.scene, title, lastSavedScene, lastSavedTitle],
  );

  const handleSave = useCallback(() => {
    startSave(async () => {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("data", JSON.stringify(api.scene));
      const result = await saveCanvasAction(canvasId, formData);
      if (result.success) {
        setLastSavedScene(api.scene);
        setLastSavedTitle(title);
        setLastSavedAt(new Date());
      }
    });
  }, [api.scene, canvasId, title]);

  useEffect(() => {
    if (!isDirty) return;
    const t = setTimeout(() => {
      void handleSave();
    }, 1500);
    return () => clearTimeout(t);
  }, [isDirty, handleSave]);

  const handleRequestTextEdit = useCallback(
    (id: string) => {
      if (id === "") {
        if (editingTextId) {
          const shape = api.scene.shapes.find((s) => s.id === editingTextId);
          if (shape?.type === "text") {
            const trimmed = shape.text.trim();
            if (trimmed === "") {
              api.removeShapes([editingTextId]);
            } else if (shape.text !== trimmed) {
              api.updateShape(editingTextId, { text: trimmed });
            }
          }
        }
        setEditingTextId(null);
        return;
      }
      setEditingTextId(id);
    },
    [api, editingTextId],
  );

  const updateTextLive = useCallback(
    (id: string, text: string) => {
      api.updateShape(id, { text });
    },
    [api],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inTextEditor =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inTextEditor) {
        if (e.key === "Escape") (target as HTMLElement).blur();
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
          api.removeShapes(selectedIds);
          setSelectedIds([]);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && k === "z") {
        e.preventDefault();
        api.undo();
        return;
      }

      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && k === "z") ||
        ((e.metaKey || e.ctrlKey) && k === "y")
      ) {
        e.preventDefault();
        api.redo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && k === "s") {
        e.preventDefault();
        void handleSave();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && k === "a") {
        e.preventDefault();
        setSelectedIds(api.scene.shapes.map((s) => s.id));
        return;
      }

      if ((e.metaKey || e.ctrlKey) && k === "d" && selectedIds.length > 0) {
        e.preventDefault();
        const newIds = api.duplicateShapes(selectedIds, 8);
        setSelectedIds(newIds);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && k === "g" && selectedIds.length > 0) {
        e.preventDefault();
        const first = api.scene.shapes.find((s) => s.id === selectedIds[0]);
        if (first?.groupId) api.ungroupShapes(first.groupId);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && k === "g" && selectedIds.length > 0) {
        e.preventDefault();
        const newGroup = api.groupShapes(selectedIds);
        if (newGroup) {
          // selection remains the same; shapes are now grouped.
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && k === "]") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          api.bringToFront(selectedIds[0]!);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && k === "[") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          api.sendToBack(selectedIds[0]!);
        }
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
          api.translateShapes(selectedIds, dx, dy);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, handleSave, selectedIds, tool]);

  const handleUpdateSelected = useCallback(
    (patch: Partial<Shape>) => {
      for (const id of selectedIds) {
        api.updateShape(id, patch);
      }
    },
    [api, selectedIds],
  );

  const handleUpdateSelectedBatch = useCallback(
    (patch: Partial<Shape>) => {
      api.updateMany(selectedIds.map((id) => ({ id, patch })));
    },
    [api, selectedIds],
  );

  const handleUpdateToolDefaults = useCallback((patch: Partial<ToolDefaults>) => {
    setToolDefaults((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length > 0) {
      api.removeShapes(selectedIds);
      setSelectedIds([]);
    }
  }, [api, selectedIds]);

  const handleDeleteCanvas = useCallback(() => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Delete this canvas? This cannot be undone.");
      if (!ok) return;
    }
    startDelete(async () => {
      const result = await deleteCanvasAction(canvasId);
      if (result.success) router.push("/canvas");
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
    (
      point: { sx: number; sy: number; wx: number; wy: number },
      ids: ReadonlyArray<string>,
    ) => {
      if (ids.length === 0) return;
      setSelectedIds(ids);
      setContextMenu({ x: point.sx, y: point.sy, ids });
    },
    [],
  );

  const editingShape = editingTextId
    ? api.scene.shapes.find((s) => s.id === editingTextId)
    : null;

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-20 flex min-h-0 min-w-0 flex-1 flex-col">
        <CanvasToolbar
          tool={tool}
          onTool={setTool}
          canUndo={api.canUndo}
          canRedo={api.canRedo}
          onUndo={api.undo}
          onRedo={api.redo}
          isSaving={isSaving}
          isDirty={isDirty}
          onSave={handleSave}
        />

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="relative min-h-0 min-w-0 flex-1">
            <KonvaCanvas
              api={api}
              tool={tool}
              selectedIds={selectedIds}
              setSelectedIds={(ids, additive) => {
                if (additive) {
                  setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
                } else {
                  setSelectedIds(ids);
                }
              }}
              toolDefaults={toolDefaults}
              onToolChange={setTool}
              onRequestTextEdit={handleRequestTextEdit}
              onContextMenuEvent={handleShowContextMenu}
              containerRef={containerRef}
            />

            {editingShape?.type === "text" && (
              <TextEditorOverlay
                shape={editingShape}
                zoom={api.scene.camera.zoom}
                cameraX={api.scene.camera.x}
                cameraY={api.scene.camera.y}
                onChange={(text) => updateTextLive(editingShape.id, text)}
                onCommit={() => handleRequestTextEdit("")}
              />
            )}

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
              zoom={api.scene.camera.zoom}
              onZoom={(z) => api.setCamera({ zoom: z })}
            />
          </div>

          <CanvasInspector
            canvasTitle={title}
            onTitleChange={setTitle}
            selection={selectedShapes}
            toolDefaults={toolDefaults}
            onUpdateToolDefaults={handleUpdateToolDefaults}
            onUpdateSelected={handleUpdateSelected}
            onUpdateSelectedBatch={handleUpdateSelectedBatch}
            onDeleteSelected={handleDeleteSelected}
            linkedMissions={linked.missions}
            linkedDeadlines={linked.deadlines}
            lastSavedAt={lastSavedAt}
            isDeleting={isDeleting}
            onDeleteCanvas={handleDeleteCanvas}
            onOpenLinkModal={() => setLinkModalOpen(true)}
            onUnlinkMission={handleUnlinkMission}
            onBringToFront={(id) => api.bringToFront(id)}
            onSendToBack={(id) => api.sendToBack(id)}
            onBringForward={(id) => api.bringForward(id)}
            onSendBackward={(id) => api.sendBackward(id)}
            onGroup={() => {
              api.groupShapes(selectedIds);
            }}
            onUngroup={() => {
              const first = api.scene.shapes.find((s) => s.id === selectedIds[0]);
              if (first?.groupId) api.ungroupShapes(first.groupId);
            }}
            onDuplicate={() => {
              const newIds = api.duplicateShapes(selectedIds, 8);
              setSelectedIds(newIds);
            }}
          />
        </div>
      </main>

      <LinkMissionModal
        key={linkModalOpen ? "open" : "closed"}
        canvasId={canvasId}
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        missions={availableMissions}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems({
            ids: contextMenu.ids,
            shapes: api.scene.shapes,
            onBringToFront: (id) => api.bringToFront(id),
            onBringForward: (id) => api.bringForward(id),
            onSendBackward: (id) => api.sendBackward(id),
            onSendToBack: (id) => api.sendToBack(id),
            onGroup: () => api.groupShapes(contextMenu.ids),
            onUngroup: () => {
              const first = api.scene.shapes.find((s) => s.id === contextMenu.ids[0]);
              if (first?.groupId) api.ungroupShapes(first.groupId);
            },
            onDuplicate: () => {
              const newIds = api.duplicateShapes(contextMenu.ids, 8);
              setSelectedIds(newIds);
            },
            onDelete: () => {
              api.removeShapes(contextMenu.ids);
              setSelectedIds([]);
            },
          })}
          onClose={() => setContextMenu(null)}
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
        onClick={() => onZoom(Math.max(MIN_ZOOM, zoom * 0.8))}
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
        onClick={() => onZoom(Math.min(MAX_ZOOM, zoom * 1.25))}
        className="hover:bg-surface-container-highest border-outline-variant flex h-10 w-10 items-center justify-center border-l"
        aria-label="Zoom in"
      >
        <MaterialIcon name="add" size={18} />
      </button>
    </div>
  );
}

function TextEditorOverlay({
  shape,
  zoom,
  cameraX,
  cameraY,
  onChange,
  onCommit,
}: {
  shape: { id: string; x: number; y: number; text: string; fontSize: number };
  zoom: number;
  cameraX: number;
  cameraY: number;
  onChange: (text: string) => void;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(shape.text.length, shape.text.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape.id]);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [shape.text]);
  return (
    <textarea
      ref={ref}
      defaultValue={shape.text}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCommit();
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onCommit();
        }
      }}
      placeholder="Type something…"
      className="text-headline-md border-primary absolute resize-none border-2 focus:outline-hidden"
      style={{
        left: shape.x * zoom + cameraX,
        top: shape.y * zoom + cameraY - shape.fontSize * zoom * 0.2,
        fontSize: `${shape.fontSize * zoom}px`,
        lineHeight: 1.2,
        minWidth: "120px",
        color: "#1e1b15",
        fontFamily: "var(--font-hanken-grotesk), sans-serif",
        fontWeight: 500,
        background: "rgba(255, 248, 241, 0.96)",
        padding: 0,
      }}
    />
  );
}

function contextMenuItems({
  ids,
  shapes,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onGroup,
  onUngroup,
  onDuplicate,
  onDelete,
}: {
  ids: ReadonlyArray<string>;
  shapes: ReadonlyArray<Shape>;
  onBringToFront: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onSendToBack: (id: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}): ReadonlyArray<
  { kind: "item"; item: { label: string; icon: string; shortcut?: string; onClick: () => void; disabled?: boolean; destructive?: boolean } } | { kind: "divider" }
> {
  const first = shapes.find((s) => s.id === ids[0]);
  const isGrouped = !!first?.groupId;
  return [
    {
      kind: "item",
      item: {
        label: "Bring to Front",
        icon: "flip_to_front",
        shortcut: "⌘]",
        onClick: () => onBringToFront(ids[0]!),
      },
    },
    {
      kind: "item",
      item: {
        label: "Bring Forward",
        icon: "arrow_upward",
        onClick: () => onBringForward(ids[0]!),
      },
    },
    {
      kind: "item",
      item: {
        label: "Send Backward",
        icon: "arrow_downward",
        onClick: () => onSendBackward(ids[0]!),
      },
    },
    {
      kind: "item",
      item: {
        label: "Send to Back",
        icon: "flip_to_back",
        shortcut: "⌘[",
        onClick: () => onSendToBack(ids[0]!),
      },
    },
    { kind: "divider" },
    {
      kind: "item",
      item: {
        label: "Group",
        icon: "group_work",
        shortcut: "⌘G",
        onClick: onGroup,
        disabled: ids.length < 2,
      },
    },
    {
      kind: "item",
      item: {
        label: "Ungroup",
        icon: "group_off",
        shortcut: "⌘⇧G",
        onClick: onUngroup,
        disabled: !isGrouped,
      },
    },
    { kind: "divider" },
    {
      kind: "item",
      item: {
        label: "Duplicate",
        icon: "content_copy",
        shortcut: "⌘D",
        onClick: onDuplicate,
      },
    },
    {
      kind: "item",
      item: {
        label: "Delete",
        icon: "delete",
        shortcut: "⌫",
        onClick: onDelete,
        destructive: true,
      },
    },
  ];
}
