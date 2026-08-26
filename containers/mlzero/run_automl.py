#!/usr/bin/env python3
"""AutoML entrypoint for the SageMaker Processing job (BYOC MLZero).

Contract (SageMaker Processing mounts S3 <-> local automatically):
  input  : /opt/ml/processing/input   (dataset: train[.csv] [+ test.csv])
  output : /opt/ml/processing/output  (uploaded to S3 at end of job)
Env:
  LLM_SECRET_ARN   Secrets Manager arn holding {endpointUrl,modelId,apiKey}
  AUTOML_TASK      natural-language task instruction (optional)
  AUTOML_MAX_ITERS max agent iterations (default 5)
The LLM key is fetched at runtime (never passed as a job env var).
"""
import glob
import json
import os
import subprocess
import sys

import boto3
import render_config

INPUT = os.environ.get("AUTOML_INPUT", "/opt/ml/processing/input")
OUTPUT = os.environ.get("AUTOML_OUTPUT", "/opt/ml/processing/output")
REGION = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "cn-northwest-1"
SECRET_ARN = os.environ.get("LLM_SECRET_ARN", "")
TASK = os.environ.get(
    "AUTOML_TASK",
    "Analyze the dataset, build the best predictive model, produce predictions for the test set, and report validation metrics.",
)
MAX_ITERS = os.environ.get("AUTOML_MAX_ITERS", "5")


def fail(msg, code=2):
    print(f"ERROR: {msg}", flush=True)
    os.makedirs(OUTPUT, exist_ok=True)
    json.dump({"status": "FAILED", "error": msg}, open(os.path.join(OUTPUT, "summary.json"), "w"))
    sys.exit(code)


def main():
    os.makedirs(OUTPUT, exist_ok=True)
    if not SECRET_ARN:
        fail("LLM_SECRET_ARN not set")
    cfg = json.loads(
        boto3.client("secretsmanager", region_name=REGION).get_secret_value(SecretId=SECRET_ARN)["SecretString"]
    )
    if not (cfg.get("apiKey") and cfg.get("endpointUrl") and cfg.get("modelId")):
        fail("LLM config incomplete (need endpointUrl, modelId, apiKey) — set it on the platform Settings page")

    os.environ["OPENAI_API_KEY"] = cfg["apiKey"]
    os.environ["OPENAI_BASE_URL"] = cfg["endpointUrl"]
    os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

    config_path = render_config.render(cfg["modelId"], cfg["endpointUrl"], "/tmp/mlzero_config.yaml")
    run_out = os.path.join(OUTPUT, "run")
    cmd = ["mlzero", "-i", INPUT, "-c", config_path, "-o", run_out, "-v", "1", "-n", str(MAX_ITERS), "-t", TASK]
    print("RUN:", " ".join(cmd), flush=True)
    rc = subprocess.call(cmd)
    print(f"mlzero returncode={rc}", flush=True)

    summary = {"status": "SUCCEEDED" if rc == 0 else "FAILED", "returncode": rc, "task": TASK, "model_id": cfg["modelId"]}
    m = sorted(glob.glob(os.path.join(run_out, "**", "validation_metrics.json"), recursive=True))
    if m:
        try:
            summary["validation_metrics"] = json.load(open(m[-1]))
        except Exception as e:  # noqa: BLE001
            summary["metrics_error"] = str(e)
    r = sorted(glob.glob(os.path.join(run_out, "**", "results.csv"), recursive=True))
    if r:
        summary["results_csv"] = os.path.relpath(r[-1], OUTPUT)
    d = sorted(glob.glob(os.path.join(run_out, "**", "autogluon_model_*"), recursive=True))
    if d:
        summary["model_dir"] = os.path.relpath(d[-1], OUTPUT)

    # Auto-register the produced model into MLflow (best-effort, non-fatal).
    # The container runs in-VPC so it can reach the internal MLflow NLB. Note:
    # SageMaker uploads OUTPUT to S3 only at end of job, so we register the S3
    # source URI (MLflow stores the string; the object exists after upload).
    tracking = os.environ.get("MLFLOW_TRACKING_URI")
    out_s3 = os.environ.get("AUTOML_OUTPUT_S3")
    if rc == 0 and tracking and out_s3 and summary.get("model_dir"):
        name = os.environ.get("MLFLOW_MODEL_NAME", "MLZeroAutoML")
        src = f"{out_s3.rstrip('/')}/{summary['model_dir']}"
        run_id = os.environ.get("AUTOML_RUN_ID", "")
        last_err = None
        try:
            import mlflow
            from mlflow.tracking import MlflowClient

            for uri in [tracking.rstrip("/"), tracking.rstrip("/") + "/mlflow"]:
                try:
                    mlflow.set_tracking_uri(uri)
                    c = MlflowClient()
                    try:
                        c.create_registered_model(name)
                    except Exception:
                        pass  # already exists
                    mv = c.create_model_version(
                        name=name,
                        source=src,
                        description=f"MLZero AutoML run {run_id}; {summary.get('task','')}",
                        tags={"run_id": run_id, "model_id": summary.get("model_id", "")},
                    )
                    summary["mlflow_model"] = {"name": name, "version": mv.version, "tracking_uri": uri, "source": src}
                    break
                except Exception as e:  # noqa: BLE001
                    last_err = str(e)
            if "mlflow_model" not in summary:
                summary["mlflow_register_error"] = last_err
        except Exception as e:  # noqa: BLE001
            summary["mlflow_register_error"] = str(e)

    json.dump(summary, open(os.path.join(OUTPUT, "summary.json"), "w"), indent=2)
    print("SUMMARY:", json.dumps(summary)[:800], flush=True)
    sys.exit(0 if rc == 0 else 1)


if __name__ == "__main__":
    main()
