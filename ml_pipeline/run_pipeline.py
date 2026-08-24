"""Goldwind Algorithm Platform - Pipeline Execution Entry Point.

This script creates/updates and starts the SageMaker pipeline execution
with the specified parameters.
"""

import os
import sys
import json

# Add the parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline import get_pipeline


def main():
    """Create or update the pipeline and start an execution."""
    region = os.environ.get("AWS_DEFAULT_REGION", "cn-northwest-1")
    role = os.environ.get("SAGEMAKER_PIPELINE_ROLE_ARN")
    default_bucket = os.environ.get("SAGEMAKER_ARTIFACT_BUCKET")
    pipeline_name = os.environ.get("SAGEMAKER_PROJECT_NAME", "GoldwindWindPowerPipeline")
    callback_queue_url = os.environ.get("CALLBACK_QUEUE_URL")

    print(f"Region: {region}")
    print(f"Role: {role}")
    print(f"Bucket: {default_bucket}")
    print(f"Pipeline Name: {pipeline_name}")

    pipeline = get_pipeline(
        region=region,
        role=role,
        default_bucket=default_bucket,
        pipeline_name=pipeline_name,
        callback_queue_url=callback_queue_url,
    )

    print("Pipeline definition created successfully.")
    pipeline_definition = json.loads(pipeline.definition())
    print(f"Pipeline steps: {[step['Name'] for step in pipeline_definition['Steps']]}")

    # Upsert (create or update) the pipeline
    upsert_response = pipeline.upsert(role_arn=role)
    print(f"Pipeline upsert response: {upsert_response}")

    # Start the pipeline execution
    execution = pipeline.start()
    print(f"Pipeline execution started: {execution.arn}")

    return execution


if __name__ == "__main__":
    main()
