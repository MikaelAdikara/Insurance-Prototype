"""Load, validate, join (by customer_id, never by row position) and build policy-level features."""
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_XLSX = ROOT / "data" / "raw" / "data.xlsx"
SYN_DIR = ROOT / "data" / "synthetic"

PAY_GROUP = {"QUARTERLY": "OTHER_INSTALLMENT", "SEMESTER": "OTHER_INSTALLMENT"}


def load(synthetic: bool = False) -> tuple[pd.DataFrame, pd.DataFrame]:
    if synthetic:
        policy = pd.read_csv(SYN_DIR / "policy.csv")
        customer = pd.read_csv(SYN_DIR / "customer.csv")
    else:
        sheets = pd.read_excel(RAW_XLSX, sheet_name=["policy", "customer"])
        policy, customer = sheets["policy"], sheets["customer"]
    policy["is_churn"] = policy["is_churn"].astype(bool)
    return policy, customer


def validate(policy: pd.DataFrame, customer: pd.DataFrame) -> None:
    assert policy["policy_id"].is_unique, "policy_id not unique"
    assert customer["customer_id"].is_unique, "customer_id not unique"
    missing = ~policy["customer_id"].isin(customer["customer_id"])
    assert not missing.any(), f"{missing.sum()} policies without an owner"


def join(policy: pd.DataFrame, customer: pd.DataFrame) -> pd.DataFrame:
    df = policy.merge(customer, on="customer_id", how="left", validate="many_to_one")
    assert len(df) == len(policy)
    assert df[["age", "gender", "tenure", "marital_status"]].notna().all().all()
    return df


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["pol_num"] = df["policy_id"].str.extract(r"(\d+)$")[0].astype(int)
    df["pol_seq"] = df.groupby("customer_id")["pol_num"].rank(method="first").astype(int)
    df["n_pol"] = df.groupby("customer_id")["policy_id"].transform("count")
    df["is_added"] = df["pol_seq"] > 1
    df["n_pol_gt2"] = df["n_pol"] > 2
    first = df.loc[df["pol_seq"] == 1].set_index("customer_id")
    df["first_type"] = df["customer_id"].map(first["insurance_type"])
    df["first_payment"] = df["customer_id"].map(first["payment_frequency"])
    df["same_as_first"] = df["is_added"] & (df["insurance_type"] == df["first_type"])
    df["pay_group"] = df["payment_frequency"].replace(PAY_GROUP)
    df["monthly"] = df["payment_frequency"] == "MONTHLY"
    return df


def build_frame(synthetic: bool = False) -> pd.DataFrame:
    policy, customer = load(synthetic)
    validate(policy, customer)
    return add_features(join(policy, customer))
