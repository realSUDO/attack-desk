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
import { LinkMissionModal } from "./LinkMissionModal";
import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_STROKE_WIDTH,
  type Scene,
  type Shape,
  type TextShape,
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
  const scene = useScene(initialScene);
  const [title, setTitle] = useState(initialTitle);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedScene, setLastSavedScene] = useState<Scene>(initialScene);
  const [lastSavedTitle, setLastSavedTitle] = useState<string>(initialTitle);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [editingTextPos, setEditingTextPos] = useState<{ x: number; y: number } | null>(null);
  const [textEditKey, setTextEditKey] = useState(0);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const selectedShape = useMemo<Shape | null>(
    () => scene.scene.shapes.find((s) => s.id === selectedId) ?? null,
    [scene.scene.shapes, selectedId],
  );

  const isDirty = useMemo<boolean>(
    () => scene.scene !== lastSavedScene || title !== lastSavedTitle,
    [scene.scene, title, lastSavedScene, lastSavedTitle],
  );

  const handleSave = useCallback(() => {
    startSave(async () => {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("data", JSON.stringify(scene.scene));
      const result = await saveCanvasAction(canvasId, formData);
      if (result.success) {
        setLastSavedScene(scene.scene);
        setLastSavedTitle(title);
        setLastSavedAt(new Date());
      }
    });
  }, [canvasId, scene.scene, title]);

  // Auto-save 1.5s after last change
  useEffect(() => {
    if (!isDirty) return;
    const t = setTimeout(() => {
      void handleSave();
    }, 1500);
    return () => clearTimeout(t);
  }, [isDirty, handleSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
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
        if (selectedId) {
          e.preventDefault();
          scene.removeShapes([selectedId]);
          setSelectedId(null);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && k === "z") {
        e.preventDefault();
        scene.undo();
        return;
      }

      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && k === "z") ||
        ((e.metaKey || e.ctrlKey) && k === "y")
      ) {
        e.preventDefault();
        scene.redo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && k === "s") {
        e.preventDefault();
        void handleSave();
        return;
      }

      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave, scene, selectedId]);

  const handleTextRequest = useCallback(
    (x: number, y: number) => {
      const id = scene.addShape({
        type: "text",
        x,
        y,
        stroke: "#1e1b15",
        fill: "transparent",
        fillPattern: "none",
        strokeWidth: DEFAULT_STROKE_WIDTH,
        text: "",
        fontSize: DEFAULT_FONT_SIZE,
      } as Omit<TextShape, "id" | "z">);
      if (typeof id === "string") {
        setSelectedId(id);
        setEditingTextId(id);
        setEditingTextValue("");
        setEditingTextPos({ x, y });
        setTextEditKey((k) => k + 1);
      }
    },
    [scene],
  );

  useEffect(() => {
    if (editingTextId && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [editingTextId, textEditKey]);

  const handleTextCommit = useCallback(() => {
    if (editingTextId) {
      const trimmed = editingTextValue.trim();
      if (trimmed === "") {
        scene.removeShapes([editingTextId]);
      } else {
        scene.updateShape(editingTextId, { text: trimmed });
      }
      setEditingTextId(null);
      setEditingTextValue("");
      setEditingTextPos(null);
    }
  }, [editingTextId, editingTextValue, scene]);

  const handleUpdateSelected = useCallback(
    (patch: Partial<Shape>) => {
      if (!selectedId) return;
      scene.updateShape(selectedId, patch);
    },
    [scene, selectedId],
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedId) {
      scene.removeShapes([selectedId]);
      setSelectedId(null);
    }
  }, [scene, selectedId]);

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

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-20 flex flex-1 flex-col">
        <CanvasToolbar
          tool={tool}
          onTool={setTool}
          canUndo={scene.canUndo}
          canRedo={scene.canRedo}
          onUndo={scene.undo}
          onRedo={scene.redo}
          isSaving={isSaving}
          isDirty={isDirty}
          onSave={handleSave}
        />

        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex-1">
            <CanvasSurface
              shapes={scene.scene.shapes}
              camera={scene.scene.camera}
              selectedId={selectedId}
              tool={tool}
              onCamera={scene.setCamera}
              onCommitShape={scene.addShape}
              onUpdateShape={scene.updateShape}
              onSelect={setSelectedId}
              onErase={(id) => scene.removeShapes([id])}
              onBeginCoalesce={scene.beginCoalesce}
              onEndCoalesce={scene.endCoalesce}
              onTextRequest={handleTextRequest}
              surfaceRef={surfaceRef}
            />

            {editingTextId && editingTextPos && (
              <textarea
                key={textEditKey}
                ref={textInputRef}
                value={editingTextValue}
                onChange={(e) => {
                  setEditingTextValue(e.target.value);
                  if (editingTextId) {
                    scene.updateShape(editingTextId, { text: e.target.value });
                  }
                }}
                onBlur={handleTextCommit}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    handleTextCommit();
                  } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleTextCommit();
                  }
                }}
                placeholder="Type something…"
                className="font-headline-md text-headline-md border-primary absolute z-50 resize-none border-2 bg-background p-0 focus:outline-hidden"
                style={{
                  left:
                    editingTextPos.x * scene.scene.camera.zoom +
                    scene.scene.camera.x,
                  top:
                    editingTextPos.y * scene.scene.camera.zoom +
                    scene.scene.camera.y,
                  fontSize: `${DEFAULT_FONT_SIZE * scene.scene.camera.zoom}px`,
                  lineHeight: 1.2,
                  minWidth: "120px",
                  color: "#1e1b15",
                }}
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
              zoom={scene.scene.camera.zoom}
              onZoom={(z) => scene.setCamera({ zoom: z })}
            />
          </div>

          <CanvasInspector
            canvasTitle={title}
            onTitleChange={setTitle}
            selected={selectedShape}
            onUpdateSelected={handleUpdateSelected}
            onDeleteSelected={handleDeleteSelected}
            linkedMissions={linked.missions}
            linkedDeadlines={linked.deadlines}
            lastSavedAt={lastSavedAt}
            isDeleting={isDeleting}
            onDeleteCanvas={handleDeleteCanvas}
            onOpenLinkModal={() => setLinkModalOpen(true)}
            onUnlinkMission={handleUnlinkMission}
          />
        </div>
      </main>

      <LinkMissionModal
        canvasId={canvasId}
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        missions={availableMissions}
      />
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
