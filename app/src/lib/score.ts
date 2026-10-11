// Mirrors pipeline/model.py (design + reasons). Keep the two in sync.
import type { Model } from "./data";

export type Plan = { held: number; firstType: string; type: string; premium: string; payment: string };

const payGroup = (p: string) => (p === "QUARTERLY" || p === "SEMESTER" ? "OTHER_INSTALLMENT" : p);

export function features(plan: Plan): Record<string, number> {
  const added = plan.held >= 1 ? 1 : 0;
  const pg = payGroup(plan.payment);
  const x: Record<string, number> = {
    is_added: added,
    n_pol_gt2: plan.held + 1 > 2 ? 1 : 0,
    same_as_first: added && plan.type === plan.firstType ? 1 : 0,
    added_x_monthly: added && pg === "MONTHLY" ? 1 : 0,
  };
  for (const t of ["CI", "CIROP", "PA"]) x[`type_${t}`] = plan.type === t ? 1 : 0;
  for (const p of ["250K-500K", "500K-1M", "1M-3M", ">3M"]) x[`prem_${p}`] = plan.premium === p ? 1 : 0;
  for (const p of ["MONTHLY", "SINGLEPREMIUM", "OTHER_INSTALLMENT"]) x[`pay_${p}`] = pg === p ? 1 : 0;
  return x;
}

export function score(m: Model, plan: Plan): number {
  const x = features(plan);
  const z = Object.entries(m.coef).reduce((s, [k, c]) => s + c * (x[k] ?? 0), m.intercept);
  return 1 / (1 + Math.exp(-z));
}

export const band = (m: Model, p: number) =>
  p >= m.risk_bands.high ? "High" : p >= m.risk_bands.medium ? "Medium" : "Low";

const REASONS: [string, string, string[]][] = [
  ["extra", "Extra policy", ["is_added"]],
  ["monthly", "Pays monthly", ["pay_MONTHLY", "added_x_monthly"]],
  ["same", "Same product as first policy", ["same_as_first"]],
  ["pa_single", "Personal Accident, single payment", ["type_PA", "pay_SINGLEPREMIUM"]],
  ["n3", "Customer holds 3+ policies", ["n_pol_gt2"]],
];

export function reasons(m: Model, plan: Plan): string[] {
  const x = features(plan);
  const scored: [number, string][] = [];
  for (let [key, label, feats] of REASONS) {
    if (key === "pa_single" && plan.type !== "PA") [label, feats] = ["Single payment", ["pay_SINGLEPREMIUM"]];
    const c = feats.reduce((s, f) => s + m.coef[f] * x[f], 0);
    if (c > m.min_reason) scored.push([c, label]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, l]) => l);
}

export const isObserved = (m: Model, plan: Plan) =>
  m.observed_combos.includes(`${plan.type}|${plan.premium}|${payGroup(plan.payment)}`);
