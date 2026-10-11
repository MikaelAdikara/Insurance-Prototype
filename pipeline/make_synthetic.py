"""Generate a synthetic book with the same structure and aggregate churn patterns.

Only aggregate distributions and the fitted model's cell probabilities are taken from the real data;
no real row or ID is copied. Output is safe to commit (data/synthetic/).
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from features import SYN_DIR, add_features, build_frame  # noqa: E402
import model as M  # noqa: E402

rng = np.random.default_rng(2026)


def main() -> None:
    real = build_frame()
    X = M.design(real)
    clf = M.fit(X, real["is_churn"].astype(int))
    cell = ["insurance_type", "premium", "payment_frequency"]

    firsts = real[real["pol_seq"] == 1]
    added = real[real["is_added"]]
    n_pol_dist = firsts["n_pol"].value_counts(normalize=True)
    first_cells = firsts[cell].value_counts(normalize=True)
    added_by_type = {t: g[["premium", "payment_frequency"]].value_counts(normalize=True)
                     for t, g in added.groupby("insurance_type")}
    added_types = added["insurance_type"].value_counts(normalize=True)
    p_same = added["same_as_first"].mean()

    def pick(dist: pd.Series):
        return dist.index[rng.choice(len(dist), p=dist.values)]

    rows, customers, pol = [], [], 1
    for c in range(1, int(firsts.shape[0]) + 1):
        cid = f"SYN-CUST-{c:05d}"
        k = int(pick(n_pol_dist))
        t0, prem, pay = pick(first_cells)
        rows.append((f"SYN-POL-{pol:05d}", cid, t0, prem, pay)); pol += 1
        for _ in range(k - 1):
            if rng.random() < p_same:
                t = t0
            else:
                others = added_types.drop(t0, errors="ignore")
                t = pick(others / others.sum())
            prem, pay = pick(added_by_type[t])
            rows.append((f"SYN-POL-{pol:05d}", cid, t, prem, pay)); pol += 1
        customers.append({
            "customer_id": cid, "age": int(rng.integers(20, 66)), "occupation": None,
            "gender": rng.choice(["MALE", "FEMALE"]), "tenure": float(rng.integers(0, 363)) + 0.6296,
            "marital_status": bool(rng.random() < 0.6),
        })

    policy = pd.DataFrame(rows, columns=["policy_id", "customer_id"] + cell)
    policy["is_churn"] = False
    customer = pd.DataFrame(customers)

    # churn ~ Bernoulli(real model probability for the same feature cell)
    tmp = policy.merge(customer, on="customer_id")
    feats = add_features(tmp)
    p = clf.predict_proba(M.design(feats))[:, 1]
    policy["is_churn"] = rng.random(len(p)) < p

    SYN_DIR.mkdir(parents=True, exist_ok=True)
    policy.to_csv(SYN_DIR / "policy.csv", index=False)
    customer.to_csv(SYN_DIR / "customer.csv", index=False)
    print(f"synthetic: {len(policy)} policies, {len(customer)} customers, churn={policy['is_churn'].sum()}")


if __name__ == "__main__":
    main()
