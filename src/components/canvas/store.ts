"use client";

import { useCallback, useMemo, useReducer, useRef } from "react";

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
        if (s.type === "pen") {
          copies.push({ ...s, id: newId, z, x, y });
        } else if (s.type === "arrow") {
          copies.push({ ...s, id: newId, z, x, y });
        } else if (s.type === "rect" || s.type === "ellipse") {
          copies.push({ ...s, id: newId, z, x, y });
        } else {
          copies.push({ ...s, id: newId, z, x, y });
        }
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

  return useMemo<SceneApi>(
    () => ({
      scene: state.present,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      setScene: (scene) => dispatch({ type: "set", scene }),
      addShape,
      updateShape: (id, patch) => dispatch({ type: "update", id, patch }),
      removeShapes: (ids) => dispatch({ type: "remove", ids }),
      translateShapes: (ids, dx, dy) => dispatch({ type: "translate", ids, dx, dy }),
      setCamera: (patch) => dispatch({ type: "camera", patch }),
      bringToFront: (id) => dispatch({ type: "reorder", id, to: "front" }),
      sendToBack: (id) => dispatch({ type: "reorder", id, to: "back" }),
      bringForward: (id) => dispatch({ type: "reorder", id, to: "forward" }),
      sendBackward: (id) => dispatch({ type: "reorder", id, to: "backward" }),
      groupShapes,
      ungroupShapes: (groupId) => dispatch({ type: "ungroup", groupId }),
      duplicateShapes,
      beginCoalesce: () => dispatch({ type: "begin_coalesce" }),
      endCoalesce: () => dispatch({ type: "end_coalesce" }),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
    }),
    [state, addShape, groupShapes, duplicateShapes],
  );
}

export function useSceneRef(api: SceneApi) {
  return useRef(api);
}
