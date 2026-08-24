"""Goldwind Algorithm Platform - Wind Power Forecasting SageMaker Pipeline.

Pipeline steps:
    PreprocessData -> TrainModel -> EvaluateModel -> CheckMAPE
        -> RegisterModel (if MAPE <= 8.0)
        -> H20TrainingCallback (CallbackStep for large models requiring H20 GPU)

Implements get_pipeline() returning a Pipeline object.
"""

import os

import boto3
import sagemaker
import sagemaker.session

from sagemaker.estimator import Estimator
from sagemaker.inputs import TrainingInput
from sagemaker.model_metrics import MetricsSource, ModelMetrics
from sagemaker.processing import ProcessingInput, ProcessingOutput
from sagemaker.sklearn.processing import SKLearnProcessor
from sagemaker.workflow.callback_step import CallbackStep, CallbackOutput, CallbackOutputTypeEnum
from sagemaker.workflow.conditions import ConditionLessThanOrEqualTo
from sagemaker.workflow.condition_step import ConditionStep
from sagemaker.workflow.functions import JsonGet
from sagemaker.workflow.parameters import ParameterInteger, ParameterString
from sagemaker.workflow.pipeline import Pipeline
from sagemaker.workflow.properties import PropertyFile
from sagemaker.workflow.steps import ProcessingStep, TrainingStep
from sagemaker.workflow.step_collections import RegisterModel


BASE_DIR = os.path.dirname(os.path.realpath(__file__))


def get_session(region, default_bucket):
    """Get the SageMaker session for the given region.

    Args:
        region: AWS region name.
        default_bucket: Default S3 bucket for artifacts.

    Returns:
        sagemaker.session.Session instance.
    """
    boto_session = boto3.Session(region_name=region)
    sagemaker_client = boto_session.client("sagemaker")
    runtime_client = boto_session.client("sagemaker-runtime")
    return sagemaker.session.Session(
        boto_session=boto_session,
        sagemaker_client=sagemaker_client,
        sagemaker_runtime_client=runtime_client,
        default_bucket=default_bucket,
    )


