"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import { apiRequest } from "@/lib/client-api";

import { PostCard, POST_STATUSES, type BoardPost } from "./PostCard";
import { PostDrawer, type PostInput } from "./PostDrawer";

type Props = {
  databaseAvailable: boolean;
};

const CACHE_KEY = "ad:postlab:data";

function normalizePost(post: BoardPost): BoardPost {
  return { ...post, updatedAt: new Date(post.updatedAt) };
}

function SortablePostCard({ post, onSelect, accentColor }: { post: BoardPost; onSelect: (id: string) => void; accentColor: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id, data: { status: post.status } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }} {...attributes} {...listeners}>
      <PostCard post={post} onSelect={onSelect} accentColor={accentColor} />
    </div>
  );
}

const POST_ORDER_KEY = "attackdesk:postlab:order";
const loadPostOrder = (): string[] => { try { return JSON.parse(localStorage.getItem(POST_ORDER_KEY) ?? "[]"); } catch { return []; } };
const savePostOrder = (posts: BoardPost[]) => { try { localStorage.setItem(POST_ORDER_KEY, JSON.stringify(posts.map((p) => p.id))); } catch {} };
function applyPostOrder(posts: BoardPost[]): BoardPost[] {
  const order = loadPostOrder();
  if (!order.length) return posts;
  const map = new Map(posts.map((p) => [p.id, p]));
  const sorted: BoardPost[] = [];
  for (const id of order) { const p = map.get(id); if (p) { sorted.push(p); map.delete(id); } }
  for (const p of map.values()) sorted.push(p);
  return sorted;
}

