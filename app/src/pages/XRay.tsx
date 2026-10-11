import { ChevronRight } from "lucide-react";
import Constellation from "../components/Constellation";
import { useTilt } from "../components/useTilt";
import { useCountUp } from "../components/useTween";

function Count({ value, fmt }: { value: number; fmt: (n: number) => string }) {
  return <>{fmt(useCountUp(value))}</>;
}
import type { Dataset } from "../lib/data";
import { num, pct } from "../lib/format";

export const SEG_COLOR: Record<string, string> = {
  S1: "var(--gold)", S2: "var(--indigo)", S3: "#5B57A0", S4: "#9C99C9", S5: "#D9D7EC",
};

export default function XRay({ data, onSegment }: { data: Dataset; onSegment: (code: string) => void }) {
  const { kpi, segments, rule, not_drivers } = data.segments;
  const m = data.model.metrics;

  const bars = [
    { label: "Share of policies", key: "share_policies" as const },
    { label: "Share of all stops", key: "share_churn" as const },
  ];

  const tilt = useTilt();

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <h1 className="headline">
            Extra policies are <mark>{pct(kpi.extra_share)}</mark> of the book and <mark>{pct(kpi.extra_churn_share)}</mark> of
            everything that stopped.
          </h1>
          <p>Every dot is one policy; gold ones stopped. The smallest cloud, extra policies, is where the gold is.</p>
        </div>
        <Constellation policies={data.watchlist} segments={segments} onSegment={onSegment} />
      </section>

      <dl className="kpis">
        <div {...tilt}><dt>Policies</dt><dd><Count value={kpi.policies} fmt={(n) => num(Math.round(n))} /></dd></div>
        <div {...tilt}><dt title="A policy that was cancelled or not continued">Stop rate</dt><dd><Count value={kpi.stop_rate} fmt={(n) => pct(n)} /></dd></div>
        <div {...tilt}><dt>Extra policies (share of book)</dt><dd><Count value={kpi.extra_share} fmt={(n) => pct(n)} /></dd></div>
        <div {...tilt} className="accent"><dt>Share of all stops from extra policies</dt><dd><Count value={kpi.extra_churn_share} fmt={(n) => pct(n)} /></dd></div>
      </dl>

      <section className="panel">
        <div className="stack-chart">
          {bars.map((b, i) => (
            <div className="stack-row" key={b.key}>
              <span className="stack-label">{b.label}</span>
              <div className="stack" style={{ animationDelay: `${i * 120}ms` }}>
                {segments.map((s) => (
                  <button
                    key={s.code}
                    className="stack-seg"
                    style={{ flexGrow: s[b.key], background: SEG_COLOR[s.code] }}
                    title={`${s.code} ${s.name}: ${pct(s[b.key])}`}
                    onClick={() => onSegment(s.code)}
                  >
                    {s[b.key] >= 0.05 && <span className={s.code === "S5" || s.code === "S4" ? "dark" : ""}>{pct(s[b.key], 0)}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <ul className="legend">
            {segments.map((s) => (
              <li key={s.code}><i style={{ background: SEG_COLOR[s.code] }} />{s.code} {s.name}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="split">
        <section className="panel flush">
          <table className="table">
            <thead>
              <tr>
                <th>Group</th><th className="r">Policies</th><th className="r">Stopped</th>
                <th className="r">Stop rate (95% CI)</th><th className="r">Share of stops</th><th>Action</th><th />
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr key={s.code} className="clickable" onClick={() => onSegment(s.code)}>
                  <td><i className="dot" style={{ background: SEG_COLOR[s.code] }} /><b>{s.code}</b> {s.name}</td>
                  <td className="r">{num(s.n)}</td>
                  <td className="r">{num(s.churn)}</td>
                  <td className="r">{pct(s.rate)} <small>({pct(s.ci_low)}–{pct(s.ci_high)})</small></td>
                  <td className="r"><b>{pct(s.share_churn)}</b></td>
                  <td><span className={`badge b-${s.code}`}>{s.action}</span></td>
                  <td className="r"><ChevronRight size={18} aria-hidden /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="side">
          <section className="panel">
            <h3>One-line rule</h3>
            <p>
              Flag every extra policy paid monthly or in one payment, plus first-policy Personal Accident.
            </p>
            <p className="big-line">
              <b>{num(rule.flagged)}</b> flagged ({pct(rule.flagged / kpi.policies)}) catch <b>{num(rule.caught)}</b> of{" "}
              {num(rule.total_churn)} stops ({pct(rule.caught / rule.total_churn)}).
            </p>
          </section>
          <section className="panel">
            <h3>Not drivers</h3>
            <p>Gender, marital status, age (once other factors are controlled).</p>
            <ul className="facts">
              {not_drivers.map((d) => (
                <li key={d.factor}><span>{d.factor}</span><b>p = {d.p.toFixed(2)}</b></li>
              ))}
            </ul>
          </section>
          <p className="footnote">
            Model check: 5-fold out-of-fold AUC {m.oof_auc.toFixed(3)} · top 10% of scores catch {pct(m.top10_capture, 0)} of stops.
          </p>
        </aside>
      </div>
    </div>
  );
}
