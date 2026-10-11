// Offline assistant: keyword intents answered by computing directly on the loaded portfolio.
// No LLM, no network: every number shown is calculated from the same data as the screens.
import type { Dataset, Policy } from "./data";
import { PAY_LABEL, TYPE_LABEL, num, ordinal, pct } from "./format";
import { band, reasons, score, type Plan } from "./score";
import { nPerArm } from "./sampleSize";

export type Tab = "Portfolio X-Ray" | "Retention Watchlist" | "Second Look Check" | "Campaign Simulator" | "Pilot Planner";
export type Action = { label: string; tab: Tab; segment?: string; plan?: Plan & { firstPayment: string } };
export type Answer = { text: string; table?: string[][]; actions?: Action[] };

export const SUGGESTIONS = [
  "Where should we focus?",
  "Risk of a second life policy paid monthly?",
  "Stop rate by payment",
  "Who should we call this week?",
  "Does age or gender matter?",
  "How big must the pilot be?",
];

export const isRule = (p: Policy) =>
  (p.pol_seq > 1 && (p.payment_frequency === "MONTHLY" || p.payment_frequency === "SINGLEPREMIUM")) ||
  (p.pol_seq === 1 && p.insurance_type === "PA");

const has = (q: string, ...words: string[]) => words.some((w) => new RegExp(`\\b${w}`).test(q));

function parsePlan(q: string): (Plan & { firstPayment: string }) | null {
  const type = has(q, "cirop", "return of premium") ? "CIROP" : has(q, "critical", "ci\\b") ? "CI"
    : has(q, "pa\\b", "personal accident", "accident") ? "PA" : has(q, "life") ? "Life" : null;
  const payment = has(q, "monthly", "month") ? "MONTHLY" : has(q, "annual", "yearly", "year") ? "ANNUALLY"
    : has(q, "quarter") ? "QUARTERLY" : has(q, "semester", "6 month") ? "SEMESTER"
    : has(q, "single", "one payment", "lump") ? "SINGLEPREMIUM" : null;
  if (!type && !payment) return null;
  const held = has(q, "third", "3rd") ? 2 : has(q, "second", "2nd", "extra", "another", "additional") ? 1 : 0;
  const premium = has(q, "large", "big", "high premium", ">3m", "above 3") ? ">3M" : has(q, "1m", "1-3") ? "1M-3M" : "<250K";
  const t = type ?? "Life";
  return { held, firstType: t === "PA" ? "Life" : t, firstPayment: "MONTHLY", type: t, premium,
    payment: payment ?? (t === "PA" ? "SINGLEPREMIUM" : "MONTHLY") };
}

function breakdown(d: Dataset, key: "insurance_type" | "payment_frequency" | "premium", extraOnly: boolean): string[][] {
  const rows = d.watchlist.filter((p) => !extraOnly || p.pol_seq > 1);
  const g = new Map<string, [number, number]>();
  for (const p of rows) {
    const v = g.get(p[key]) ?? [0, 0];
    g.set(p[key], [v[0] + 1, v[1] + (p.is_churn ? 1 : 0)]);
  }
  const label = (k: string) => (key === "payment_frequency" ? PAY_LABEL[k] : key === "premium" ? `Rp ${k}` : TYPE_LABEL[k]);
  return [["", "Policies", "Stopped", "Rate"],
    ...[...g.entries()].sort((a, b) => b[1][1] / b[1][0] - a[1][1] / a[1][0])
      .map(([k, [n, c]]) => [label(k), num(n), num(c), pct(c / n)])];
}

