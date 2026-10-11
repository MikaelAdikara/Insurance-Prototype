import { useEffect, useState } from "react";
import { datasets, type Mode } from "./lib/data";
import type { Action, Tab } from "./lib/assistant";
import XRay from "./pages/XRay";
import Watchlist from "./pages/Watchlist";
import SecondLook, { type Preset } from "./pages/SecondLook";
import Campaign from "./pages/Campaign";
import PilotPlanner from "./pages/PilotPlanner";
import Assistant from "./components/Assistant";

const TABS: Tab[] = ["Portfolio X-Ray", "Retention Watchlist", "Second Look Check", "Campaign Simulator", "Pilot Planner"];
const SLUG = ["x-ray", "watchlist", "second-look", "campaign", "pilot"];
const ANDI = { held: 1, firstType: "Life", firstPayment: "MONTHLY", type: "Life", premium: "<250K", payment: "MONTHLY" };
const startAndi = window.location.hash === "#andi"; // index.html#andi opens Second Look with Pak Andi loaded
const fromHash = (): Tab => (startAndi ? "Second Look Check" : TABS[Math.max(0, SLUG.indexOf(window.location.hash.slice(1)))]);

export default function App() {
  const [mode, setMode] = useState<Mode>(datasets.real ? "real" : "synthetic");
  const [tab, setTab] = useState<Tab>(fromHash);
  useEffect(() => { window.history.replaceState(null, "", `#${SLUG[TABS.indexOf(tab)]}`); }, [tab]);
  const [segFilter, setSegFilter] = useState("All");
  const [preset, setPreset] = useState<Preset>(startAndi ? { plan: ANDI, nonce: 1, andi: true } : null);
  const [chat, setChat] = useState(false);
  const data = datasets[mode]!;

  const openSegment = (code: string) => {
    setSegFilter(code);
    setTab("Retention Watchlist");
  };

  const onAction = (a: Action) => {
    if (a.segment) setSegFilter(a.segment);
    if (a.plan) {
      const andi = a.plan.held === 1 && a.plan.type === "Life" && a.plan.payment === "MONTHLY" && a.plan.premium === "<250K";
      setPreset({ plan: a.plan, nonce: Date.now(), andi });
    }
    setTab(a.tab);
  };

  // Presenter shortcuts: 1–5 switch screens, "/" opens the assistant, Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof Element && e.target.closest("input, select, textarea");
      if (e.key === "Escape") setChat(false);
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= TABS.length) setTab(TABS[n - 1]);
      if (e.key === "/") { e.preventDefault(); setChat(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="wordmark">SECOND LOOK</span>
          <span className="sub">Retention Intelligence</span>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t, i) => (
            <button key={t} role="tab" aria-selected={tab === t} className="tab" onClick={() => setTab(t)} title={`Shortcut: ${i + 1}`}>
              {t}
            </button>
          ))}
        </nav>
        <div className="mode" title="Real data stays on this laptop; synthetic data is safe to publish">
          <span>Data</span>
          {(["real", "synthetic"] as Mode[]).map((m) => (
            <button key={m} className="mode-btn" aria-pressed={mode === m} disabled={!datasets[m]} onClick={() => setMode(m)}>
              {m === "real" ? "Real" : "Synthetic"}
            </button>
          ))}
        </div>
      </header>

      <main key={`main-${mode}`}>
        <div className="view" key={tab}>
          {tab === "Portfolio X-Ray" && <XRay data={data} onSegment={openSegment} />}
          {tab === "Retention Watchlist" && <Watchlist data={data} segment={segFilter} setSegment={setSegFilter} />}
          {tab === "Second Look Check" && <SecondLook data={data} preset={preset} />}
          {tab === "Campaign Simulator" && <Campaign data={data} />}
          {tab === "Pilot Planner" && <PilotPlanner data={data} />}
        </div>
      </main>

      <Assistant key={`chat-${mode}`} data={data} open={chat} setOpen={setChat} onAction={onAction} />
    </div>
  );
}
