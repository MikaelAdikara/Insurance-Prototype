import { useEffect, useMemo, useState } from "react";
import PolicyStack from "../components/PolicyStack";
import Gauge from "../components/Gauge";
import { AlertTriangle, Check, Sparkles } from "lucide-react";
import type { Customer, Dataset } from "../lib/data";
import { PAYMENTS, PREMIUMS, TYPES } from "../lib/data";
import { PAY_LABEL, TYPE_LABEL, pct } from "../lib/format";
import { band, isObserved, reasons, score, type Plan } from "../lib/score";

const DISCLAIMER = "Estimate based on historical patterns, not a proven effect. To be tested in a pilot.";
const EMPTY = { held: 0, firstType: "Life", firstPayment: "MONTHLY", type: "Life", premium: "<250K", payment: "MONTHLY" };
const PAK_ANDI = { held: 1, firstType: "Life", firstPayment: "MONTHLY", type: "Life", premium: "<250K", payment: "MONTHLY" };

type Alt = { title: string; note: string; p: number | null };
type LogRow = { at: string; who: string; plan: string; risk: string; decision: string };

let appliedNonce = 0;

export type Preset = { plan: typeof EMPTY; nonce: number; andi: boolean } | null;

export default function SecondLook({ data, preset }: { data: Dataset; preset?: Preset }) {
  const m = data.model;
  const [src, setSrc] = useState<"manual" | "existing">("manual");
  const [f, setF] = useState(EMPTY);
  const [cust, setCust] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [log, setLog] = useState<LogRow[]>([]);
  const [isAndi, setIsAndi] = useState(false);
  useEffect(() => {
    if (!preset || preset.nonce === appliedNonce) return;
    appliedNonce = preset.nonce;
    setSrc("manual"); setF(preset.plan); setIsAndi(preset.andi);
  }, [preset]);

  const set = (patch: Partial<typeof f>) => { setF({ ...f, ...patch }); setIsAndi(false); };
  const held = src === "existing" && cust ? cust.n_pol : f.held;
  const firstType = src === "existing" && cust ? cust.first_type : f.firstType;
  const plan: Plan = { held, firstType, type: f.type, premium: f.premium, payment: f.payment };

  const p = score(m, plan);
  const b = band(m, p);
  const why = reasons(m, plan);
  const seen = isObserved(m, plan);

  const alts = useMemo<Alt[]>(() => {
    const out: Alt[] = [];
    if (held >= 1) out.push({ title: "Top-up / rider on existing policy (no new policy)", note: "Avoids an extra policy altogether.", p: null });
    if (f.type === "PA") out.push({ title: "One-click renewal, reminder 30 days before", note: "Personal Accident is a single payment; the risk is a missed renewal.", p: null });
    const annual = { ...plan, payment: "ANNUALLY" };
    if (f.payment !== "ANNUALLY" && isObserved(m, annual))
      out.push({ title: "New policy, paid annually", note: "One bill a year instead of twelve.", p: score(m, annual) });
    if (f.payment === "MONTHLY")
      out.push({ title: "New policy, monthly with auto-debit", note: "Auto-debit isn't recorded in the data yet; its effect is tested in the pilot.", p });
    if (held >= 1) {
      const options = TYPES.filter((t) => t !== firstType && t !== f.type).map((t) => ({ t, q: { ...plan, type: t } }));
      const best = options.map((o) => ({ ...o, s: score(m, o.q), ok: isObserved(m, o.q) })).filter((o) => o.ok).sort((a, b) => a.s - b.s)[0];
      if (best) out.push({ title: `Different product: ${TYPE_LABEL[best.t]}`, note: "Complements the first policy instead of duplicating it.", p: best.s });
    }
    return out.sort((a, b) => (a.p ?? -1) - (b.p ?? -1));
  }, [m, held, firstType, f.type, f.premium, f.payment]);

  const matches = query.length >= 2
    ? data.customers.filter((c) => c.customer_id.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : data.customers.filter((c) => c.n_pol >= 2).slice(0, 6);

  const loadAndi = () => { setSrc("manual"); setF(PAK_ANDI); setIsAndi(true); };
  const logDecision = (decision: string) =>
    setLog([{ at: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      who: isAndi ? "Pak Andi" : src === "existing" && cust ? cust.customer_id : `Customer with ${held} polic${held === 1 ? "y" : "ies"}`,
      plan: `${f.type} · Rp ${f.premium} · ${PAY_LABEL[f.payment]}`, risk: `${pct(p, 0)} ${b}`, decision }, ...log]);

  return (
    <div className="page">
      <div className="page-head row">
        <div>
          <h1>Before you sell the next policy</h1>
          <p>Check the plan at the agent's desk, before anything is signed.</p>
        </div>
        <button className="btn primary" onClick={loadAndi}><Sparkles size={16} aria-hidden /> Load demo: Pak Andi</button>
      </div>

      <div className="check-grid">
        <section className="panel form">
          <h3>Customer</h3>
          <div className="seg-control" role="radiogroup">
            <button aria-pressed={src === "manual"} onClick={() => setSrc("manual")}>Enter manually</button>
            <button aria-pressed={src === "existing"} onClick={() => { setSrc("existing"); setIsAndi(false); }}>Choose existing</button>
          </div>

          {src === "manual" ? (
            <>
              {isAndi && <p className="persona">Pak Andi · 36 · married · long-time customer with one life policy</p>}
              <Field label="Policies already held">
                <select value={f.held} onChange={(e) => set({ held: +e.target.value })}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n === 0 ? "None (new customer)" : n}</option>)}
                </select>
              </Field>
              {f.held > 0 && (
                <div className="two">
                  <Field label="First policy product">
                    <select value={f.firstType} onChange={(e) => set({ firstType: e.target.value })}>
                      {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </select>
                  </Field>
                  <Field label="First policy payment">
                    <select value={f.firstPayment} onChange={(e) => set({ firstPayment: e.target.value })}>
                      {PAYMENTS.map((t) => <option key={t} value={t}>{PAY_LABEL[t]}</option>)}
                    </select>
                  </Field>
                </div>
              )}
            </>
          ) : (
            <>
              <Field label="Customer ID">
                <input value={query} placeholder="Type to search, e.g. CUST0" onChange={(e) => setQuery(e.target.value)} />
              </Field>
              <div className="picks">
                {matches.map((c) => (
                  <button key={c.customer_id} aria-pressed={cust?.customer_id === c.customer_id} onClick={() => setCust(c)}>
                    <span className="mono">{c.customer_id}</span>
                    <small>{c.n_pol} polic{c.n_pol === 1 ? "y" : "ies"} · first: {c.first_type}, {PAY_LABEL[c.first_payment]}</small>
                  </button>
                ))}
                {!matches.length && <p className="muted">No customer matches “{query}”.</p>}
              </div>
            </>
          )}

          <h3>Planned policy</h3>
          <Field label="Product">
            <select value={f.type} onChange={(e) => set({ type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
          <div className="two">
            <Field label="Premium band">
              <select value={f.premium} onChange={(e) => set({ premium: e.target.value })}>
                {PREMIUMS.map((t) => <option key={t} value={t}>Rp {t}</option>)}
              </select>
            </Field>
            <Field label="Payment">
              <select value={f.payment} onChange={(e) => set({ payment: e.target.value })}>
                {PAYMENTS.map((t) => <option key={t} value={t}>{PAY_LABEL[t]}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section className={`panel result band-${b}`}>
          <p className="result-label">Chance this policy gets cancelled</p>
          <div className="result-top">
            <Gauge p={p} band={b} bands={m.risk_bands} />
            <PolicyStack held={held} firstType={firstType} firstPayment={src === "existing" && cust ? cust.first_payment : f.firstPayment}
              type={f.type} payment={f.payment} band={b} />
          </div>
          {!seen && <p className="warn"><AlertTriangle size={16} aria-hidden /> This combination doesn't appear in historical data; estimate is less reliable.</p>}

          <h3>Why</h3>
          <div className="chips">
            {why.length ? why.map((x) => <span key={x} className={`chip ${b === "Low" ? "" : "strong"}`}>{x}</span>) : <span className="muted">No risk signal: this looks like a core policy.</span>}
          </div>

          {alts.length > 0 && b !== "Low" && (
            <>
              <h3>Safer alternatives</h3>
              <ul className="alts">
                {alts.map((a) => (
                  <li key={a.title}>
                    <div>
                      <b>{a.title}</b>
                      <small>{a.note}</small>
                    </div>
                    <span className={`alt-score ${a.p === null ? "Low" : band(m, a.p)}`}>{a.p === null ? "–" : pct(a.p, 0)}</span>
                    <button className="btn ghost sm" onClick={() => logDecision(a.title)}>Choose</button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="result-foot">
            <p className="disclaimer">{DISCLAIMER}</p>
            <button className="btn ghost sm" onClick={() => logDecision("Proceed as planned")}><Check size={16} aria-hidden /> Log decision</button>
          </div>
        </section>
      </div>

      {log.length > 0 && (
        <section className="panel flush">
          <table className="table compact">
            <thead><tr><th>Time</th><th>Customer</th><th>Plan</th><th>Risk</th><th>Decision</th></tr></thead>
            <tbody>
              {log.map((r, i) => (
                <tr key={i}><td>{r.at}</td><td>{r.who}</td><td>{r.plan}</td><td>{r.risk}</td><td><b>{r.decision}</b></td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