def get_pipeline(
    region="cn-northwest-1",
    role=None,
    default_bucket=None,
    model_package_group_name="GoldwindWindPowerModelPackageGroup",
    pipeline_name="GoldwindWindPowerPipeline",
    base_job_prefix="GoldwindWindPower",
    callback_queue_url=None,
):
    """Get a SageMaker Pipeline for wind power forecasting.

    Args:
        region: AWS region.
        role: IAM role ARN for SageMaker execution.
        default_bucket: S3 bucket for pipeline artifacts.
        model_package_group_name: Model package group name for registration.
        pipeline_name: Name of the pipeline.
        base_job_prefix: Prefix for SageMaker job names.
        callback_queue_url: SQS queue URL for the H20 callback step.

    Returns:
        Pipeline instance.
    """
    sagemaker_session = get_session(region, default_bucket)
    if role is None:
        role = sagemaker.session.get_execution_role(sagemaker_session)

    # Pipeline parameters
    processing_instance_count = ParameterInteger(
        name="ProcessingInstanceCount", default_value=1
    )
    processing_instance_type = ParameterString(
        name="ProcessingInstanceType", default_value="ml.t3.medium"
    )
    training_instance_type = ParameterString(
        name="TrainingInstanceType", default_value="ml.g5.xlarge"
    )
    model_approval_status = ParameterString(
        name="ModelApprovalStatus", default_value="PendingManualApproval"
    )

    # Step 1: PreprocessData - SKLearn processor for feature engineering
    sklearn_processor = SKLearnProcessor(
        framework_version="1.2-1",
        instance_type=processing_instance_type,
        instance_count=processing_instance_count,
        base_job_name=f"{base_job_prefix}/sklearn-preprocess",
        sagemaker_session=sagemaker_session,
        role=role,
    )

    step_preprocess = ProcessingStep(
        name="PreprocessData",
        processor=sklearn_processor,
        outputs=[
            ProcessingOutput(
                output_name="train", source="/opt/ml/processing/train"
            ),
            ProcessingOutput(
                output_name="validation", source="/opt/ml/processing/validation"
            ),
            ProcessingOutput(
                output_name="test", source="/opt/ml/processing/test"
            ),
        ],
        code=os.path.join(BASE_DIR, "scripts", "preprocess.py"),
        job_arguments=[
            "--features",
            "wind_speed,wind_direction,temperature,humidity,pressure,turbine_id",
        ],
    )

    # Step 2: TrainModel - XGBoost estimator for regression
    model_path = f"s3://{sagemaker_session.default_bucket()}/{base_job_prefix}/Train"
    image_uri = sagemaker.image_uris.retrieve(
        framework="xgboost",
        region=region,
        version="1.5-1",
        py_version="py3",
        instance_type="ml.g5.xlarge",
    )

    xgb_estimator = Estimator(
        image_uri=image_uri,
        instance_type=training_instance_type,
        instance_count=1,
        output_path=model_path,
        base_job_name=f"{base_job_prefix}/train",
        sagemaker_session=sagemaker_session,
        role=role,
    )

    xgb_estimator.set_hyperparameters(
        objective="reg:squarederror",
        num_round=200,
        max_depth=8,
        eta=0.1,
        gamma=2,
        min_child_weight=5,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="rmse",
        verbosity=1,
    )

    step_train = TrainingStep(
        name="TrainModel",
        estimator=xgb_estimator,
        inputs={
            "train": TrainingInput(
                s3_data=step_preprocess.properties.ProcessingOutputConfig.Outputs[
                    "train"
                ].S3Output.S3Uri,
                content_type="text/csv",
            ),
            "validation": TrainingInput(
                s3_data=step_preprocess.properties.ProcessingOutputConfig.Outputs[
                    "validation"
                ].S3Output.S3Uri,
                content_type="text/csv",
            ),
        },
    )

    # Step 3: EvaluateModel - Compute MAPE, RMSE, MAE metrics
    evaluation_report = PropertyFile(
        name="EvaluationReport",
        output_name="evaluation",
        path="evaluation.json",
    )

    eval_processor = SKLearnProcessor(
        framework_version="1.2-1",
        instance_type=processing_instance_type,
        instance_count=1,
        base_job_name=f"{base_job_prefix}/eval",
        sagemaker_session=sagemaker_session,
        role=role,
    )

    step_evaluate = ProcessingStep(
        name="EvaluateModel",
        processor=eval_processor,
        inputs=[
            ProcessingInput(
                source=step_train.properties.ModelArtifacts.S3ModelArtifacts,
                destination="/opt/ml/processing/model",
            ),
            ProcessingInput(
                source=step_preprocess.properties.ProcessingOutputConfig.Outputs[
                    "test"
                ].S3Output.S3Uri,
                destination="/opt/ml/processing/test",
            ),
        ],
        outputs=[
            ProcessingOutput(
                output_name="evaluation", source="/opt/ml/processing/evaluation"
            ),
        ],
        code=os.path.join(BASE_DIR, "scripts", "evaluate.py"),
        property_files=[evaluation_report],
    )

    # Step 4: RegisterModel - Register in model package group
    model_metrics = ModelMetrics(
        model_statistics=MetricsSource(
            s3_uri="{}/evaluation.json".format(
                step_evaluate.arguments["ProcessingOutputConfig"]["Outputs"][0][
                    "S3Output"
                ]["S3Uri"]
            ),
            content_type="application/json",
        )
    )

    step_register = RegisterModel(
        name="RegisterModel",
        estimator=xgb_estimator,
        model_data=step_train.properties.ModelArtifacts.S3ModelArtifacts,
        content_types=["text/csv"],
        response_types=["text/csv"],
        inference_instances=["ml.g4dn.xlarge", "ml.m5.large"],
        transform_instances=["ml.m5.large"],
        model_package_group_name=model_package_group_name,
        approval_status=model_approval_status,
        model_metrics=model_metrics,
    )

    # Step 5: H20TrainingCallback - CallbackStep for large models needing H20 GPU
    sqs_queue_url = callback_queue_url or os.environ.get(
        "CALLBACK_QUEUE_URL", "https://sqs.cn-northwest-1.amazonaws.com.cn/123456789012/goldwind-callback-queue"
    )

    step_h20_callback = CallbackStep(
        name="H20TrainingCallback",
        sqs_queue_url=sqs_queue_url,
        inputs={
            "model_artifact": step_train.properties.ModelArtifacts.S3ModelArtifacts,
            "training_job_name": step_train.properties.TrainingJobName,
        },
        outputs=[
            CallbackOutput(
                output_name="modelArtifactS3Uri",
                output_type=CallbackOutputTypeEnum.String,
            ),
            CallbackOutput(
                output_name="metrics",
                output_type=CallbackOutputTypeEnum.String,
            ),
        ],
    )

    # Step 6: ConditionStep - Check if MAPE <= 8.0
    # If MAPE is acceptable: register model and trigger H20 callback for GPU training
    # If MAPE exceeds threshold: pipeline stops (no further steps)
    cond_mape = ConditionLessThanOrEqualTo(
        left=JsonGet(
            step_name=step_evaluate.name,
            property_file=evaluation_report,
            json_path="wind_power_metrics.mape.value",
        ),
        right=8.0,
    )

    step_condition = ConditionStep(
        name="CheckMAPE",
        conditions=[cond_mape],
        if_steps=[step_register, step_h20_callback],
        else_steps=[],
    )

    # Build pipeline
    pipeline = Pipeline(
        name=pipeline_name,
        parameters=[
            processing_instance_type,
            processing_instance_count,
            training_instance_type,
            model_approval_status,
        ],
        steps=[step_preprocess, step_train, step_evaluate, step_condition],
        sagemaker_session=sagemaker_session,
    )

    return pipeline
