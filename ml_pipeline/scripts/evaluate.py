"""PLACEHOLDER evaluation script for the wind-power forecasting pipeline.

Computes MAPE/RMSE/MAE on the test set and writes evaluation.json in the exact
schema the pipeline's CheckMAPE condition reads:
    { "wind_power_metrics": { "mape": {"value": ...}, "rmse": {...}, "mae": {...} } }

It tries to load the trained SageMaker XGBoost model; if xgboost is unavailable
in this (SKLearn) container or the model can't be loaded, it falls back to a
naive mean baseline so the step still emits a valid report. REPLACE with real
evaluation once the model/data are finalized.
"""

import glob
import json
import os
import tarfile

import numpy as np
import pandas as pd

MODEL_DIR = "/opt/ml/processing/model"
TEST_DIR = "/opt/ml/processing/test"
OUT_DIR = "/opt/ml/processing/evaluation"


def load_test():
    files = glob.glob(os.path.join(TEST_DIR, "*.csv"))
    frames = [pd.read_csv(f, header=None) for f in files]
    df = pd.concat(frames, ignore_index=True)
    y = df.iloc[:, 0].to_numpy(dtype=float)
    x = df.iloc[:, 1:].to_numpy(dtype=float)
    return x, y


def try_predict(x):
    """Best-effort real prediction; None if the model can't be loaded here."""
    try:
        import xgboost as xgb

        for tar in glob.glob(os.path.join(MODEL_DIR, "*.tar.gz")):
            with tarfile.open(tar) as t:
                t.extractall(MODEL_DIR)
        candidates = [
            p
            for p in glob.glob(os.path.join(MODEL_DIR, "*"))
            if not p.endswith(".tar.gz")
        ]
        booster = xgb.Booster()
        booster.load_model(candidates[0])
        return booster.predict(xgb.DMatrix(x))
    except Exception as exc:  # noqa: BLE001 - placeholder fallback
        print(f"[PLACEHOLDER evaluate] model load failed ({exc}); using mean baseline")
        return None


def main():
    x, y = load_test()
    preds = try_predict(x)
    if preds is None:
        preds = np.full_like(y, fill_value=float(np.mean(y)))

    eps = 1e-6
    mape = float(np.mean(np.abs((y - preds) / np.maximum(np.abs(y), eps))) * 100)
    rmse = float(np.sqrt(np.mean((y - preds) ** 2)))
    mae = float(np.mean(np.abs(y - preds)))

    report = {
        "wind_power_metrics": {
            "mape": {"value": mape},
            "rmse": {"value": rmse},
            "mae": {"value": mae},
        }
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "evaluation.json"), "w") as f:
        json.dump(report, f)

    print(f"[PLACEHOLDER evaluate] {report}")


if __name__ == "__main__":
    main()
