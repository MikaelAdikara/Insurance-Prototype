const nf = new Intl.NumberFormat("en-US");

export const num = (n: number) => nf.format(n);
export const pct = (p: number, digits = 1) => `${(p * 100).toFixed(digits)}%`;

export const TYPE_LABEL: Record<string, string> = {
  Life: "Life", CI: "Critical Illness", CIROP: "Critical Illness + Return of Premium", PA: "Personal Accident",
};
export const PAY_LABEL: Record<string, string> = {
  MONTHLY: "Monthly", QUARTERLY: "Quarterly", SEMESTER: "Every 6 months", ANNUALLY: "Annual", SINGLEPREMIUM: "Single payment",
};
export const PREM_LABEL = (p: string) => `Rp ${p}`;

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
