// Pipeline output (pipeline/build.py). `real` is gitignored and may be absent in public clones.

export type Model = {
  version: string;
  mode: string;
  intercept: number;
  coef: Record<string, number>;
  risk_bands: { high: number; medium: number };
  metrics: { oof_auc: number; oof_pr_auc: number; brier: number; top10_capture: number };
  observed_combos: string[];
  min_reason: number;
};

export type Segment = {
  code: string; name: string; action: string; n: number; churn: number; rate: number;
  ci_low: number; ci_high: number; share_policies: number; share_churn: number;
};

export type SegmentsFile = {
  kpi: { policies: number; customers: number; churn: number; stop_rate: number; extra_share: number; extra_churn_share: number };
  segments: Segment[];
  rule: { flagged: number; caught: number; total_churn: number };
  not_drivers: { factor: string; p: number; test: string }[];
};

export type Policy = {
  policy_id: string; customer_id: string; segment: string; insurance_type: string; premium: string;
  payment_frequency: string; pol_seq: number; n_pol: number; same_as_first: boolean; is_churn: boolean;
  score: number; priority: "High" | "Medium" | "Low"; reasons: string[]; action: string;
};

export type Customer = { customer_id: string; n_pol: number; first_type: string; first_payment: string; types: string[] };
export type PilotDefault = { key: string; label: string; baseline: number; per_month: number };

export type Dataset = {
  model: Model; segments: SegmentsFile; watchlist: Policy[]; customers: Customer[]; pilot: PilotDefault[];
};

const files = import.meta.glob("../data/*/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

function load(mode: string): Dataset | null {
  const get = (name: string) => files[`../data/${mode}/${name}.json`];
  if (!get("model")) return null;
  return {
    model: get("model") as Model,
    segments: get("segments") as SegmentsFile,
    watchlist: get("watchlist") as Policy[],
    customers: get("customers_index") as Customer[],
    pilot: get("pilot_defaults") as PilotDefault[],
  };
}

export const datasets = { real: load("real"), synthetic: load("synthetic") };
export type Mode = keyof typeof datasets;

export const TYPES = ["Life", "CI", "CIROP", "PA"] as const;
export const PREMIUMS = ["<250K", "250K-500K", "500K-1M", "1M-3M", ">3M"] as const;
export const PAYMENTS = ["MONTHLY", "QUARTERLY", "SEMESTER", "ANNUALLY", "SINGLEPREMIUM"] as const;
