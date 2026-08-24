FROM python:3.10-slim

RUN pip install --no-cache-dir \
    mlflow==2.16.0 \
    pymysql \
    boto3

EXPOSE 5000

CMD mlflow server --host 0.0.0.0 --port 5000 --default-artifact-root ${BUCKET} --backend-store-uri mysql+pymysql://${USERNAME}:${PASSWORD}@${HOST}:${PORT}/${DATABASE}
