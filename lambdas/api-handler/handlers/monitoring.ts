import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  SFNClient,
  StartExecutionCommand,
  DescribeExecutionCommand,
} from '@aws-sdk/client-sfn';
import { randomUUID } from 'crypto';

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sfnClient = new SFNClient({ region: process.env.REGION });

const DEPLOYMENT_HISTORY_TABLE = process.env.DEPLOYMENT_HISTORY_TABLE || '';
const BACKTEST_STATE_MACHINE_ARN = process.env.BACKTEST_STATE_MACHINE_ARN || '';

export async function getMetrics(queryParams: Record<string, string | undefined>) {
  const algorithmId = queryParams.algorithmId || 'default';
  const limit = parseInt(queryParams.limit || '20', 10);

  const result = await docClient.send(
    new QueryCommand({
      TableName: DEPLOYMENT_HISTORY_TABLE,
      KeyConditionExpression: 'endpointName = :endpointName',
      ExpressionAttributeValues: {
        ':endpointName': algorithmId,
      },
      Limit: limit,
      ScanIndexForward: false,
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      metrics: result.Items || [],
      count: result.Count,
    }),
  };
}

export async function getDriftReport() {
  // Return a mock drift report structure
  // In production, this would read from S3 or a monitoring service
  return {
    statusCode: 200,
    body: JSON.stringify({
      report: {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        features: [],
        overallDriftScore: 0,
        threshold: 0.1,
        message: 'No drift detected',
      },
    }),
  };
}

export async function triggerBacktest(body: Record<string, unknown>) {
  const executionName = `backtest-${randomUUID()}`;

  const result = await sfnClient.send(
    new StartExecutionCommand({
      stateMachineArn: BACKTEST_STATE_MACHINE_ARN,
      name: executionName,
      input: JSON.stringify({
        algorithmId: body.algorithmId || 'default',
        dateRange: body.dateRange || { start: 'auto', end: 'auto' },
        modelVersion: body.modelVersion || 'latest',
      }),
    })
  );

  return {
    statusCode: 202,
    body: JSON.stringify({
      executionArn: result.executionArn,
      startDate: result.startDate,
      executionName,
    }),
  };
}

export async function getBacktestResult(id: string) {
  const result = await sfnClient.send(
    new DescribeExecutionCommand({
      executionArn: id,
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      executionArn: result.executionArn,
      status: result.status,
      startDate: result.startDate,
      stopDate: result.stopDate,
      output: result.output ? JSON.parse(result.output) : null,
    }),
  };
}
