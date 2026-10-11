"""Reproduction tests (docs/04 §5). Real-data tests skip when data/raw/data.xlsx is absent."""
import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from features import RAW_XLSX, build_frame, join, load  # noqa: E402
import model as M  # noqa: E402
from segments import assign_segment, one_line_rule  # noqa: E402

real = pytest.mark.skipif(not RAW_XLSX.exists(), reason="real data not present")


@pytest.fixture(scope="module")
def df():
    d = build_frame()
    d["segment"] = assign_segment(d)
    return d


@real
def test_join_is_by_customer_id_not_row_position():
    policy, customer = load()
    j = join(policy, customer)
    own = customer.set_index("customer_id")
    assert (j.loc[j["customer_id"] == "CUST007264", "tenure"] == own.loc["CUST007264", "tenure"]).all()
    # every joined row carries its own customer's tenure
    assert (j["tenure"].values == own.loc[j["customer_id"], "tenure"].values).all()
    # row 0 of `customer` belongs to someone else; positional join would give CUST007264 this tenure
    assert own.loc["CUST007264", "tenure"] != customer.loc[0, "tenure"]
    assert customer.loc[0, "customer_id"] == "CUST030335"


@real
def test_basic_counts(df):
    assert len(df) == 5000
    assert df["customer_id"].nunique() == 4704
    assert df["is_churn"].sum() == 185


@real
def test_extra_policy_numbers(df):
    a, f = df[df["is_added"]], df[~df["is_added"]]
    assert (len(a), a["is_churn"].sum()) == (296, 153)
    assert (len(f), f["is_churn"].sum()) == (4704, 32)
    am = a[a["payment_frequency"] == "MONTHLY"]
    aa = a[a["payment_frequency"] == "ANNUALLY"]
    assert (len(am), am["is_churn"].sum()) == (195, 138)
    assert (len(aa), aa["is_churn"].sum()) == (80, 0)
    same = a[a["same_as_first"]]
    assert len(same) == 159 and round(same["is_churn"].mean(), 3) == 0.642


@real
def test_segments(df):
    got = {s: (len(g), int(g["is_churn"].sum())) for s, g in df.groupby("segment")}
    assert got == {"S1": (296, 153), "S2": (126, 17), "S3": (185, 2), "S4": (2721, 12), "S5": (1672, 1)}


@real
def test_one_line_rule(df):
    flag = one_line_rule(df)
    assert flag.sum() == 340 and df.loc[flag, "is_churn"].sum() == 170


@real
def test_model_auc(df):
    auc = M.evaluate(M.design(df), df["is_churn"].astype(int))["oof_auc"]
    assert 0.95 <= auc <= 0.975


def n_per_arm(p1, p2, za=1.959964, zb=0.841621):
    return math.ceil((za + zb) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (p1 - p2) ** 2)


def test_pilot_sample_size():
    assert n_per_arm(0.708, 0.608) == 350
    assert n_per_arm(0.708, 0.558) == 159
    assert n_per_arm(0.135, 0.085) == 611