export function answer(d: Dataset, raw: string): Answer {
  const q = raw.toLowerCase().trim();
  const { kpi, segments, not_drivers, rule } = d.segments;
  const m = d.model;
  const S1 = segments[0];

  const polId = raw.match(/(SYN-)?POL-?\d+/i)?.[0].toUpperCase();
  if (polId) {
    const p = d.watchlist.find((x) => x.policy_id === polId);
    if (!p) return { text: `I can't find policy ${polId} in this data set.` };
    return {
      text: `**${p.policy_id}** (${p.customer_id}) is the ${ordinal(p.pol_seq)} of ${p.n_pol} policies: ${p.insurance_type}, Rp ${p.premium}, ${PAY_LABEL[p.payment_frequency]}. ` +
        `${p.is_churn ? "It has already **stopped**." : `Chance it stops: **${pct(p.score, 0)}** (${p.priority}).`}` +
        `${p.reasons.length ? ` Why: ${p.reasons.join(", ")}.` : ""} Suggested action: ${p.action}`,
      actions: [{ label: "Open in watchlist", tab: "Retention Watchlist", segment: p.segment }],
    };
  }

  const custId = raw.match(/(SYN-)?CUST-?\d+/i)?.[0].toUpperCase();
  if (custId) {
    const ps = d.watchlist.filter((x) => x.customer_id === custId).sort((a, b) => a.pol_seq - b.pol_seq);
    if (!ps.length) return { text: `I can't find customer ${custId}.` };
    return {
      text: `**${custId}** holds ${ps.length} polic${ps.length === 1 ? "y" : "ies"}.`,
      table: [["#", "Policy", "Product", "Payment", "Status"],
        ...ps.map((p) => [String(p.pol_seq), p.policy_id, p.insurance_type, PAY_LABEL[p.payment_frequency], p.is_churn ? "Stopped" : `Active · ${pct(p.score, 0)}`])],
    };
  }

  if (has(q, "andi")) {
    const plan = { held: 1, firstType: "Life", firstPayment: "MONTHLY", type: "Life", premium: "<250K", payment: "MONTHLY" };
    const p = score(m, plan), pa = score(m, { ...plan, payment: "ANNUALLY" });
    return {
      text: `Pak Andi already has one life policy and is about to buy a second one: life, small premium, monthly. Chance it gets cancelled: **${pct(p, 0)}** (${band(m, p)}). ` +
        `Paid annually it drops to **${pct(pa, 0)}**. Best option: a top-up on the policy he already has.`,
      actions: [{ label: "Check Pak Andi in Second Look", tab: "Second Look Check", plan }],
    };
  }

  if (has(q, "by", "per", "breakdown", "split", "compare") && has(q, "product", "type", "payment", "pay", "premium")) {
    const key = has(q, "payment", "pay") ? "payment_frequency" : has(q, "premium") ? "premium" : "insurance_type";
    const extra = has(q, "extra", "second", "additional");
    return { text: `Stop rate by ${key === "insurance_type" ? "product" : key === "payment_frequency" ? "payment" : "premium"}${extra ? ", extra policies only" : ""}:`, table: breakdown(d, key, extra) };
  }

  const plan = parsePlan(q);
  if (plan && has(q, "risk", "chance", "score", "cancel", "stop", "churn", "likely", "what if", "if ")) {
    const p = score(m, plan);
    const why = reasons(m, plan);
    const who = plan.held === 0 ? "a first policy" : `a ${ordinal(plan.held + 1)} policy (customer already has ${TYPE_LABEL[plan.firstType]})`;
    return {
      text: `For ${who}: ${TYPE_LABEL[plan.type]}, Rp ${plan.premium}, ${PAY_LABEL[plan.payment]}. Chance it gets cancelled: **${pct(p, 0)}** (${band(m, p)}).` +
        `${why.length ? ` Why: ${why.join(", ")}.` : ""} Estimate based on historical patterns, not a proven effect.`,
      actions: [{ label: "Open in Second Look", tab: "Second Look Check", plan }],
    };
  }

  if (has(q, "gender", "age", "marital", "married", "demograph", "old", "young")) {
    return {
      text: "No. Once policy structure is controlled, demographics don't separate who stops. That's why SECOND LOOK doesn't use them (and avoids fairness issues).",
      table: [["Factor", "p-value", "Test"], ...not_drivers.map((x) => [x.factor, x.p.toFixed(2), x.test])],
    };
  }

  if (has(q, "model", "auc", "accura", "predict", "reliable", "valid")) {
    return {
      text: `A readable logistic model on policy structure only (no demographics, no tenure). Out-of-fold AUC **${m.metrics.oof_auc.toFixed(3)}**, ` +
        `PR-AUC ${m.metrics.oof_pr_auc.toFixed(2)}, Brier ${m.metrics.brier.toFixed(3)}. The top 10% of scores contain **${pct(m.metrics.top10_capture, 0)}** of all stops. ` +
        "It shows association, not cause; the pilot tests the cause.",
    };
  }

  if (has(q, "pilot", "sample", "experiment", "a/b", "ab test", "how long", "prove")) {
    const base = d.pilot[0].baseline;
    const n10 = nPerArm(+base.toFixed(3), +base.toFixed(3) - 0.1), n15 = nPerArm(+base.toFixed(3), +base.toFixed(3) - 0.15);
    return {
      text: `Half the agents use SECOND LOOK, half don't. To detect a 10-point drop from today's **${pct(base)}** stop rate on monthly extra policies, we need **${num(n10)} policies per group** (${num(n15)} for a 15-point drop), at 95% confidence and 80% power.`,
      actions: [{ label: "Open Pilot Planner", tab: "Pilot Planner" }],
    };
  }

  if (has(q, "campaign", "budget", "contact", "save", "efficien", "roi", "cost")) {
    const flagged = d.watchlist.filter(isRule);
    const prec = flagged.filter((p) => p.is_churn).length / flagged.length;
    const sr = 0.2;
    return {
      text: `At a 20% save rate, random outreach needs **${Math.round(1 / (kpi.stop_rate * sr))} contacts** per policy saved. Calling only the policies our one-line rule flags needs **${Math.round(1 / (prec * sr))}**. The rule finds ${pct(rule.caught / rule.total_churn, 0)} of stops in ${pct(rule.flagged / kpi.policies)} of policies.`,
      actions: [{ label: "Open Campaign Simulator", tab: "Campaign Simulator" }],
    };
  }

  if (has(q, "call", "who", "watchlist", "contact list", "this week", "at risk", "risky")) {
    const act = d.watchlist.filter((p) => !p.is_churn && p.priority === "High");
    return {
      text: `**${num(act.length)} active policies** are high priority. The top three:`,
      table: [["Policy", "Position", "Risk", "Why"], ...act.slice(0, 3).map((p) => [p.policy_id, `${ordinal(p.pol_seq)} of ${p.n_pol}`, pct(p.score, 0), p.reasons.join(", ")])],
      actions: [{ label: "Open watchlist (extra policies)", tab: "Retention Watchlist", segment: "S1" }],
    };
  }

  if (has(q, "cause", "causal", "why do", "why are", "driver", "reason")) {
    const NAME: Record<string, string> = {
      added_x_monthly: "extra policy × monthly", type_PA: "Personal Accident", pay_SINGLEPREMIUM: "single payment",
      is_added: "extra policy", same_as_first: "same product as first", n_pol_gt2: "3+ policies", pay_MONTHLY: "monthly",
    };
    const top = Object.entries(m.coef).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${NAME[k] ?? k} (×${Math.exp(v).toFixed(1)} odds)`);
    return {
      text: `Strongest associations in the model: ${top.join(", ")}. The single biggest pattern is an **extra policy paid monthly**. These are associations from historical data; they don't prove cause. The pilot is how we test it.`,
    };
  }

  if (has(q, "focus", "priorit", "segment", "group", "where", "biggest", "most", "first")) {
    return {
      text: `Focus on **extra policies** (a customer's 2nd, 3rd… policy). They are ${pct(S1.share_policies)} of the book but **${pct(S1.share_churn)}** of all stops (stop rate ${pct(S1.rate)}). Core single-policy customers barely stop and should be left alone.`,
      table: [["Group", "Policies", "Stop rate", "Share of stops", "Action"], ...segments.map((s) => [`${s.code} ${s.name}`, num(s.n), pct(s.rate), pct(s.share_churn), s.action])],
      actions: [{ label: "Open extra policies", tab: "Retention Watchlist", segment: "S1" }],
    };
  }

  if (has(q, "churn", "stop", "rate", "how many", "overall", "total", "portfolio")) {
    return {
      text: `${num(kpi.policies)} policies from ${num(kpi.customers)} customers; **${num(kpi.churn)} stopped (${pct(kpi.stop_rate)})**. Extra policies are ${pct(kpi.extra_share)} of the book and ${pct(kpi.extra_churn_share)} of all stops.`,
    };
  }

  return {
    text: "I answer from the portfolio data on this laptop. Try a policy or customer ID, a what-if like “second CI policy paid annually”, or one of these:",
  };
}
