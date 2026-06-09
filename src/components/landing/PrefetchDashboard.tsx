"use client";

import { useEffect } from "react";

const pages = ["/dashboard", "/board", "/canvas", "/post-lab", "/weekly-review"] as const;

const preloads: { url: string; key: string }[] = [
  { url: "/api/dashboard/stats", key: "ad:dashboard:stats" },
  { url: "/api/board/data", key: "ad:board:data" },
  { url: "/api/canvases-list/data", key: "ad:canvases:data" },
  { url: "/api/post-lab/data", key: "ad:postlab:data" },
  { url: "/api/weekly-reviews-list/data", key: "ad:weekly-reviews:data" },
];

export function PrefetchDashboard() {
  useEffect(() => {
    const controller = new AbortController();
    const headers = { RSC: "1", "Next-Router-Prefetch": "1" };
    for (const href of pages) {
      fetch(href, { signal: controller.signal, headers }).catch(() => {});
    }

    for (const { url, key } of preloads) {
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          try {
            sessionStorage.setItem(key, JSON.stringify(data));
          } catch {}
        })
        .catch(() => {});
    }

    return () => controller.abort();
  }, []);
  return null;
}
