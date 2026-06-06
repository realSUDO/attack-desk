"use client";

import {
  type Dispatch,
  type Reducer,
  useCallback,
  useReducer,
} from "react";

import {
  DEFAULT_FILL,
  DEFAULT_FILL_PATTERN,
  DEFAULT_STROKE,
  DEFAULT_STROKE_WIDTH,
  HISTORY_LIMIT,
  type Camera,
  type Scene,
  type Shape,
} from "./types";

let _z = 0;
function nextZ(): number {
  _z += 1;
  return Date.now() + _z;
}

function nextId(): string {
  return `s_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

type Action =
  | { type: "load"; scene: Scene }
  | { type: "add"; shape: Shape }
  | { type: "update"; id: string; patch: Partial<Shape> }
  | { type: "remove"; ids: ReadonlyArray<string> }
  | { type: "translate"; ids: ReadonlyArray<string>; dx: number; dy: number }
  | { type: "camera"; camera: Partial<Camera> }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "begin_coalesce" }
  | { type: "end_coalesce" };

type State = {
  past: ReadonlyArray<Scene>;
  present: Scene;
  future: ReadonlyArray<Scene>;
  coalesce: boolean;
};

function freeze(scene: Scene): Scene {
  return {
    camera: { ...scene.camera },
    shapes: scene.shapes.map((s) => structuredClone(s)),
  };
}

function snapshot(state: State, scene: Scene, coalesce: boolean): State {
  if (coalesce) {
    return { ...state, present: freeze(scene) };
  }
  const past = [...state.past, state.present].slice(-HISTORY_LIMIT);
  return {
    past,
    present: freeze(scene),
    future: [],
    coalesce: false,
  };
}

const reducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case "load": {
      return {
        past: [],
        present: freeze(action.scene),
        future: [],
        coalesce: false,
      };
    }
    case "add": {
      const scene: Scene = {
        camera: state.present.camera,
        shapes: [...state.present.shapes, action.shape],
      };
      return snapshot(state, scene, false);
    }
    case "update": {
      const scene: Scene = {
        camera: state.present.camera,
        shapes: state.present.shapes.map((s) =>
          s.id === action.id ? ({ ...s, ...action.patch } as Shape) : s,
        ),
      };
      return snapshot(state, scene, state.coalesce);
    }
    case "remove": {
      const ids = new Set(action.ids);
      const scene: Scene = {
        camera: state.present.camera,
        shapes: state.present.shapes.filter((s) => !ids.has(s.id)),
      };
      return snapshot(state, scene, false);
    }
    case "translate": {
      const ids = new Set(action.ids);
      const scene: Scene = {
        camera: state.present.camera,
        shapes: state.present.shapes.map((s) => {
          if (!ids.has(s.id)) return s;
          if (s.type === "pen" || s.type === "arrow") {
            return {
              ...s,
              points: s.points.map(
                ([px, py]) => [px + action.dx, py + action.dy] as const,
              ),
            } as Shape;
          }
          return {
            ...s,
            x: s.x + action.dx,
            y: s.y + action.dy,
          } as Shape;
        }),
      };
      return snapshot(state, scene, state.coalesce);
    }
    case "camera": {
      return {
        ...state,
        present: {
          ...state.present,
          camera: { ...state.present.camera, ...action.camera },
        },
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
      const next = state.future[0]!;
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
        coalesce: false,
      };
    }
    case "begin_coalesce":
      return { ...state, coalesce: true };
    case "end_coalesce":
      return { ...state, coalesce: false };
  }
};

export type SceneDispatch = Dispatch<Action>;

export function useScene(initial: Scene) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    past: [],
    present: freeze(initial),
    future: [],
    coalesce: false,
  }));

  const load = useCallback((scene: Scene) => dispatch({ type: "load", scene }), []);
  const addShape = useCallback((partial: Omit<Shape, "id" | "z">) => {
    const id = nextId();
    const z = nextZ();
    const shape = { ...partial, id, z } as Shape;
    dispatch({ type: "add", shape });
    return id;
  }, []);
  const updateShape = useCallback(
    (id: string, patch: Partial<Shape>) =>
      dispatch({ type: "update", id, patch }),
    [],
  );
  const removeShapes = useCallback(
    (ids: ReadonlyArray<string>) => dispatch({ type: "remove", ids }),
    [],
  );
  const setCamera = useCallback(
    (patch: Partial<Camera>) => dispatch({ type: "camera", camera: patch }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const beginCoalesce = useCallback(
    () => dispatch({ type: "begin_coalesce" }),
    [],
  );
  const endCoalesce = useCallback(() => dispatch({ type: "end_coalesce" }), []);

  return {
    scene: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    load,
    addShape,
    updateShape,
    removeShapes,
    setCamera,
    undo,
    redo,
    beginCoalesce,
    endCoalesce,
  };
}

export function makeDefaultShapeProps() {
  return {
    stroke: DEFAULT_STROKE,
    fill: DEFAULT_FILL,
    fillPattern: DEFAULT_FILL_PATTERN,
    strokeWidth: DEFAULT_STROKE_WIDTH,
  };
}

export { nextId };
