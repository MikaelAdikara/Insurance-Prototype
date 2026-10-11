import { useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import type { Dataset, Policy } from "../lib/data";
import { PAY_LABEL, TYPE_LABEL, num, ordinal, pct } from "../lib/format";
import { SEG_COLOR } from "./XRay";

const PAGE = 40;

function script(p: Policy): string {
  const a = p.action;
  if (a.startsWith("Offer auto-debit"))
    return `"Thank you for trusting us with ${p.n_pol} policies. Your ${ordinal(p.pol_seq)} policy is billed every month. Would an annual payment or auto-debit be easier? We can also merge it into your main policy so you only have one bill."`;
  if (a.startsWith("Needs review"))
    return `"We noticed this cover overlaps with your first policy. We can add it as a top-up on that policy instead, same protection, one policy to manage."`;
  if (a.startsWith("Renewal"))
    return `"Your Personal Accident cover ends soon. Reply YES to renew in one click, your protection continues without a gap."`;
  if (a.startsWith("Watch")) return "No call yet. Contact only if another policy of this customer stops.";
  if (a.startsWith("Light nudge")) return "No call. Add an auto-debit reminder to the next regular statement.";
  return "No call. Core customer: keep out of retention campaigns.";
}

function toCsv(rows: Policy[]): string {
  const head = ["priority", "policy_id", "customer_id", "segment", "product", "premium", "payment", "position", "score", "reasons", "action"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.priority, r.policy_id, r.customer_id, r.segment, r.insurance_type, r.premium, r.payment_frequency,
      `${r.pol_seq} of ${r.n_pol}`, r.score.toFixed(3), r.reasons.join("; "), r.action].map(esc).join(","));
  return [head.join(","), ...lines].join("\n");
}

type Props = { data: Dataset; segment: string; setSegment: (s: string) => void };

