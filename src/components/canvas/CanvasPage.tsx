"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/dashboard/Sidebar";
import Konva from "konva";
import {
  deleteCanvasAction,
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
  type TextShape,
  type Tool,
  type ToolDefaults,
  DEFAULT_TOOL_DEFAULTS,
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
  userId?: string;
};

const TOOL_KEYBINDS: Record<string, Tool> = {
  v: "select",
  s: "select",
  h: "pan",
  p: "pen",
  d: "pen",
  r: "rect",
  o: "ellipse",
  a: "arrow",
  t: "text",
  e: "eraser",
};

type TextEditorShape = Pick<
  TextShape,
  "id" | "x" | "y" | "text" | "fontSize" | "width" | "align" | "stroke"
>;

export function CanvasPage({
  canvasId,
  initialTitle,
  initialScene,
  linked,
  availableMissions,
  userId,
}: Props) {
  const router = useRouter();
  const api = useScene(initialScene);
  const [title, setTitle] = useState(initialTitle);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedIds, setSelectedIds] = useState<ReadonlyArray<string>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedScene, setLastSavedScene] = useState<Scene>(initialScene);
  const [lastSavedTitle, setLastSavedTitle] = useState<string>(initialTitle);
  const [textEditor, setTextEditor] = useState<{
    shape: TextEditorShape;
    isNew: boolean;
    cameraX: number;
    cameraY: number;
    zoom: number;
  } | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [toolDefaults, setToolDefaults] = useState<ToolDefaults>(DEFAULT_TOOL_DEFAULTS);
  const [contextMenu, setContextMenu] = useState<
    | {
        x: number;
        y: number;
        kind: "canvas" | "shapes";
        ids: ReadonlyArray<string>;
      }
    | null
  >(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const saveSequenceRef = useRef(0);

  const selectedShapes = useMemo<ReadonlyArray<Shape>>(() => {
    const set = new Set(selectedIds);
    return api.scene.shapes.filter((s) => set.has(s.id));
  }, [api.scene.shapes, selectedIds]);

  const isDirty = useMemo<boolean>(
    () => api.scene !== lastSavedScene || title !== lastSavedTitle,
    [api.scene, title, lastSavedScene, lastSavedTitle],
  );

  const handleSave = useCallback(() => {
    const sceneSnapshot = api.scene;
    const titleSnapshot = title;
    const sequence = ++saveSequenceRef.current;
    setIsSaving(true);

    if (!userId) {
      import("@/lib/local-storage-db").then(({ localUpdateCanvas }) => {
        if (saveSequenceRef.current !== sequence) return;
        localUpdateCanvas(canvasId, { title: titleSnapshot, data: sceneSnapshot });
        setLastSavedScene(sceneSnapshot);
        setLastSavedTitle(titleSnapshot);
        setLastSavedAt(new Date());
        if (saveSequenceRef.current === sequence) setIsSaving(false);
      });
      return;
    }

    void fetch(`/api/canvases/${encodeURIComponent(canvasId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ title: titleSnapshot, data: sceneSnapshot }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Canvas save failed");
        if (saveSequenceRef.current !== sequence) return;
        setLastSavedScene(sceneSnapshot);
        setLastSavedTitle(titleSnapshot);
        setLastSavedAt(new Date());
      })
      .catch(() => {
        // Keep the editor dirty so the next autosave or manual save retries.
      })
      .finally(() => {
        if (saveSequenceRef.current === sequence) setIsSaving(false);
      });
  }, [api.scene, canvasId, title, userId]);

  useEffect(() => {
    if (!isDirty) return;
    const t = setTimeout(() => {
      void handleSave();
    }, 1500);
    return () => clearTimeout(t);
  }, [isDirty, handleSave]);

  const handleDrawingEnd = useCallback(() => {
    setTool("select");
  }, []);

  const handleRequestTextEdit = useCallback(
    (shape: TextEditorShape, isNew = false) => {
      setSelectedIds([shape.id]);
      setTextEditor({
        shape,
        isNew,
        cameraX: api.scene.camera.x,
        cameraY: api.scene.camera.y,
        zoom: api.scene.camera.zoom,
      });
    },
    [api.scene.camera],
  );

  const handleCreateText = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      const stage = stageRef.current;
      if (!container || !stage) return;
      const bounds = container.getBoundingClientRect();
      const camera = {
        x: stage.x(),
        y: stage.y(),
        zoom: stage.scaleX(),
      };
      const x =
        (clientX - bounds.left - camera.x) /
        camera.zoom;
      const y =
        (clientY - bounds.top - camera.y) /
        camera.zoom;
      const textShape = {
        type: "text" as const,
        x,
        y,
        rotation: 0,
        groupId: null,
        stroke: toolDefaults.stroke,
        fill: "transparent",
        fillPattern: "none" as const,
        strokeWidth: 0,
        text: "",
        fontSize: toolDefaults.fontSize,
        align: toolDefaults.textAlign,
      };
      const id = api.addShape(textShape);
      setTextEditor({
        shape: { ...textShape, id },
        isNew: true,
        cameraX: camera.x,
        cameraY: camera.y,
        zoom: camera.zoom,
      });
      setSelectedIds([id]);
      setTool("select");
    },
    [
      api,
      toolDefaults.fontSize,
      toolDefaults.stroke,
      toolDefaults.textAlign,
    ],
  );

  const commitTextEdit = useCallback(
    (text: string) => {
      if (!textEditor) return;
      const trimmed = text.trim();
      if (trimmed === "") {
        api.removeShapes([textEditor.shape.id]);
        setSelectedIds([]);
      } else {
        if (trimmed !== textEditor.shape.text) {
          const update = textEditor.isNew
            ? api.updateShapeTransient
            : api.updateShape;
          update(textEditor.shape.id, { text: trimmed });
        }
        setSelectedIds([textEditor.shape.id]);
      }
      setTextEditor(null);
      setTool("select");
    },
    [api, textEditor],
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
    if (!userId) {
      import("@/lib/local-storage-db").then(({ localDeleteCanvas }) => {
        localDeleteCanvas(canvasId);
        router.push("/canvas");
      });
      return;
    }
    startDelete(async () => {
      const result = await deleteCanvasAction(canvasId);
      if (result.success) router.push("/canvas");
    });
  }, [canvasId, router, userId]);

  const handleUnlinkMission = useCallback(
    (missionId: string) => {
      if (userId) {
        startDelete(async () => {
          await unlinkMissionFromCanvasAction(canvasId, missionId);
        });
      }
      // Anonymous: nothing to unlink since localStorage has no link concept
    },
    [canvasId, userId],
  );

  const handleShowContextMenu = useCallback(
    (
      point: { sx: number; sy: number; wx: number; wy: number },
      ids: ReadonlyArray<string>,
    ) => {
      if (ids.length > 0) setSelectedIds(ids);
      setContextMenu({
        x: point.sx,
        y: point.sy,
        kind: ids.length > 0 ? "shapes" : "canvas",
        ids,
      });
    },
    [],
  );

  const handleSetSelectedIds = useCallback(
    (ids: ReadonlyArray<string>, additive = false) => {
      if (additive) {
        setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
      } else {
        setSelectedIds(ids);
      }
    },
    [],
  );

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-0 flex min-h-0 min-w-0 flex-1 flex-col md:ml-20">
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
              setSelectedIds={handleSetSelectedIds}
              toolDefaults={toolDefaults}
              onRequestTextEdit={handleRequestTextEdit}
              onContextMenuEvent={handleShowContextMenu}
              containerRef={containerRef}
              stageRef={stageRef}
              editingTextId={textEditor?.shape.id ?? null}
              onDrawingEnd={handleDrawingEnd}
            />

            {tool === "text" && !textEditor && (
              <div
                className="absolute inset-0 z-20 cursor-text"
                aria-label="Place text on canvas"
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  handleCreateText(event.clientX, event.clientY);
                }}
              />
            )}

            {textEditor && (
              <TextEditorOverlay
                key={textEditor.shape.id}
                shape={textEditor.shape}
                zoom={textEditor.zoom}
                cameraX={textEditor.cameraX}
                cameraY={textEditor.cameraY}
                onCommit={commitTextEdit}
              />
            )}

          </div>

          <CanvasInspector
            canvasTitle={title}
            onTitleChange={setTitle}
            tool={tool}
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
          items={
            contextMenu.kind === "canvas"
              ? canvasContextMenuItems({
                  onPanTool: () => setTool("pan"),
                  onSelectAll: () =>
                    setSelectedIds(api.scene.shapes.map((shape) => shape.id)),
                  onResetView: () =>
                    api.setCamera({ x: 0, y: 0, zoom: 1 }),
                })
              : contextMenuItems({
                  ids: contextMenu.ids,
                  shapes: api.scene.shapes,
                  onBringToFront: (id) => api.bringToFront(id),
                  onBringForward: (id) => api.bringForward(id),
                  onSendBackward: (id) => api.sendBackward(id),
                  onSendToBack: (id) => api.sendToBack(id),
                  onGroup: () => api.groupShapes(contextMenu.ids),
                  onUngroup: () => {
                    const first = api.scene.shapes.find(
                      (s) => s.id === contextMenu.ids[0],
                    );
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
                })
          }
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

function TextEditorOverlay({
  shape,
  zoom,
  cameraX,
  cameraY,
  onCommit,
}: {
  shape: {
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    width?: number;
    align?: TextShape["align"];
    stroke?: string;
  };
  zoom: number;
  cameraX: number;
  cameraY: number;
  onCommit: (text: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(shape.text);
  const isDark = useSyncExternalStore(
    (cb) => { const obs = new MutationObserver(cb); obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }); return () => obs.disconnect(); },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  const textColor = isDark ? "#f0ede8" : "#1e1b15";
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
  }, [draft]);
  return (
    <textarea
      ref={ref}
      autoFocus
      value={draft}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder="Type something…"
      className="focus:outline-hidden absolute resize-none overflow-hidden border-0 bg-transparent"
      style={{
        left: shape.x * zoom + cameraX,
        top: shape.y * zoom + cameraY,
        fontSize: `${shape.fontSize * zoom}px`,
        lineHeight: 1.2,
        width: `${(shape.width ?? 200) * zoom}px`,
        minWidth: "160px",
        minHeight: `${shape.fontSize * zoom * 1.4}px`,
        color: textColor,
        caretColor: textColor,
        fontFamily: "var(--font-schoolbell), cursive",
        fontWeight: 400,
        textAlign: shape.align ?? "left",
        background: "transparent",
        outline: "none",
        padding: 0,
        zIndex: 50,
        pointerEvents: "auto",
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

function canvasContextMenuItems({
  onPanTool,
  onSelectAll,
  onResetView,
}: {
  onPanTool: () => void;
  onSelectAll: () => void;
  onResetView: () => void;
}): ReadonlyArray<
  | {
      kind: "item";
      item: {
        label: string;
        icon: string;
        shortcut?: string;
        onClick: () => void;
      };
    }
  | { kind: "divider" }
> {
  return [
    {
      kind: "item",
      item: {
        label: "Grab Tool",
        icon: "pan_tool",
        shortcut: "H",
        onClick: onPanTool,
      },
    },
    {
      kind: "item",
      item: {
        label: "Select All",
        icon: "select_all",
        shortcut: "⌘A",
        onClick: onSelectAll,
      },
    },
    { kind: "divider" },
    {
      kind: "item",
      item: {
        label: "Reset View",
        icon: "center_focus_strong",
        onClick: onResetView,
      },
    },
  ];
}
