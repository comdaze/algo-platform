"""PLACEHOLDER preprocessing script for the wind-power forecasting pipeline.

This is a STUB so the SageMaker pipeline is structurally valid and runnable
end-to-end. It generates synthetic data (no real input is mounted by the
pipeline's PreprocessData step). REPLACE with real feature engineering against
the actual wind/solar dataset — the feature schema here is illustrative.

SageMaker built-in XGBoost expects CSV with NO header and the target label in
the FIRST column, so we write it that way.
"""

import argparse
import os

import numpy as np
import pandas as pd

TRAIN = "/opt/ml/processing/train"
VALID = "/opt/ml/processing/validation"
TEST = "/opt/ml/processing/test"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--features", type=str, default="")
    args, _ = parser.parse_known_args()

    features = [f for f in args.features.split(",") if f] or [
        "wind_speed",
        "wind_direction",
        "temperature",
        "humidity",
        "pressure",
        "turbine_id",
    ]

    rng = np.random.default_rng(42)
    n = 5000
    x = rng.normal(size=(n, len(features)))
    # Synthetic target loosely correlated with the first feature (wind_speed).
    y = 50 + 8 * x[:, 0] + rng.normal(scale=3, size=n)

    df = pd.DataFrame(x, columns=features)
    df.insert(0, "power_output", y)  # label in the first column

    train = df.iloc[: int(n * 0.7)]
    valid = df.iloc[int(n * 0.7) : int(n * 0.85)]
    test = df.iloc[int(n * 0.85) :]

    for path, part in [(TRAIN, train), (VALID, valid), (TEST, test)]:
        os.makedirs(path, exist_ok=True)
        part.to_csv(os.path.join(path, "data.csv"), header=False, index=False)

    print(
        f"[PLACEHOLDER preprocess] wrote train={len(train)} val={len(valid)} "
        f"test={len(test)} features={features}"
    )


if __name__ == "__main__":
    main()
