"use client";

import { useCallback, useMemo, useReducer } from "react";

import {
  type Camera,
  type Scene,
  type Shape,
  HISTORY_LIMIT,
  generateId,
} from "./types";

type State = {
  past: Array<Scene>;
  present: Scene;
  future: Array<Scene>;
  coalesce: boolean;
};

type Action =
  | { type: "set"; scene: Scene }
  | { type: "add"; shape: Shape }
  | { type: "update"; id: string; patch: Partial<Shape> }
  | { type: "update_transient"; id: string; patch: Partial<Shape> }
  | { type: "updateMany"; updates: ReadonlyArray<{ id: string; patch: Partial<Shape> }> }
  | { type: "remove"; ids: ReadonlyArray<string> }
  | { type: "translate"; ids: ReadonlyArray<string>; dx: number; dy: number }
  | { type: "camera"; patch: Partial<Camera> }
  | { type: "reorder"; id: string; to: "front" | "back" | "forward" | "backward" }
  | { type: "group"; ids: ReadonlyArray<string>; groupId: string }
  | { type: "ungroup"; groupId: string }
  | { type: "duplicate"; ids: ReadonlyArray<string>; offset: number }
  | { type: "begin_coalesce" }
  | { type: "end_coalesce" }
  | { type: "undo" }
  | { type: "redo" };

function pushHistory(past: Array<Scene>, present: Scene, coalesce: boolean): Array<Scene> {
  if (coalesce) {
    return past.length > 0 ? past : past;
  }
  const next = [...past, present];
  if (next.length > HISTORY_LIMIT) next.shift();
  return next;
}

function withPresent(state: State, next: Scene): State {
  if (state.coalesce) {
    return { ...state, present: next };
  }
  return {
    past: pushHistory(state.past, state.present, state.coalesce),
    present: next,
    future: [],
    coalesce: state.coalesce,
  };
}

function nextZ(shapes: ReadonlyArray<Shape>): number {
  let max = 0;
  for (const s of shapes) if (s.z > max) max = s.z;
  return max + 1;
}

function prevZ(shapes: ReadonlyArray<Shape>): number {
  let min = 0;
  for (const s of shapes) if (s.z < min) min = s.z;
  return min - 1;
}

function updateShapesInScene(
  scene: Scene,
  mapper: (shapes: ReadonlyArray<Shape>) => ReadonlyArray<Shape>,
): Scene {
  return { ...scene, shapes: mapper(scene.shapes) };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set":
      return { past: [], present: action.scene, future: [], coalesce: false };
    case "add": {
      const shape = { ...action.shape, z: nextZ(state.present.shapes) };
      return withPresent(state, updateShapesInScene(state.present, (s) => [...s, shape]));
    }
    case "update": {
      return withPresent(
        state,
        updateShapesInScene(state.present, (shapes) =>
          shapes.map((s) => (s.id === action.id ? ({ ...s, ...action.patch } as Shape) : s)),
        ),
      );
    }
    case "update_transient": {
      return {
        ...state,
        present: updateShapesInScene(state.present, (shapes) =>
          shapes.map((s) =>
            s.id === action.id ? ({ ...s, ...action.patch } as Shape) : s,
          ),
        ),
      };
    }
    case "updateMany": {
      const updateMap = new Map(action.updates.map((u) => [u.id, u.patch]));
      return withPresent(
        state,
        updateShapesInScene(state.present, (shapes) =>
          shapes.map((s) => {
            const patch = updateMap.get(s.id);
            return patch ? ({ ...s, ...patch } as Shape) : s;
          }),
        ),
      );
    }
    case "remove": {
      const ids = new Set(action.ids);
      return withPresent(
        state,
        updateShapesInScene(state.present, (shapes) => shapes.filter((s) => !ids.has(s.id))),
      );
    }
    case "translate": {
      const ids = new Set(action.ids);
      return withPresent(
        state,
        updateShapesInScene(state.present, (shapes) =>
          shapes.map((s) =>
            ids.has(s.id) ? { ...s, x: s.x + action.dx, y: s.y + action.dy } : s,
          ),
        ),
      );
    }
    case "camera":
      return { ...state, present: { ...state.present, camera: { ...state.present.camera, ...action.patch } } };
    case "reorder": {
      const target = state.present.shapes.find((s) => s.id === action.id);
      if (!target) return state;
      const newZ = (() => {
        if (action.to === "front") return nextZ(state.present.shapes);
        if (action.to === "back") return prevZ(state.present.shapes);
        const sorted = state.present.shapes.slice().sort((a, b) => a.z - b.z);
        const idx = sorted.findIndex((s) => s.id === action.id);
        if (action.to === "forward") {
          const next = sorted[idx + 1];
          return next ? (target.z + next.z) / 2 : target.z + 1;
        }
        const prev = sorted[idx - 1];
        return prev ? (target.z + prev.z) / 2 : target.z - 1;
      })();
      return withPresent(
        state,
        updateShapesInScene(state.present, (shapes) =>
          shapes.map((s) => (s.id === action.id ? ({ ...s, z: newZ } as Shape) : s)),
        ),
      );
    }
    case "group": {
      const gid = action.groupId;
      const ids = new Set(action.ids);
      return withPresent(
        state,
        updateShapesInScene(state.present, (shapes) =>
          shapes.map((s) => (ids.has(s.id) ? ({ ...s, groupId: gid } as Shape) : s)),
        ),
      );
    }
    case "ungroup": {
      const gid = action.groupId;
      return withPresent(
        state,
        updateShapesInScene(state.present, (shapes) =>
          shapes.map((s) => (s.groupId === gid ? ({ ...s, groupId: null } as Shape) : s)),
        ),
      );
    }
    case "duplicate": {
      const ids = new Set(action.ids);
      const max = nextZ(state.present.shapes);
      const originals = state.present.shapes.filter((s) => ids.has(s.id));
      const copies: Array<Shape> = [];
      for (let i = 0; i < originals.length; i += 1) {
        const s = originals[i]!;
        const newId = generateId();
        const x = s.x + action.offset;
        const y = s.y + action.offset;
        const z = max + i;
        copies.push({ ...s, id: newId, z, x, y });
      }
      return withPresent(state, updateShapesInScene(state.present, (shapes) => [...shapes, ...copies]));
    }
    case "begin_coalesce":
      return { ...state, coalesce: true };
    case "end_coalesce": {
      if (!state.coalesce) return state;
      return {
        past: pushHistory(state.past, state.present, false),
        present: state.present,
        future: [],
        coalesce: false,
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1]!;
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        coalesce: false,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        past: [...state.past, state.present],
        present: next!,
        future: rest,
        coalesce: false,
      };
    }
  }
}

