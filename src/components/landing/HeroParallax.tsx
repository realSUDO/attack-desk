"use client";

import { useEffect } from "react";

export function HeroParallax() {
  useEffect(() => {
    const onScroll = () => {
      const preview = document.getElementById("hero-preview");
      if (!preview) return;
      preview.style.transform = `translateY(${window.pageYOffset * 0.05}px)`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
