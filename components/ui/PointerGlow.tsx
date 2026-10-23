"use client";

import { useEffect } from "react";

/**
 * Feeds the pointer position into `.clarify-card` / `.clarify-card-soft`
 * (CSS vars --mx / --my) so their hover glow follows the cursor.
 * A single delegated listener keeps this cheap.
 */
export default function PointerGlow() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;

    let frame = 0;

    const onMove = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const card = target.closest<HTMLElement>(
        ".clarify-card, .clarify-card-soft",
      );
      if (!card) return;

      const { clientX, clientY } = event;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${clientX - rect.left}px`);
        card.style.setProperty("--my", `${clientY - rect.top}px`);
      });
    };

    document.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);

  return null;
}
