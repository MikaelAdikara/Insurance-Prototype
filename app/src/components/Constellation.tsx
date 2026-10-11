import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Policy, Segment } from "../lib/data";

// 5,000 policies as points, one cloud per group. Stopped policies glow gold.
// Drag to rotate; clicking a group label opens that group in the watchlist.

function dotTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.85)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

type Props = { policies: Policy[]; segments: Segment[]; onSegment: (code: string) => void };

export default function Constellation({ policies, segments, onSegment }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const el = host.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.6, 11);
    camera.lookAt(0, 0, 0);
    const world = new THREE.Group();
    scene.add(world);

    // one spinning cloud per group, laid out left to right; radius ~ cube root of size
    const radius = Object.fromEntries(segments.map((s) => [s.code, 0.13 * Math.cbrt(Math.max(s.n, 1))]));
    const GAP = 0.55;
    const total = segments.reduce((a, s) => a + 2 * radius[s.code] + GAP, -GAP);
    let x = -total / 2;
    const center: Record<string, THREE.Vector3> = {};
    for (const s of segments) {
      x += radius[s.code];
      center[s.code] = new THREE.Vector3(x, 0, 0);
      x += radius[s.code] + GAP;
    }

    const pts: Record<string, { active: number[]; stopped: number[] }> = {};
    segments.forEach((s) => (pts[s.code] = { active: [], stopped: [] }));
    const rnd = ((seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647))(42);
    for (const p of policies) {
      if (!pts[p.segment]) continue;
      const r = radius[p.segment] * Math.cbrt(rnd());
      const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
      const v = [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
      (p.is_churn ? pts[p.segment].stopped : pts[p.segment].active).push(...v);
    }
    const tex = dotTexture();
    const disposables: { dispose: () => void }[] = [tex];
    const matActive = new THREE.PointsMaterial({ color: "#a9a5ee", size: 0.075, map: tex, transparent: true, opacity: 0.85, depthWrite: false });
    const matStopped = new THREE.PointsMaterial({ color: "#f5bb3c", size: 0.24, map: tex, transparent: true, opacity: 1, depthWrite: false });
    disposables.push(matActive, matStopped);
    const groups = segments.map((s) => {
      const g = new THREE.Group();
      g.position.copy(center[s.code]);
      for (const [arr, mat] of [[pts[s.code].active, matActive], [pts[s.code].stopped, matStopped]] as const) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
        disposables.push(geo);
        g.add(new THREE.Points(geo, mat));
      }
      world.add(g);
      return g;
    });

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.position.set(0, 0.9, Math.max((total / 2 + 0.5) / (tan * camera.aspect), 2.6 / tan));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // drag spins every cloud, with eased follow
    let target = 0, rot = -0.6, dragging = false, lastX = 0;
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest(".c-label")) return;
      dragging = true; lastX = e.clientX; el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => { if (dragging) { target += (e.clientX - lastX) * 0.01; lastX = e.clientX; } };
    const up = () => { dragging = false; };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);

    const v = new THREE.Vector3();
    let raf = 0, t0 = performance.now();
    const tick = (t: number) => {
      const dt = Math.min((t - t0) / 1000, 0.05); t0 = t;
      if (!dragging && !reduce) target += dt * 0.25;
      rot += (target - rot) * (reduce ? 1 : 0.08);
      groups.forEach((g) => g.rotation.set(0.25, rot, 0));
      matStopped.size = 0.24 + Math.sin(t / 500) * (reduce ? 0 : 0.03);
      renderer.render(scene, camera);
      const w = el.clientWidth, h = el.clientHeight;
      segments.forEach((seg, i) => {
        const lab = labels.current[seg.code];
        if (!lab) return;
        const below = i % 2 === 1;
        v.copy(center[seg.code]).add(new THREE.Vector3(0, (radius[seg.code] + 0.3) * (below ? -1 : 1), 0)).project(camera);
        lab.style.transform = `translate(-50%, ${below ? "0" : "-100%"}) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [policies, segments]);

  return (
    <div className="constellation" ref={host}>
      {segments.map((s) => (
        <button key={s.code} className={`c-label ${s.code === "S1" ? "hot" : ""}`}
          ref={(b) => { labels.current[s.code] = b; }} onClick={() => onSegment(s.code)}>
          <b>{s.code}</b> {s.churn} of {s.n.toLocaleString("en-US")} stopped
        </button>
      ))}
      <p className="c-hint">Each dot is a policy · gold = stopped · drag to rotate</p>
    </div>
  );
}
