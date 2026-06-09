"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";
import { apiRequest } from "@/lib/client-api";
import {
  localCreateWeeklyReview,
  localDeleteWeeklyReview,
  localGetWeeklyReviews,
  localUpdateWeeklyReview,
  type LocalWeeklyReview,
} from "@/lib/local-storage-db";
import { useSignedIn } from "@/hooks/useData";

export type ReviewItem = {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  wentRight: string | null;
  wentWrong: string | null;
  nextPlan: string | null;
  finalNote: string | null;
};

type ReviewInput = Omit<ReviewItem, "id" | "weekStart" | "weekEnd"> & {
  weekStart: string;
  weekEnd: string;
};

type Props = {
  databaseAvailable: boolean;
};

const CACHE_KEY = "ad:weekly-reviews:data";

function dateValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

function normalize(review: ReviewItem): ReviewItem {
  return {
    ...review,
    weekStart: new Date(review.weekStart),
    weekEnd: new Date(review.weekEnd),
  };
}

function localReviewToItem(review: LocalWeeklyReview): ReviewItem {
  return {
    id: review.id,
    weekStart: new Date(review.weekStart),
    weekEnd: new Date(review.weekEnd),
    wentRight: review.wentRight,
    wentWrong: review.wentWrong,
    nextPlan: review.nextPlan,
    finalNote: review.finalNote,
  };
}