export default function Watchlist({ data, segment, setSegment }: Props) {
  const [type, setType] = useState("All");
  const [pay, setPay] = useState("All");
  const [prio, setPrio] = useState("All");
  const [showStopped, setShowStopped] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<Policy | null>(null);

  const rows = useMemo(
    () => data.watchlist.filter((r) =>
      (showStopped || !r.is_churn) && (segment === "All" || r.segment === segment) &&
      (type === "All" || r.insurance_type === type) && (pay === "All" || r.payment_frequency === pay) &&
      (prio === "All" || r.priority === prio)),
    [data, segment, type, pay, prio, showStopped],
  );
  useEffect(() => setLimit(PAGE), [rows]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `second-look-watchlist-${segment}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const highCount = rows.filter((r) => r.priority === "High").length;
  const family = open ? data.watchlist.filter((r) => r.customer_id === open.customer_id).sort((a, b) => a.pol_seq - b.pol_seq) : [];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Who to call this week</h1>
        <p>{showStopped ? "All" : "Active"} policies ranked by chance of stopping, each with a reason and a next step.</p>
        <div className="head-stats">
          <span><b>{num(rows.length)}</b> in view</span>
          <span className="hs-high"><b>{num(highCount)}</b> high priority</span>
          <span><b>{num(rows.filter((r) => r.priority === "Medium").length)}</b> medium</span>
        </div>
      </div>

      <div className="filters">
        <Select label="Group" value={segment} onChange={setSegment}
          options={["All", ...data.segments.segments.map((s) => s.code)]}
          render={(v) => (v === "All" ? "All groups" : `${v} ${data.segments.segments.find((s) => s.code === v)?.name}`)} />
        <Select label="Product" value={type} onChange={setType} options={["All", "Life", "CI", "CIROP", "PA"]}
          render={(v) => (v === "All" ? "All products" : TYPE_LABEL[v])} />
        <Select label="Payment" value={pay} onChange={setPay} options={["All", "MONTHLY", "QUARTERLY", "SEMESTER", "ANNUALLY", "SINGLEPREMIUM"]}
          render={(v) => (v === "All" ? "All payments" : PAY_LABEL[v])} />
        <Select label="Priority" value={prio} onChange={setPrio} options={["All", "High", "Medium", "Low"]}
          render={(v) => (v === "All" ? "All priorities" : v)} />
        <label className="check">
          <input type="checkbox" checked={showStopped} onChange={(e) => setShowStopped(e.target.checked)} /> Show stopped policies
        </label>
        <button className="btn ghost push" onClick={exportCsv} disabled={!rows.length}>
          <Download size={16} aria-hidden /> Export CSV ({num(rows.length)})
        </button>
      </div>

      <section className="panel flush">
        <table className="table">
          <thead>
            <tr>
              <th>Priority</th><th>Policy</th><th>Product · Premium · Payment</th><th>Position</th>
              <th className="r">Risk</th><th>Why</th><th>Suggested action</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r) => (
              <tr key={r.policy_id} className={`clickable ${open?.policy_id === r.policy_id ? "selected" : ""}`} onClick={() => setOpen(r)}>
                <td><span className={`prio p-${r.priority}`}>{r.priority}</span></td>
                <td className="mono">
                  {r.policy_id}<br /><small>{r.customer_id}</small>
                  {r.is_churn && <span className="stopped">stopped</span>}
                </td>
                <td>{r.insurance_type} · Rp {r.premium} · {PAY_LABEL[r.payment_frequency]}</td>
                <td>{r.n_pol > 1 ? `${ordinal(r.pol_seq)} of ${r.n_pol}` : "Only policy"}</td>
                <td className="r"><div className="risk-cell"><span className="risk-bar"><i className={r.priority} style={{ transform: `scaleX(${Math.max(r.score, 0.02)})` }} /></span><b>{pct(r.score, 0)}</b></div></td>
                <td><div className="chips">{r.reasons.map((x) => <span key={x} className="chip">{x}</span>)}</div></td>
                <td className="action-cell">{r.action}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={7} className="empty">No policies match these filters. Clear a filter to see more.</td></tr>
            )}
          </tbody>
        </table>
        {rows.length > limit && (
          <button className="btn ghost more" onClick={() => setLimit(limit + PAGE * 2)}>
            Show more ({num(rows.length - limit)} left)
          </button>
        )}
      </section>

      {open && (
        <>
          <div className="scrim" onClick={() => setOpen(null)} />
          <aside className="drawer" role="dialog" aria-label={`Customer ${open.customer_id}`}>
            <button className="icon-btn close" onClick={() => setOpen(null)} aria-label="Close"><X size={20} /></button>
            <p className="muted mono">{open.customer_id}</p>
            <h2>{open.n_pol > 1 ? `Holds ${open.n_pol} policies` : "Holds one policy"}</h2>

            <ol className="timeline">
              {family.map((p) => (
                <li key={p.policy_id} className={p.policy_id === open.policy_id ? "current" : ""}>
                  <i style={{ background: SEG_COLOR[p.segment] }} />
                  <div>
                    <b>Policy {p.pol_seq}</b> · {p.insurance_type} · {PAY_LABEL[p.payment_frequency]}
                    <small>{p.policy_id} · {p.is_churn ? "Stopped" : `Active · risk ${pct(p.score, 0)}`}</small>
                  </div>
                </li>
              ))}
            </ol>

            <h3>Why</h3>
            <div className="chips">{open.reasons.length ? open.reasons.map((x) => <span key={x} className="chip">{x}</span>) : <span className="muted">No risk signal</span>}</div>
            <h3>Suggested action</h3>
            <p>{open.action}</p>
            <h3>Call script</h3>
            <blockquote>{script(open)}</blockquote>
          </aside>
        </>
      )}
    </div>
  );
}

type SelectProps = { label: string; value: string; onChange: (v: string) => void; options: string[]; render: (v: string) => string };
function Select({ label, value, onChange, options, render }: SelectProps) {
  return (
    <label className="select">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{render(o)}</option>)}
      </select>
    </label>
  );
}
