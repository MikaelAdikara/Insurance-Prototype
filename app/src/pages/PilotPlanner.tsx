import { useState } from "react";
import type { Dataset } from "../lib/data";
import { num } from "../lib/format";
import { nPerArm } from "../lib/sampleSize";

export default function PilotPlanner({ data }: { data: Dataset }) {
  const [groupKey, setGroupKey] = useState(data.pilot[0].key);
  const group = data.pilot.find((g) => g.key === groupKey)!;
  const [base, setBase] = useState(+(group.baseline * 100).toFixed(1));
  const [drop, setDrop] = useState(10);
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.8);
  const [perMonth, setPerMonth] = useState(group.per_month);

  const pickGroup = (k: string) => {
    const g = data.pilot.find((x) => x.key === k)!;
    setGroupKey(k);
    setBase(+(g.baseline * 100).toFixed(1));
    setDrop(k === "s2_pa" ? 5 : 10);
  };

  const n = nPerArm(base / 100, (base - drop) / 100, alpha, power);
  const valid = Number.isFinite(n);
  const months = valid ? Math.ceil((2 * n) / Math.max(perMonth, 1)) : NaN;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Prove it with a pilot</h1>
        <p>Half the agents use SECOND LOOK, half don't. This is how many new policies each half needs.</p>
      </div>

      <div className="check-grid">
        <section className="panel form">
          <label className="field"><span>Target group</span>
            <select value={groupKey} onChange={(e) => pickGroup(e.target.value)}>
              {data.pilot.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
            </select>
          </label>
          <div className="two">
            <label className="field"><span>Current stop rate (%)</span>
              <input type="number" step={0.1} min={0.1} max={99.9} value={base} onChange={(e) => setBase(+e.target.value)} />
            </label>
            <label className="field"><span>Target reduction (points)</span>
              <input type="number" step={1} min={1} max={base - 0.1} value={drop} onChange={(e) => setDrop(+e.target.value)} />
            </label>
          </div>
          <div className="two">
            <label className="field"><span>Significance</span>
              <select value={alpha} onChange={(e) => setAlpha(+e.target.value)}>
                {[0.01, 0.05, 0.1].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="field"><span>Power</span>
              <select value={power} onChange={(e) => setPower(+e.target.value)}>
                {[0.8, 0.9].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          </div>
          <label className="field"><span>New policies in this group per month (both halves)</span>
            <input type="number" min={1} value={perMonth} onChange={(e) => setPerMonth(+e.target.value)} />
          </label>
        </section>

        <section className="panel result neutral">
          <p className="result-label">Policies needed per group</p>
          <div className="result-num"><span className="num">{valid ? num(n) : "–"}</span></div>
          <p className="big-line">
            {valid
              ? <>Total <b>{num(2 * n)}</b> policies · estimated pilot length <b>{months} month{months === 1 ? "" : "s"}</b></>
              : "Pick a reduction smaller than the current stop rate."}
          </p>
          {valid && months <= 36 && (
            <div className="months" aria-label={`${months} months`}>
              {Array.from({ length: Math.max(months, 1) }, (_, i) => <span key={i} style={{ animationDelay: `${i * 40}ms` }}>M{i + 1}</span>)}
            </div>
          )}
          <h3>Design</h3>
          <ul className="facts">
            <li><span>Randomise by</span><b>agent or branch, 50/50</b></li>
            <li><span>Main KPI</span><b>stop rate at 12 months</b></li>
            <li><span>Guardrail</span><b>new policies sold per agent</b></li>
            <li><span>Guardrail</span><b>premium per customer</b></li>
          </ul>
          <p className="disclaimer">
            Two-proportion z-test, {Math.round((1 - alpha) * 100)}% confidence, {Math.round(power * 100)}% power. Randomising by agent
            needs extra sample for clustering. The pilot answers the cause-and-effect question historical data can't.
          </p>
        </section>
      </div>
    </div>
  );
}
