const STORAGE_PREFIX = "attackdesk:";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 15);
}

function now(): string {
  return new Date().toISOString();
}

type Mission = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  dueDate: string | null;
  order: number;
  deadlineId: string | null;
  canvasId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Deadline = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  category: string | null;
  status: string;
  priority: string;
  link: string | null;
  createdAt: string;
  updatedAt: string;
};

type PostIdea = {
  id: string;
  title: string;
  hook: string | null;
  draft: string | null;
  finalContent: string | null;
  category: string | null;
  status: string;
  postedUrl: string | null;
  order: number;
  canvasId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Canvas = {
  id: string;
  title: string;
  description: string | null;
  data: unknown;
  thumbnail: string | null;
  deadlineId: string | null;
  createdAt: string;
  updatedAt: string;
};

type WeeklyReview = {
  id: string;
  weekStart: string;
  weekEnd: string;
  wentRight: string | null;
  wentWrong: string | null;
  nextPlan: string | null;
  finalNote: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Missions ──

export function localGetMissions() {
  return read<Mission[]>("missions", []).sort(
    (a, b) => a.order - b.order,
  );
}

export function localCreateMission(
  data: Omit<Mission, "id" | "createdAt" | "updatedAt">,
): Mission {
  const missions = localGetMissions();
  const mission: Mission = {
    ...data,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  missions.push(mission);
  write("missions", missions);
  return mission;
}

export function localUpdateMission(id: string, data: Partial<Mission>) {
  const missions = localGetMissions();
  const idx = missions.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  missions[idx] = { ...missions[idx]!, ...data, updatedAt: now() };
  write("missions", missions);
  return missions[idx];
}

export function localDeleteMission(id: string) {
  const missions = localGetMissions().filter((m) => m.id !== id);
  write("missions", missions);
}

// ── Deadlines ──

export function localGetDeadlines() {
  return read<Deadline[]>("deadlines", []).sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
}

export function localCreateDeadline(
  data: Omit<Deadline, "id" | "createdAt" | "updatedAt">,
): Deadline {
  const deadlines = localGetDeadlines();
  const deadline: Deadline = {
    ...data,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  deadlines.push(deadline);
  write("deadlines", deadlines);
  return deadline;
}

export function localUpdateDeadline(id: string, data: Partial<Deadline>) {
  const deadlines = localGetDeadlines();
  const idx = deadlines.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  deadlines[idx] = { ...deadlines[idx]!, ...data, updatedAt: now() };
  write("deadlines", deadlines);
  return deadlines[idx];
}

export function localDeleteDeadline(id: string) {
  const deadlines = localGetDeadlines().filter((d) => d.id !== id);
  write("deadlines", deadlines);
}

// ── Post Ideas ──

export function localGetPosts() {
  return read<PostIdea[]>("posts", []).sort(
    (a, b) => a.order - b.order,
  );
}

export function localCreatePost(
  data: Omit<PostIdea, "id" | "createdAt" | "updatedAt">,
): PostIdea {
  const posts = localGetPosts();
  const post: PostIdea = {
    ...data,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  posts.push(post);
  write("posts", posts);
  return post;
}

export function localUpdatePost(id: string, data: Partial<PostIdea>) {
  const posts = localGetPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx]!, ...data, updatedAt: now() };
  write("posts", posts);
  return posts[idx];
}

export function localDeletePost(id: string) {
  const posts = localGetPosts().filter((p) => p.id !== id);
  write("posts", posts);
}

// ── Canvases ──

export const LOCAL_CANVAS_ID = "anonymous-canvas";

export function hasLocalCanvas(): boolean {
  return read<Canvas[]>("canvases", []).length > 0;
}

export function localGetCanvases() {
  return read<Canvas[]>("canvases", []).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function localGetCanvasById(id: string) {
  return read<Canvas[]>("canvases", []).find((c) => c.id === id) ?? null;
}

export function localCreateCanvas(
  data: Omit<Canvas, "id" | "createdAt" | "updatedAt">,
): Canvas | null {
  const canvases = localGetCanvases();
  if (canvases.length >= 1) return null;
  const canvas: Canvas = {
    ...data,
    id: LOCAL_CANVAS_ID,
    createdAt: now(),
    updatedAt: now(),
  };
  canvases.push(canvas);
  write("canvases", canvases);
  return canvas;
}

export function localUpdateCanvas(id: string, data: Partial<Canvas>) {
  const canvases = localGetCanvases();
  const idx = canvases.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  canvases[idx] = { ...canvases[idx]!, ...data, updatedAt: now() };
  write("canvases", canvases);
  return canvases[idx];
}

export function localDeleteCanvas(id: string) {
  const canvases = localGetCanvases().filter((c) => c.id !== id);
  write("canvases", canvases);
}

// ── Weekly Reviews ──

export function localGetWeeklyReviews() {
  return read<WeeklyReview[]>("reviews", []).sort(
    (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime(),
  );
}

export function localCreateWeeklyReview(
  data: Omit<WeeklyReview, "id" | "createdAt" | "updatedAt">,
): WeeklyReview {
  const reviews = localGetWeeklyReviews();
  const review: WeeklyReview = {
    ...data,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  reviews.push(review);
  write("reviews", reviews);
  return review;
}

export function localUpdateWeeklyReview(
  id: string,
  data: Partial<WeeklyReview>,
) {
  const reviews = localGetWeeklyReviews();
  const idx = reviews.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  reviews[idx] = { ...reviews[idx]!, ...data, updatedAt: now() };
  write("reviews", reviews);
  return reviews[idx];
}

export function localDeleteWeeklyReview(id: string) {
  const reviews = localGetWeeklyReviews().filter((r) => r.id !== id);
  write("reviews", reviews);
}

// ── Import / Export (for cloud sync) ──

export function getAllLocalData() {
  return {
    missions: localGetMissions(),
    deadlines: localGetDeadlines(),
    posts: localGetPosts(),
    canvases: localGetCanvases(),
    reviews: localGetWeeklyReviews(),
  };
}

export function clearAllLocalData() {
  const keys = ["missions", "deadlines", "posts", "canvases", "reviews"];
  for (const key of keys) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  }
}
