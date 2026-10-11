"""L2 logistic on portfolio-structure features. Frontend recomputes the same score from model.json."""
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedKFold

TYPES = ["CI", "CIROP", "PA"]  # ref: Life
PREMS = ["250K-500K", "500K-1M", "1M-3M", ">3M"]  # ref: <250K
PAYS = ["MONTHLY", "SINGLEPREMIUM", "OTHER_INSTALLMENT"]  # ref: ANNUALLY

FEATURES = (
    ["is_added", "n_pol_gt2", "same_as_first"]
    + [f"type_{t}" for t in TYPES]
    + [f"prem_{p}" for p in PREMS]
    + [f"pay_{p}" for p in PAYS]
    + ["added_x_monthly"]
)

RISK_BANDS = {"high": 0.30, "medium": 0.05}

# Reason groups: contribution = sum(coef * x) over the group's features; shown when > 0.
REASONS = [
    ("extra", "Extra policy", ["is_added"]),
    ("monthly", "Pays monthly", ["pay_MONTHLY", "added_x_monthly"]),
    ("same", "Same product as first policy", ["same_as_first"]),
    ("pa_single", "Personal Accident, single payment", ["type_PA", "pay_SINGLEPREMIUM"]),
    ("n3", "Customer holds 3+ policies", ["n_pol_gt2"]),
]
MIN_REASON = 0.1


def design(df: pd.DataFrame) -> pd.DataFrame:
    X = pd.DataFrame(index=df.index)
    X["is_added"] = df["is_added"].astype(float)
    X["n_pol_gt2"] = df["n_pol_gt2"].astype(float)
    X["same_as_first"] = df["same_as_first"].astype(float)
    for t in TYPES:
        X[f"type_{t}"] = (df["insurance_type"] == t).astype(float)
    for p in PREMS:
        X[f"prem_{p}"] = (df["premium"] == p).astype(float)
    for p in PAYS:
        X[f"pay_{p}"] = (df["pay_group"] == p).astype(float)
    X["added_x_monthly"] = X["is_added"] * X["pay_MONTHLY"]
    return X[FEATURES]


def new_model() -> LogisticRegression:
    return LogisticRegression(penalty="l2", C=1.0, max_iter=5000)


def evaluate(X: pd.DataFrame, y: pd.Series) -> dict:
    oof = np.zeros(len(y))
    for tr, te in StratifiedKFold(5, shuffle=True, random_state=42).split(X, y):
        oof[te] = new_model().fit(X.iloc[tr], y.iloc[tr]).predict_proba(X.iloc[te])[:, 1]
    top = oof >= np.quantile(oof, 0.9)
    return {
        "oof_auc": float(roc_auc_score(y, oof)),
        "oof_pr_auc": float(average_precision_score(y, oof)),
        "brier": float(brier_score_loss(y, oof)),
        "top10_capture": float(y[top].sum() / y.sum()),
    }


def fit(X: pd.DataFrame, y: pd.Series) -> LogisticRegression:
    return new_model().fit(X, y)


def band(p: float) -> str:
    return "High" if p >= RISK_BANDS["high"] else "Medium" if p >= RISK_BANDS["medium"] else "Low"


def reasons(x: pd.Series, coef: dict, insurance_type: str) -> list[str]:
    scored = []
    for key, label, feats in REASONS:
        if key == "pa_single" and insurance_type != "PA":
            label, feats = "Single payment", ["pay_SINGLEPREMIUM"]
        c = sum(coef[f] * x[f] for f in feats)
        if c > MIN_REASON:
            scored.append((c, label))
    return [lbl for _, lbl in sorted(scored, reverse=True)[:3]]
