# MLZero (AutoGluon Assistant) BYOC image for SageMaker Processing.
# China-reachable base via AWS public ECR. torch's CUDA wheels bundle their own
# CUDA libs, so this image runs on CPU or on a GPU instance (ml.g5) without a
# CUDA base image. All 5 validated China adaptations are baked in.
# Python 3.11 (3.10 is near EOL 2026-10); autogluon 1.2 supports 3.11.
FROM public.ecr.aws/docker/library/python:3.11-slim

ENV PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/ \
    PIP_TRUSTED_HOST=mirrors.aliyun.com \
    HF_ENDPOINT=https://hf-mirror.com \
    PYTHONUNBUFFERED=1

# apt via aliyun Debian mirror (deb.debian.org is very slow from AWS China).
# Only libgomp1 (LightGBM runtime) + ca-certificates are needed — autogluon deps
# are all prebuilt wheels, so no compilers/build-essential required.
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' \
      /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list 2>/dev/null || true
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgomp1 ca-certificates libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# uv: fast resolver + parallel downloads (plain pip backtracks forever on the
# autogluon dependency tree). setuptools<81 keeps pkg_resources (predictor.load).
RUN pip install --no-cache-dir uv && \
    uv pip install --system --index-url https://mirrors.aliyun.com/pypi/simple/ \
      "autogluon.assistant" boto3 "setuptools<81" "mlflow-skinny"

COPY patch_openai_chat.py render_config.py run_automl.py /opt/mlzero/
# Bake the OpenAI model-validation fix (base_url + drop gpt-prefix filter).
RUN python /opt/mlzero/patch_openai_chat.py

WORKDIR /opt/mlzero
ENTRYPOINT ["python", "/opt/mlzero/run_automl.py"]