export function WeeklyReviewClient({
  databaseAvailable,
}: Props) {
  const router = useRouter();
  const isSignedIn = useSignedIn();
  const [reviews, setReviews] = useState<ReviewItem[]>(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.map(normalize);
      }
    } catch {}
    return [];
  });
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fetching = useRef(false);

  const fetchData = useCallback(async () => {
    if (!isSignedIn) {
      setReviews(localGetWeeklyReviews().map(localReviewToItem));
      return;
    }
    if (fetching.current || !databaseAvailable) return;
    fetching.current = true;
    try {
      const res = await fetch("/api/weekly-reviews-list/data");
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      const items = data.map(normalize);
      setReviews(items);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {}
    } catch {
      setError("Database unavailable. Start PostgreSQL and configure DATABASE_URL.");
    } finally {
      fetching.current = false;
    }
  }, [databaseAvailable, isSignedIn]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);
  const selected =
    selectedId === "new"
      ? null
      : reviews.find((review) => review.id === selectedId) ?? null;

  const save = async (input: ReviewInput) => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...input,
        weekStart: new Date(`${input.weekStart}T00:00:00`).toISOString(),
        weekEnd: new Date(`${input.weekEnd}T23:59:59`).toISOString(),
      };
      if (selectedId === "new") {
        let created: ReviewItem;
        if (!isSignedIn) {
          created = localReviewToItem(localCreateWeeklyReview(payload));
        } else {
          created = normalize(
            await apiRequest<ReviewItem>("/api/weekly-reviews", {
              method: "POST",
              body: JSON.stringify(payload),
            }),
          );
        }
        setReviews((current) => [created, ...current]);
      } else if (selectedId && selectedId !== "new") {
        const targetId = selectedId;
        // No easy optimistic update here without complexity, just wait for result
        let updated: ReviewItem;
        if (isSignedIn) {
          updated = normalize(
            await apiRequest<ReviewItem>(`/api/weekly-reviews/${targetId}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            }),
          );
        } else {
          const updatedLocal = localUpdateWeeklyReview(targetId, payload);
          if (!updatedLocal) throw new Error("Review no longer exists");
          updated = localReviewToItem(updatedLocal);
        }
        setReviews((current) =>
          current.map((review) => review.id === targetId ? updated : review),
        );
      }
      setSelectedId(null);
      if (isSignedIn) router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to save review",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    const target = selected;
    if (!target || !window.confirm("Delete this weekly review?")) return;
    setIsSaving(true);
    setError(null);
    try {
      if (isSignedIn) {
        await apiRequest<ReviewItem>(`/api/weekly-reviews/${target.id}`, {
          method: "DELETE",
        });
      } else {
        localDeleteWeeklyReview(target.id);
      }
      setReviews((current) => current.filter((review) => review.id !== target.id));
      setSelectedId(null);
      if (isSignedIn) router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to delete review",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="ml-0 min-h-screen p-margin-mobile md:ml-20 md:p-margin-desktop">
      <header className="border-outline-variant mb-lg flex items-center justify-between border-b pb-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg">Weekly Reviews</h1>
          <p className="text-on-surface-variant mt-xs">
            Record outcomes and turn them into next week&apos;s execution plan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedId("new")}
          className="bg-primary text-on-primary flex items-center gap-sm px-lg py-sm font-label-md uppercase"
        >
          <MaterialIcon name="add" size={18} />
          New Review
        </button>
      </header>

      {error && (
        <p role="alert" className="border-error text-error mb-lg border p-sm text-sm">
          {error}
        </p>
      )}
      {reviews.length === 0 ? (
        <div className="border-outline-variant flex min-h-64 items-center justify-center border border-dashed text-on-surface-variant">
          No reviews yet.
        </div>
      ) : (
        <div className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              onClick={() => setSelectedId(review.id)}
              className="border-outline-variant hover:border-primary bg-surface p-lg text-left border transition-colors"
            >
              <span className="font-label-sm text-primary uppercase">
                {review.weekStart.toLocaleDateString()} -{" "}
                {review.weekEnd.toLocaleDateString()}
              </span>
              <h2 className="font-headline-md mt-md">Execution Review</h2>
              <p className="text-on-surface-variant mt-sm line-clamp-3">
                {review.finalNote ?? review.nextPlan ?? "No summary written."}
              </p>
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <ReviewDrawer
          key={selectedId}
          review={selected}
          isSaving={isSaving}
          onClose={() => setSelectedId(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </main>
  );
}

function ReviewDrawer({
  review,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: {
  review: ReviewItem | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: ReviewInput) => void;
  onDelete: () => void;
}) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const [weekStart, setWeekStart] = useState(
    review ? dateValue(review.weekStart) : dateValue(monday),
  );
  const [weekEnd, setWeekEnd] = useState(
    review ? dateValue(review.weekEnd) : dateValue(sunday),
  );
  const [wentRight, setWentRight] = useState(review?.wentRight ?? "");
  const [wentWrong, setWentWrong] = useState(review?.wentWrong ?? "");
  const [nextPlan, setNextPlan] = useState(review?.nextPlan ?? "");
  const [finalNote, setFinalNote] = useState(review?.finalNote ?? "");

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close review editor"
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            weekStart,
            weekEnd,
            wentRight: wentRight.trim() || null,
            wentWrong: wentWrong.trim() || null,
            nextPlan: nextPlan.trim() || null,
            finalNote: finalNote.trim() || null,
          });
        }}
        className="bg-background border-outline-variant absolute top-0 right-0 bottom-0 flex w-[620px] max-w-full flex-col border-l"
      >
        <header className="border-outline-variant flex h-16 items-center justify-between border-b px-lg">
          <h2 className="font-headline-md">
            {review ? "Edit Weekly Review" : "New Weekly Review"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <MaterialIcon name="close" size={20} />
          </button>
        </header>
        <div className="flex flex-1 flex-col gap-lg overflow-y-auto p-lg">
          <div className="grid grid-cols-2 gap-md">
            <DateField label="Week start" value={weekStart} onChange={setWeekStart} />
            <DateField label="Week end" value={weekEnd} onChange={setWeekEnd} />
          </div>
          <TextField label="What went right?" value={wentRight} onChange={setWentRight} />
          <TextField label="What went wrong?" value={wentWrong} onChange={setWentWrong} />
          <TextField label="Next plan" value={nextPlan} onChange={setNextPlan} />
          <TextField label="Final note" value={finalNote} onChange={setFinalNote} />
        </div>
        <footer className="border-outline-variant flex gap-md border-t p-lg">
          {review && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSaving}
              className="border-error text-error border px-md disabled:opacity-40"
            >
              Delete
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary text-on-primary flex-1 py-sm font-label-md uppercase disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Save Review"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="font-label-sm uppercase">{label}</span>
      <input
        required
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-outline-variant bg-surface border p-sm"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="font-label-sm uppercase">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-outline-variant bg-surface resize-y border p-sm"
      />
    </label>
  );
}