export function PostLabClient({ databaseAvailable }: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLElement>(null);
  const [posts, setPosts] = useState<BoardPost[]>(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return applyPostOrder(parsed.map(normalizePost));
      }
    } catch {}
    return [];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activePost, setActivePost] = useState<BoardPost | null>(null);
  const fetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetching.current || !databaseAvailable) return;
    fetching.current = true;
    try {
      const res = await fetch("/api/post-lab/data");
      const data = await res.json();
      const items = data.map(normalizePost);
      setPosts(applyPostOrder(items));
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {}
    } catch {
      setError("Database unavailable. Start PostgreSQL and configure DATABASE_URL.");
    } finally {
      fetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const [overStatus, setOverStatus] = useState<BoardPost["status"] | null>(null);
  const overStatusRef = useRef<BoardPost["status"] | null>(null);
  const dragOriginStatus = useRef<BoardPost["status"] | null>(null);
  const selected = posts.find((post) => post.id === selectedId) ?? null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => [p.title, p.hook, p.draft, p.category].filter(Boolean).some((v) => v!.toLowerCase().includes(q)));
  }, [posts, search]);

  // Horizontal scroll: wheel + mouse-drag pan
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY * 0.625;
    };
    let startX = 0, startScroll = 0, dragging = false;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button,a,[role=button],[data-dragging]")) return;
      dragging = true; startX = e.clientX; startScroll = el.scrollLeft;
      el.style.cursor = "grabbing"; el.style.userSelect = "none";
    };
    const onMouseMove = (e: MouseEvent) => { if (dragging) el.scrollLeft = startScroll - (e.clientX - startX); };
    const onMouseUp = () => { if (!dragging) return; dragging = false; el.style.cursor = ""; el.style.userSelect = ""; };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    const p = posts.find((p) => p.id === active.id);
    if (p) { setActivePost(p); dragOriginStatus.current = p.status; }
  }, [posts]);

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over || over.id === active.id) return;
    const overId = over.id as string;
    const overIsColumn = POST_STATUSES.map((s) => s.status).includes(overId as BoardPost["status"]);
    const newStatus = overIsColumn ? (overId as BoardPost["status"]) : (posts.find((p) => p.id === overId)?.status ?? null);
    if (!newStatus) return;
    if (newStatus !== overStatusRef.current) { overStatusRef.current = newStatus; setOverStatus(newStatus); }
    setPosts((prev) => {
      const fromIdx = prev.findIndex((p) => p.id === active.id);
      if (fromIdx === -1) return prev;
      const next = [...prev];
      next[fromIdx] = { ...next[fromIdx]!, status: newStatus };
      let toIdx: number;
      if (overIsColumn) {
        const lastIdx = next.reduce((acc, p, i) => (p.status === newStatus ? i : acc), -1);
        toIdx = lastIdx === -1 ? next.length - 1 : lastIdx;
      } else {
        toIdx = next.findIndex((p) => p.id === overId);
        if (toIdx === -1) return prev;
      }
      if (fromIdx === toIdx) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, [posts]);

  const onDragEnd = useCallback(({ active }: DragEndEvent) => {
    const finalStatus = posts.find((p) => p.id === active.id)?.status;
    const originStatus = dragOriginStatus.current;
    setActivePost(null); setOverStatus(null); overStatusRef.current = null; dragOriginStatus.current = null;
    // Always save order to localStorage
    setPosts((prev) => { savePostOrder(prev); return prev; });
    if (!finalStatus || !originStatus || finalStatus === originStatus) return;
    void apiRequest<BoardPost>(`/api/posts/${active.id}`, {
      method: "PATCH", body: JSON.stringify({ status: finalStatus }),
    }).catch(() => setPosts((prev) => prev.map((p) => p.id === active.id ? { ...p, status: originStatus } : p)));
  }, [posts]);

  const closeDrawer = () => { setIsCreating(false); setSelectedId(null); setError(null); };

  const savePost = async (input: PostInput) => {
    setIsSaving(true); setError(null);
    try {
      if (isCreating) {
        const created = normalizePost(await apiRequest<BoardPost>("/api/posts", { method: "POST", body: JSON.stringify(input) }));
        setPosts((c) => [...c, created]);
      } else if (selected) {
        const prev = selected;
        setPosts((c) => c.map((p) => p.id === selected.id ? { ...selected, ...input, updatedAt: new Date() } : p));
        try {
          const updated = normalizePost(await apiRequest<BoardPost>(`/api/posts/${selected.id}`, { method: "PATCH", body: JSON.stringify(input) }));
          setPosts((c) => c.map((p) => p.id === selected.id ? updated : p));
        } catch (e) { setPosts((c) => c.map((p) => p.id === prev.id ? prev : p)); throw e; }
      }
      closeDrawer(); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save post"); } finally { setIsSaving(false); }
  };

  const deletePost = async () => {
    if (!selected || !window.confirm(`Delete "${selected.title}"?`)) return;
    const prev = posts;
    setPosts((c) => c.filter((p) => p.id !== selected.id)); setIsSaving(true);
    try { await apiRequest<BoardPost>(`/api/posts/${selected.id}`, { method: "DELETE" }); closeDrawer(); router.refresh(); }
    catch (e) { setPosts(prev); setError(e instanceof Error ? e.message : "Unable to delete post"); }
    finally { setIsSaving(false); }
  };

  return (
    <>
      <header className="bg-background border-outline-variant fixed top-0 right-0 left-20 z-40 flex h-16 items-center justify-between border-b px-margin-desktop">
        <div className="flex items-center gap-lg">
          <h1 className="font-headline-md text-primary font-bold">Content Lab</h1>
          <div className="border-outline-variant bg-surface-container flex items-center border px-md py-xs">
            <MaterialIcon name="search" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts..." className="font-label-md w-64 border-none bg-transparent outline-none" />
          </div>
        </div>
        <button type="button" onClick={() => setIsCreating(true)} className="bg-primary text-on-primary px-lg py-sm font-label-md uppercase">New Post</button>
      </header>

      <main ref={scrollRef} className="board-scroll bg-background ml-20 mt-16 flex h-[calc(100vh-64px)] overflow-x-auto overflow-y-hidden p-lg">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <div className="flex h-full min-w-max gap-lg pb-lg">
            {POST_STATUSES.map(({ status, title, color }) => {
              const col = filtered.filter((p) => p.status === status);
              const isOver = overStatus === status;
              return (
                <PostColumn key={status} status={status} title={title} color={color} isOver={isOver} count={col.length}>
                  <SortableContext items={col.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                    {col.length === 0 ? (
                      <div className={`border-outline-variant flex h-24 items-center justify-center border border-dashed text-xs text-on-surface-variant transition-colors ${isOver ? "border-primary text-primary" : ""}`}>
                        Drop here
                      </div>
                    ) : col.map((p) => (
                      <SortablePostCard key={p.id} post={p} onSelect={setSelectedId} accentColor={color} />
                    ))}
                  </SortableContext>
                </PostColumn>
              );
            })}
          </div>
          <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
            {activePost ? (
              <div className="rotate-1 scale-[1.03] opacity-95 shadow-2xl">
                {(() => { const s = POST_STATUSES.find((s) => s.status === activePost.status); return <PostCard post={activePost} onSelect={() => {}} accentColor={s?.color} />; })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {error && <p className="border-error text-error fixed right-md bottom-md z-50 border bg-background p-sm text-sm">{error}</p>}
      <PostDrawer
        key={isCreating ? "new" : (selectedId ?? "closed")}
        post={selected} mode={isCreating ? "create" : "edit"}
        error={error} isSaving={isSaving}
        onClose={closeDrawer} onSave={savePost} onDelete={deletePost}
      />
    </>
  );
}

function PostColumn({ status, title, color, isOver, count, children }: {
  status: string; title: string; color: string; isOver: boolean; count: number; children: React.ReactNode;
}) {
  const { setNodeRef } = useSortable({ id: status, data: { type: "column" } });
  return (
    <div ref={setNodeRef} className={`border-outline-variant flex h-full w-[560px] shrink-0 flex-col border transition-colors ${isOver ? "bg-surface-container" : "bg-surface-container-low"}`}>
      <div className="bg-surface-container border-outline-variant flex items-center justify-between border-b p-md">
        <div className="flex items-center gap-sm">
          <span className="h-2 w-2 shrink-0" style={{ backgroundColor: color }} />
          <span className="mono-label font-label-md">{title}</span>
        </div>
        <span className="font-metadata text-on-surface-variant">{String(count).padStart(2, "0")}</span>
      </div>
      <div className="flex flex-1 flex-col gap-md overflow-y-auto p-md">{children}</div>
    </div>
  );
}