export type SceneApi = {
  scene: Scene;
  canUndo: boolean;
  canRedo: boolean;
  setScene: (scene: Scene) => void;
  addShape: (shape: Omit<Shape, "id" | "z">) => string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  updateShapeTransient: (id: string, patch: Partial<Shape>) => void;
  updateMany: (updates: ReadonlyArray<{ id: string; patch: Partial<Shape> }>) => void;
  removeShapes: (ids: ReadonlyArray<string>) => void;
  translateShapes: (ids: ReadonlyArray<string>, dx: number, dy: number) => void;
  setCamera: (patch: Partial<Camera>) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  groupShapes: (ids: ReadonlyArray<string>) => string | null;
  ungroupShapes: (groupId: string) => void;
  duplicateShapes: (ids: ReadonlyArray<string>, offset?: number) => Array<string>;
  beginCoalesce: () => void;
  endCoalesce: () => void;
  undo: () => void;
  redo: () => void;
};

export function useScene(initial: Scene): SceneApi {
  const [state, dispatch] = useReducer(reducer, {
    past: [],
    present: initial,
    future: [],
    coalesce: false,
  });

  const addShape = useCallback((partial: Omit<Shape, "id" | "z">): string => {
    const id = generateId();
    const shape = { ...partial, id, z: 0 } as Shape;
    dispatch({ type: "add", shape });
    return id;
  }, []);

  const groupShapes = useCallback((ids: ReadonlyArray<string>): string | null => {
    if (ids.length < 2) return null;
    const groupId = generateId();
    dispatch({ type: "group", ids, groupId });
    return groupId;
  }, []);

  const duplicateShapes = useCallback(
    (ids: ReadonlyArray<string>, offset = 8): Array<string> => {
      const newIds: Array<string> = [];
      for (let i = 0; i < ids.length; i += 1) newIds.push(generateId());
      dispatch({ type: "duplicate", ids, offset });
      return newIds;
    },
    [],
  );

  const setScene = useCallback((scene: Scene) => {
    dispatch({ type: "set", scene });
  }, []);
  const updateShape = useCallback((id: string, patch: Partial<Shape>) => {
    dispatch({ type: "update", id, patch });
  }, []);
  const updateShapeTransient = useCallback(
    (id: string, patch: Partial<Shape>) => {
      dispatch({ type: "update_transient", id, patch });
    },
    [],
  );
  const updateMany = useCallback(
    (updates: ReadonlyArray<{ id: string; patch: Partial<Shape> }>) => {
      dispatch({ type: "updateMany", updates });
    },
    [],
  );
  const removeShapes = useCallback((ids: ReadonlyArray<string>) => {
    dispatch({ type: "remove", ids });
  }, []);
  const translateShapes = useCallback(
    (ids: ReadonlyArray<string>, dx: number, dy: number) => {
      dispatch({ type: "translate", ids, dx, dy });
    },
    [],
  );
  const setCamera = useCallback((patch: Partial<Camera>) => {
    dispatch({ type: "camera", patch });
  }, []);
  const bringToFront = useCallback((id: string) => {
    dispatch({ type: "reorder", id, to: "front" });
  }, []);
  const sendToBack = useCallback((id: string) => {
    dispatch({ type: "reorder", id, to: "back" });
  }, []);
  const bringForward = useCallback((id: string) => {
    dispatch({ type: "reorder", id, to: "forward" });
  }, []);
  const sendBackward = useCallback((id: string) => {
    dispatch({ type: "reorder", id, to: "backward" });
  }, []);
  const ungroupShapes = useCallback((groupId: string) => {
    dispatch({ type: "ungroup", groupId });
  }, []);
  const beginCoalesce = useCallback(() => {
    dispatch({ type: "begin_coalesce" });
  }, []);
  const endCoalesce = useCallback(() => {
    dispatch({ type: "end_coalesce" });
  }, []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  return useMemo<SceneApi>(
    () => ({
      scene: state.present,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      setScene,
      addShape,
      updateShape,
      updateShapeTransient,
      updateMany,
      removeShapes,
      translateShapes,
      setCamera,
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      groupShapes,
      ungroupShapes,
      duplicateShapes,
      beginCoalesce,
      endCoalesce,
      undo,
      redo,
    }),
    [
      state,
      setScene,
      addShape,
      updateShape,
      updateShapeTransient,
      updateMany,
      removeShapes,
      translateShapes,
      setCamera,
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      groupShapes,
      ungroupShapes,
      duplicateShapes,
      beginCoalesce,
      endCoalesce,
      undo,
      redo,
    ],
  );
}
