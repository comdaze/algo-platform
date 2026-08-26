#!/usr/bin/env bash
# Phase 0 spike: install AutoGluon Assistant (MLZero) on a Ningxia GPU box.
# Linux-only. Assumes NVIDIA driver present (use a Deep Learning AMI, or install
# the driver first). Run as the ec2-user/ubuntu on the GPU instance.
set -euo pipefail

echo "== GPU / driver check =="
nvidia-smi || { echo "!! nvidia-smi failed — install the NVIDIA driver (or use a DLAMI) first"; exit 1; }

echo "== Python / uv =="
python3 --version
pip install --user -i https://mirrors.aliyun.com/pypi/simple/ uv

echo "== install MLZero from source (into a venv) =="
# China pip mirror; source install per upstream README.
export UV_INDEX_URL="https://mirrors.aliyun.com/pypi/simple/"
uv venv ~/mlzero-venv
# shellcheck disable=SC1090
source ~/mlzero-venv/bin/activate
uv pip install "git+https://github.com/autogluon/autogluon-assistant.git"

echo "== verify CLI =="
mlzero --help | head -20 || true
echo
echo "OK. Next: edit run.sh with your endpoint/model/key, then: bash run.sh <dataset-dir>"
