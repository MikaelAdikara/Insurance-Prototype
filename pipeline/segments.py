"""S1-S5 segmentation, one-line rule, and the action playbook."""
import numpy as np
import pandas as pd
from statsmodels.stats.proportion import proportion_confint

SEGMENTS = {
    "S1": ("Extra policies", "PREVENT & RESCUE"),
    "S2": ("Personal Accident (first policy)", "FIX RENEWAL"),
    "S3": ("First policy, multi-policy customer", "WATCH"),
    "S4": ("Single-policy, pays monthly", "LIGHT NUDGE"),
    "S5": ("Single-policy, other payment", "PROTECT: DON'T DISTURB"),
}

PLAY = {
    "merge_or_annual": "Offer auto-debit or annual payment; option to merge into main policy",
    "topup_review": "Needs review: add as top-up/rider on existing policy",
    "renewal": "Renewal reminder 30 days before; one-click renewal",
    "watch": "Watch; contact if another policy of this customer stops",
    "nudge": "Light nudge: auto-debit reminder in regular statements",
    "dont_contact": "Do not contact in retention campaigns",
}


def assign_segment(df: pd.DataFrame) -> pd.Series:
    conds = [
        df["is_added"],
        df["insurance_type"] == "PA",
        df["n_pol"] > 1,
        df["monthly"],
    ]
    return pd.Series(np.select(conds, ["S1", "S2", "S3", "S4"], default="S5"), index=df.index)


def one_line_rule(df: pd.DataFrame) -> pd.Series:
    return (df["is_added"] & df["payment_frequency"].isin(["MONTHLY", "SINGLEPREMIUM"])) | (
        ~df["is_added"] & (df["insurance_type"] == "PA")
    )


def action(row) -> str:
    seg = row["segment"]
    if seg == "S1":
        if row["monthly"]:
            return PLAY["merge_or_annual"]
        if row["payment_frequency"] == "SINGLEPREMIUM":
            return PLAY["renewal"]
        return PLAY["topup_review"]
    return {"S2": PLAY["renewal"], "S3": PLAY["watch"], "S4": PLAY["nudge"]}.get(seg, PLAY["dont_contact"])


def segment_table(df: pd.DataFrame) -> list[dict]:
    total_n, total_churn = len(df), int(df["is_churn"].sum())
    out = []
    for code, (name, act) in SEGMENTS.items():
        s = df[df["segment"] == code]
        n, c = len(s), int(s["is_churn"].sum())
        lo, hi = proportion_confint(c, n, method="wilson") if n else (0.0, 0.0)
        out.append({
            "code": code, "name": name, "action": act, "n": n, "churn": c,
            "rate": c / n if n else 0.0, "ci_low": float(lo), "ci_high": float(hi),
            "share_policies": n / total_n, "share_churn": c / total_churn if total_churn else 0.0,
        })
    return out
