import { useEffect, useRef, useState } from "react";

// Animates a number toward `value` with a strong ease-out. Snaps when reduced motion is on.
export function useTween(value: number, ms = 520): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); from.current = value; return; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    // frames can pause (hidden tab, busy main thread): always land on the final value
    const done = window.setTimeout(() => { cancelAnimationFrame(raf); setShown(value); from.current = value; }, ms + 80);
    const step = (t: number) => {
      const k = Math.min((t - start) / ms, 1), e = 1 - Math.pow(1 - k, 4);
      const v = a + (value - a) * e;
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); clearTimeout(done); };
  }, [value, ms]);
  return shown;
}

// Counts up from 0 once on mount.
export function useCountUp(value: number, ms = 900): number {
  const [target, setTarget] = useState(0);
  useEffect(() => { const id = window.setTimeout(() => setTarget(value), 30); return () => clearTimeout(id); }, [value]);
  return useTween(target, ms);
}
