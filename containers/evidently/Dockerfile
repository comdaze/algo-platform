FROM public.ecr.aws/docker/library/python:3.12-slim

# China mirrors: base image from AWS public ECR (Docker Hub is unreachable in
# the China regions); pip from the Aliyun mirror (reliable from AWS China; the
# Tsinghua/CERNET edu mirror is not reachable from CodeBuild's network).
RUN pip install --no-cache-dir \
    -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com \
    evidently \
    boto3 \
    pandas

# Placeholder: Add monitoring service entry point
# COPY app/ /app/
# CMD ["python", "/app/main.py"]

EXPOSE 8080
