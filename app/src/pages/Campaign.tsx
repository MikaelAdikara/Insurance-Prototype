import { useMemo, useState } from "react";
import type { Dataset } from "../lib/data";
import { isRule } from "../lib/assistant";
import { num, pct } from "../lib/format";

type Method = "rule" | "model" | "random";
const METHODS: { key: Method; label: string; note: string }[] = [
  { key: "rule", label: "One-line rule", note: "Extra policy paid monthly or in one payment, plus first-policy Personal Accident" },
  { key: "model", label: "Model ranking", note: "Highest risk scores first" },
  { key: "random", label: "Random outreach", note: "What a blanket campaign looks like" },
];

export default function Campaign({ data }: { data: Dataset }) {
  const [saveRate, setSaveRate] = useState(20);
  const [budget, setBudget] = useState(340);
  const total = data.watchlist.length;
  const totalStops = data.segments.kpi.churn;

  // historical stops reached when calling `budget` policies with each method
  const results = useMemo(() => {
    const byScore = data.watchlist; // already sorted by score desc
    const rule = byScore.filter(isRule);
    const reached = {
      rule: rule.slice(0, budget).filter((p) => p.is_churn).length,
      model: byScore.slice(0, budget).filter((p) => p.is_churn).length,
      random: budget * (totalStops / total),
    };
    const ruleMax = rule.length;
    return METHODS.map((m) => {
      const calls = m.key === "rule" ? Math.min(budget, ruleMax) : budget;
      const hit = reached[m.key];
      const saved = hit * (saveRate / 100);
      return { ...m, calls, hit, saved, perSave: saved > 0 ? calls / saved : Infinity };
    });
  }, [data, budget, saveRate, total, totalStops]);

  const ruleSize = useMemo(() => data.watchlist.filter(isRule).length, [data]);
  const worst = Math.max(...results.filter((r) => Number.isFinite(r.perSave)).map((r) => r.perSave));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Targeting turns {Math.round(results[2].perSave)} contacts into {Math.round(results[0].perSave)}</h1>
        <p>Same budget, different list. Replayed on the historical book: how many of the policies that stopped would each list have reached?</p>
      </div>

      <section className="panel sliders">
        <label className="field">
          <span>Calls this campaign: <b>{num(budget)}</b> policies ({pct(budget / total)} of the book)</span>
          <input type="range" min={50} max={1500} step={10} value={budget} onChange={(e) => setBudget(+e.target.value)} />
        </label>
        <label className="field">
          <span>Save rate if we reach a policy that would stop: <b>{saveRate}%</b></span>
          <input type="range" min={5} max={50} step={1} value={saveRate} onChange={(e) => setSaveRate(+e.target.value)} />
        </label>
      </section>

      <div className="methods">
        {results.map((r) => (
          <section key={r.key} className={`panel method m-${r.key}`}>
            <h3>{r.label}</h3>
            <p className="muted">{r.note}</p>
            <div className="method-num">
              <span className="num">{Number.isFinite(r.perSave) ? Math.round(r.perSave) : "–"}</span>
              <span>contacts per policy saved</span>
            </div>
            <div className="meter"><div style={{ transform: `scaleX(${Number.isFinite(r.perSave) ? r.perSave / worst : 1})` }} /></div>
            <ul className="facts">
              <li><span>Policies called</span><b>{num(r.calls)}</b></li>
              <li><span>Would-be stops reached</span><b>{num(Math.round(r.hit))} of {num(totalStops)}</b></li>
              <li><span>Policies saved</span><b>≈ {r.saved.toFixed(0)}</b></li>
            </ul>
          </section>
        ))}
      </div>
      <p className="disclaimer">
        The save rate is an assumption, not a measurement; the pilot measures it. The rule flags {num(ruleSize)} policies, so the rule never makes more calls than that.
      </p>
    </div>
  );
}
