import type { Handler } from 'aws-lambda';
import { SageMakerClient, CreateProcessingJobCommand } from '@aws-sdk/client-sagemaker';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const sagemakerClient = new SageMakerClient({
  region: process.env.REGION || process.env.AWS_REGION,
});

const s3Client = new S3Client({
  region: process.env.REGION || process.env.AWS_REGION,
});

interface BacktestInput {
  algorithmId: string;
  dateRange: {
    start: string;
    end: string;
  };
  modelVersion: string;
  outputBucket?: string;
}

interface BacktestOutput {
  processingJobName: string;
  processingImageUri: string;
  inputDataUri: string;
  codeUri: string;
  outputUri: string;
  algorithmId: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export const handler: Handler<BacktestInput, BacktestOutput> = async (event) => {
  const dataBucket = process.env.DATA_BUCKET || '';
  const artifactBucket = process.env.ARTIFACT_BUCKET || '';
  const region = process.env.REGION || process.env.AWS_REGION || 'cn-northwest-1';

  const { algorithmId, dateRange, modelVersion } = event;

  console.log(`PrepareData: algorithmId=${algorithmId}, dateRange=${JSON.stringify(dateRange)}, modelVersion=${modelVersion}`);

  // Identify data range in S3
  const prefix = `predictions/${algorithmId}/`;
  const listResult = await s3Client.send(new ListObjectsV2Command({
    Bucket: dataBucket,
    Prefix: prefix,
    MaxKeys: 100,
  }));

  const objectCount = listResult.KeyCount || 0;
  console.log(`Found ${objectCount} objects in s3://${dataBucket}/${prefix}`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const processingJobName = `backtest-${algorithmId}-${timestamp}`.substring(0, 63);
  const outputBucket = event.outputBucket || artifactBucket;

  return {
    processingJobName,
    processingImageUri: `763104351884.dkr.ecr.${region}.amazonaws.com.cn/pytorch-training:2.0.0-cpu-py310`,
    inputDataUri: `s3://${dataBucket}/${prefix}`,
    codeUri: `s3://${artifactBucket}/backtesting-code/`,
    outputUri: `s3://${outputBucket}/backtest-results/${algorithmId}/${timestamp}/`,
    algorithmId,
    dateRange,
  };
};
