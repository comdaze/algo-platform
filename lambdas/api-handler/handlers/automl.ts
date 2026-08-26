import {
  SageMakerClient,
  CreateProcessingJobCommand,
  DescribeProcessingJobCommand,
} from '@aws-sdk/client-sagemaker';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { PutItemCommand, GetItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const region = process.env.REGION;
const sm = new SageMakerClient({ region });
const ddb = new DynamoDBClient({ region });
const s3 = new S3Client({ region });

const IMAGE_URI = process.env.AUTOML_IMAGE_URI || '';
const PROC_ROLE = process.env.AUTOML_PROCESSING_ROLE_ARN || '';
const RUNS_TABLE = process.env.AUTOML_RUNS_TABLE || '';
const JOB_SG = process.env.AUTOML_JOB_SG || '';
const JOB_SUBNETS = (process.env.AUTOML_JOB_SUBNETS || '').split(',').filter(Boolean);
const DATA_BUCKET = process.env.AUTOML_DATA_BUCKET || '';
const DEFAULT_INSTANCE = process.env.AUTOML_DEFAULT_INSTANCE || 'ml.g5.xlarge';
const LLM_SECRET_ARN = process.env.LLM_SECRET_ARN || '';

async function streamToString(body: unknown): Promise<string> {
  const chunks: Buffer[] = [];
  // @ts-expect-error node stream
  for await (const c of body) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString('utf-8');
}

// POST /automl — trigger an AutoML run (SageMaker Processing job).
export async function startAutoml(body: Record<string, unknown>) {
  const datasetS3Uri = (body.datasetS3Uri as string) || '';
  const task = (body.task as string) || '';
  const instanceType = (body.instanceType as string) || DEFAULT_INSTANCE;
  const maxIters = String(body.maxIters ?? '5');

  if (!datasetS3Uri.startsWith('s3://')) {
    return { statusCode: 400, body: JSON.stringify({ message: 'datasetS3Uri (s3://...) is required' }) };
  }
  if (!IMAGE_URI || !PROC_ROLE) {
    return { statusCode: 500, body: JSON.stringify({ message: 'AutoML not configured (image/role missing)' }) };
  }

  const jobName = `mlzero-automl-${Date.now()}`;
  const outputS3 = `s3://${DATA_BUCKET}/automl-runs/${jobName}/output`;

  try {
    await sm.send(
    new CreateProcessingJobCommand({
      ProcessingJobName: jobName,
      RoleArn: PROC_ROLE,
      AppSpecification: {
        ImageUri: IMAGE_URI,
        ContainerEntrypoint: ['python', '/opt/mlzero/run_automl.py'],
      },
      ProcessingInputs: [
        {
          InputName: 'dataset',
          S3Input: {
            S3Uri: datasetS3Uri,
            LocalPath: '/opt/ml/processing/input',
            S3DataType: 'S3Prefix',
            S3InputMode: 'File',
            S3DataDistributionType: 'FullyReplicated',
          },
        },
      ],
      ProcessingOutputConfig: {
        Outputs: [
          {
            OutputName: 'output',
            S3Output: { S3Uri: outputS3, LocalPath: '/opt/ml/processing/output', S3UploadMode: 'EndOfJob' },
          },
        ],
      },
      ProcessingResources: {
        ClusterConfig: { InstanceType: instanceType as never, InstanceCount: 1, VolumeSizeInGB: 100 },
      },
      StoppingCondition: { MaxRuntimeInSeconds: 3600 },
      NetworkConfig: {
        VpcConfig: { SecurityGroupIds: [JOB_SG], Subnets: JOB_SUBNETS },
      },
      Environment: {
        LLM_SECRET_ARN,
        AUTOML_TASK: task || 'Analyze the dataset, build the best model, predict the test set, report validation metrics.',
        AUTOML_MAX_ITERS: maxIters,
        AUTOML_OUTPUT_S3: outputS3,
        AUTOML_RUN_ID: jobName,
        MLFLOW_TRACKING_URI: process.env.AUTOML_MLFLOW_TRACKING_URI || '',
        MLFLOW_MODEL_NAME: (body.modelName as string) || 'MLZeroAutoML',
      },
    })
    );
  } catch (err) {
    const name = (err as { name?: string })?.name || '';
    const msg = (err as { message?: string })?.message || 'CreateProcessingJob failed';
    if (name === 'ResourceLimitExceeded' || /service limit|quota/i.test(msg)) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: `SageMaker Processing 配额不足：${msg} 请在 Service Quotas 申请 "${instanceType} for processing job usage" 的配额，或改用有配额的实例（如 CPU ml.m5.2xlarge）。`,
        }),
      };
    }
    throw err;
  }

  const item = {
    runId: jobName,
    status: 'InProgress',
    datasetS3Uri,
    task,
    instanceType,
    outputS3,
    createdAt: new Date().toISOString(),
  };
  if (RUNS_TABLE) {
    await ddb.send(new PutItemCommand({ TableName: RUNS_TABLE, Item: marshall(item) }));
  }
  return { statusCode: 202, body: JSON.stringify(item) };
}

// GET /automl/{id} — job status + (when finished) the summary.json results.
export async function getAutoml(id: string) {
  let record: Record<string, unknown> = {};
  if (RUNS_TABLE) {
    const r = await ddb.send(new GetItemCommand({ TableName: RUNS_TABLE, Key: marshall({ runId: id }) }));
    if (r.Item) record = unmarshall(r.Item);
  }

  let status = 'Unknown';
  let failureReason: string | undefined;
  try {
    const d = await sm.send(new DescribeProcessingJobCommand({ ProcessingJobName: id }));
    status = d.ProcessingJobStatus || 'Unknown';
    failureReason = d.FailureReason;
  } catch (e) {
    const name = (e as { name?: string })?.name || '';
    if (name !== 'ResourceNotFound' && name !== 'ValidationException') throw e;
  }

  let summary: unknown;
  if (status === 'Completed') {
    const key = `automl-runs/${id}/output/summary.json`;
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: DATA_BUCKET, Key: key }));
      summary = JSON.parse(await streamToString(obj.Body));
    } catch {
      /* summary not present */
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ...record, runId: id, status, failureReason, summary }),
  };
}

// GET /automl — list recent runs.
export async function listAutoml() {
  if (!RUNS_TABLE) return { statusCode: 200, body: JSON.stringify({ runs: [] }) };
  const r = await ddb.send(new ScanCommand({ TableName: RUNS_TABLE, Limit: 50 }));
  const runs = (r.Items || []).map((i) => unmarshall(i)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return { statusCode: 200, body: JSON.stringify({ runs }) };
}
