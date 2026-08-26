import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION;
const ddb = new DynamoDBClient({ region });
const s3 = new S3Client({ region });
const TABLE = process.env.AUTOML_RUNS_TABLE || '';
const BUCKET = process.env.AUTOML_DATA_BUCKET || '';

async function streamToString(body: unknown): Promise<string> {
  const chunks: Buffer[] = [];
  // @ts-expect-error node stream is async-iterable
  for await (const c of body) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString('utf-8');
}

// EventBridge: "SageMaker Processing Job State Change" -> write status/metrics
// back to the automl-runs table so the list reflects live status.
export const handler = async (event: {
  detail?: { ProcessingJobName?: string; ProcessingJobStatus?: string; FailureReason?: string };
}): Promise<void> => {
  const d = event.detail || {};
  const jobName = d.ProcessingJobName || '';
  const status = d.ProcessingJobStatus || '';
  if (!jobName.startsWith('mlzero-automl') || !status) return;

  let metrics: unknown;
  let mlflowModel: unknown;
  if (status === 'Completed') {
    try {
      const obj = await s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: `automl-runs/${jobName}/output/summary.json` })
      );
      const s = JSON.parse(await streamToString(obj.Body));
      metrics = s.validation_metrics;
      mlflowModel = s.mlflow_model;
    } catch {
      /* summary not present */
    }
  }

  const sets = ['#s = :s', '#u = :u'];
  const names: Record<string, string> = { '#s': 'status', '#u': 'updatedAt' };
  const values: Record<string, unknown> = { ':s': status, ':u': new Date().toISOString() };
  if (metrics !== undefined) {
    sets.push('#m = :m');
    names['#m'] = 'metrics';
    values[':m'] = metrics;
  }
  if (mlflowModel !== undefined) {
    sets.push('#mf = :mf');
    names['#mf'] = 'mlflowModel';
    values[':mf'] = mlflowModel;
  }
  if (d.FailureReason) {
    sets.push('#f = :f');
    names['#f'] = 'failureReason';
    values[':f'] = d.FailureReason;
  }

  await ddb.send(
    new UpdateItemCommand({
      TableName: TABLE,
      Key: marshall({ runId: jobName }),
      UpdateExpression: 'SET ' + sets.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: marshall(values, { removeUndefinedValues: true }),
    })
  );
};
