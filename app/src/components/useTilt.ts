import type { PointerEvent } from "react";

// Subtle 3D tilt toward the pointer. Writes transform directly on the element (no CSS-variable recalc).
export function useTilt(max = 7) {
  const fine = typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches;
  if (!fine) return {};
  return {
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const el = e.currentTarget, r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(700px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateZ(6px)`;
    },
    onPointerLeave(e: PointerEvent<HTMLElement>) {
      e.currentTarget.style.transform = "";
    },
  };
}
