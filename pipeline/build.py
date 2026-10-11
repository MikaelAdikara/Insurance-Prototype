"""Build all frontend JSON.  Usage: python pipeline/build.py [--synthetic]"""
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import statsmodels.api as sm
from scipy.stats import chi2_contingency

sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import ROOT, build_frame  # noqa: E402
import model as M  # noqa: E402
from segments import action, assign_segment, one_line_rule, segment_table  # noqa: E402


def not_drivers(df: pd.DataFrame) -> list[dict]:
    p_gender = chi2_contingency(pd.crosstab(df["gender"], df["is_churn"]))[1]
    p_marital = chi2_contingency(pd.crosstab(df["marital_status"], df["is_churn"]))[1]
    X = M.design(df).assign(a2635=df["age"].between(26, 35).astype(float))
    fit = sm.Logit(df["is_churn"].astype(int), sm.add_constant(X)).fit(disp=0, method="bfgs", maxiter=2000)
    p_age = fit.pvalues["a2635"]
    return [
        {"factor": "Gender", "p": float(p_gender), "test": "chi-square"},
        {"factor": "Marital status", "p": float(p_marital), "test": "chi-square"},
        {"factor": "Age 26-35", "p": float(p_age), "test": "logit, controlling for all portfolio features"},
    ]


def main(synthetic: bool) -> None:
    mode = "synthetic" if synthetic else "real"
    out = ROOT / "app" / "src" / "data" / mode
    out.mkdir(parents=True, exist_ok=True)

    df = build_frame(synthetic)
    df["segment"] = assign_segment(df)
    df["flag"] = one_line_rule(df)
    X, y = M.design(df), df["is_churn"].astype(int)

    metrics = M.evaluate(X, y)
    clf = M.fit(X, y)
    coef = dict(zip(M.FEATURES, map(float, clf.coef_[0])))
    df["score"] = clf.predict_proba(X)[:, 1]

    combos = sorted(set(df["insurance_type"] + "|" + df["premium"] + "|" + df["pay_group"]))
    (out / "model.json").write_text(json.dumps({
        "version": str(date.today()), "mode": mode,
        "intercept": float(clf.intercept_[0]), "coef": coef,
        "risk_bands": M.RISK_BANDS, "metrics": metrics, "observed_combos": combos,
        "min_reason": M.MIN_REASON,
    }, indent=1))

    n, churn = len(df), int(y.sum())
    added = df[df["is_added"]]
    flag = df[df["flag"]]
    (out / "segments.json").write_text(json.dumps({
        "kpi": {
            "policies": n, "customers": int(df["customer_id"].nunique()), "churn": churn,
            "stop_rate": churn / n, "extra_share": len(added) / n,
            "extra_churn_share": int(added["is_churn"].sum()) / churn,
        },
        "segments": segment_table(df),
        "rule": {"flagged": len(flag), "caught": int(flag["is_churn"].sum()), "total_churn": churn},
        "not_drivers": not_drivers(df),
    }, indent=1))

    df["priority"] = df["score"].map(M.band)
    df["action"] = df.apply(action, axis=1)
    df["reasons"] = [M.reasons(X.loc[i], coef, t) for i, t in zip(df.index, df["insurance_type"])]
    cols = ["policy_id", "customer_id", "segment", "insurance_type", "premium", "payment_frequency",
            "pol_seq", "n_pol", "same_as_first", "is_churn", "score", "priority", "reasons", "action"]
    wl = df.sort_values("score", ascending=False)[cols].copy()
    wl["score"] = wl["score"].round(4)
    (out / "watchlist.json").write_text(wl.to_json(orient="records"))

    firsts = df[df["pol_seq"] == 1]
    held = df.groupby("customer_id")["insurance_type"].apply(list)
    cust = [{"customer_id": r.customer_id, "n_pol": int(r.n_pol), "first_type": r.insurance_type,
             "first_payment": r.payment_frequency, "types": held[r.customer_id]}
            for r in firsts.sort_values("n_pol", ascending=False).itertuples()]
    (out / "customers_index.json").write_text(json.dumps(cust))

    def rate(s):
        return float(s["is_churn"].mean())
    s1m = added[added["monthly"]]
    pa = df[(df["segment"] == "S2")]
    (out / "pilot_defaults.json").write_text(json.dumps([
        {"key": "s1_monthly", "label": "Extra policies paid monthly", "baseline": rate(s1m),
         "per_month": 50},
        {"key": "s2_pa", "label": "Personal Accident (first policy)", "baseline": rate(pa), "per_month": 50},
    ], indent=1))

    print(f"[{mode}] policies={n} churn={churn} extra={len(added)}/{int(added['is_churn'].sum())}")
    print(f"[{mode}] metrics " + " ".join(f"{k}={v:.3f}" for k, v in metrics.items()))
    print(f"[{mode}] rule flagged={len(flag)} caught={int(flag['is_churn'].sum())} -> {out}")


if __name__ == "__main__":
    main("--synthetic" in sys.argv)
