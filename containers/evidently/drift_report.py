"""
Evidently drift report generator for Algorithm Platform.
Reads reference and current data from S3, generates drift reports,
and uploads results back to S3.
"""
import os
import json
import io
from datetime import datetime

import boto3
import pandas as pd
import numpy as np
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset


def get_env_var(name: str, default: str = '') -> str:
    """Get environment variable with optional default."""
    return os.environ.get(name, default)


def read_data_from_s3(s3_client, s3_path: str) -> pd.DataFrame:
    """Read CSV data from an S3 path."""
    parts = s3_path.replace('s3://', '').split('/', 1)
    bucket = parts[0]
    key = parts[1] if len(parts) > 1 else ''

    response = s3_client.get_object(Bucket=bucket, Key=key)
    content = response['Body'].read().decode('utf-8')
    return pd.read_csv(io.StringIO(content))


def upload_to_s3(s3_client, bucket: str, key: str, data: bytes, content_type: str = 'application/octet-stream') -> None:
    """Upload data to S3."""
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType=content_type
    )


def generate_drift_report(reference_data: pd.DataFrame, current_data: pd.DataFrame) -> Report:
    """Generate Evidently drift report with data drift and target drift presets."""
    report = Report(metrics=[
        DataDriftPreset(),
        TargetDriftPreset(),
    ])
    report.run(reference_data=reference_data, current_data=current_data)
    return report


def main() -> None:
    """Main entry point for drift report generation."""
    reference_data_path = get_env_var('REFERENCE_DATA_PATH')
    current_data_path = get_env_var('CURRENT_DATA_PATH')
    report_bucket = get_env_var('REPORT_BUCKET')

    if not reference_data_path or not current_data_path or not report_bucket:
        print('ERROR: Missing required environment variables.')
        print('Required: REFERENCE_DATA_PATH, CURRENT_DATA_PATH, REPORT_BUCKET')
        return

    s3_client = boto3.client('s3')

    print(f'Reading reference data from: {reference_data_path}')
    reference_data = read_data_from_s3(s3_client, reference_data_path)
    print(f'Reference data shape: {reference_data.shape}')

    print(f'Reading current data from: {current_data_path}')
    current_data = read_data_from_s3(s3_client, current_data_path)
    print(f'Current data shape: {current_data.shape}')

    print('Generating drift report...')
    report = generate_drift_report(reference_data, current_data)

    # Generate timestamp for report naming
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')

    # Generate and upload HTML report
    html_content = report.get_html()
    html_key = f'drift-reports/{timestamp}/report.html'
    upload_to_s3(s3_client, report_bucket, html_key, html_content.encode('utf-8'), 'text/html')
    print(f'HTML report uploaded to s3://{report_bucket}/{html_key}')

    # Generate and upload JSON metrics
    json_content = report.as_dict()
    json_key = f'drift-reports/{timestamp}/metrics.json'
    upload_to_s3(s3_client, report_bucket, json_key, json.dumps(json_content, default=str).encode('utf-8'), 'application/json')
    print(f'JSON metrics uploaded to s3://{report_bucket}/{json_key}')

    # Print summary metrics
    print('\n--- Drift Report Summary ---')
    metrics = json_content.get('metrics', [])
    for metric in metrics:
        metric_result = metric.get('result', {})
        metric_id = metric.get('metric', 'unknown')
        print(f'Metric: {metric_id}')
        if 'drift_share' in metric_result:
            print(f'  Drift share: {metric_result["drift_share"]:.4f}')
        if 'number_of_drifted_columns' in metric_result:
            print(f'  Drifted columns: {metric_result["number_of_drifted_columns"]}')
        if 'dataset_drift' in metric_result:
            print(f'  Dataset drift detected: {metric_result["dataset_drift"]}')

    print('\nDrift report generation completed successfully.')


if __name__ == '__main__':
    main()
