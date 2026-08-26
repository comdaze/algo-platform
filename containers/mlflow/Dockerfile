FROM public.ecr.aws/docker/library/python:3.12-slim

# China mirrors: base image from AWS public ECR (Docker Hub is unreachable in
# the China regions); pip from the Aliyun mirror (reliable from AWS China; the
# Tsinghua/CERNET edu mirror is not reachable from CodeBuild's network).
RUN pip install --no-cache-dir \
    -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com \
    mlflow==2.16.0 \
    pymysql \
    boto3

EXPOSE 5000

# --static-prefix /mlflow: served behind the frontend nginx at /mlflow/ (the UI,
# static assets and /mlflow/ajax-api/* all resolve under the prefix). Clients that
# log to this server must use a tracking URI ending in /mlflow.
CMD mlflow server --host 0.0.0.0 --port 5000 --static-prefix /mlflow --default-artifact-root ${BUCKET} --backend-store-uri mysql+pymysql://${USERNAME}:${PASSWORD}@${HOST}:${PORT}/${DATABASE}
