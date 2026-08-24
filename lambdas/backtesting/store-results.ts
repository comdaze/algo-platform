import type { Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: process.env.REGION || process.env.AWS_REGION,
});

interface StoreResultsInput {
  algorithmId: string;
  dateRange: {
    start: string;
    end: string;
  };
  processingJobName: string;
  outputUri: string;
  mape?: number;
  rmse?: number;
  mae?: number;
  r2?: number;
}

interface StoreResultsOutput {
  algorithmId: string;
  backtestId: string;
  mape: number;
  alertMessage: string;
}

export const handler: Handler<StoreResultsInput, StoreResultsOutput> = async (event) => {
  const tableName = process.env.RESULTS_TABLE || '';
  const { algorithmId, processingJobName } = event;

  const backtestId = `${processingJobName}-${Date.now()}`;
  const mape = event.mape || 0;
  const rmse = event.rmse || 0;
  const mae = event.mae || 0;
  const r2 = event.r2 || 0;
  const runDate = new Date().toISOString();

  console.log(`StoreResults: algorithmId=${algorithmId}, backtestId=${backtestId}, mape=${mape}`);

  await dynamoClient.send(new PutItemCommand({
    TableName: tableName,
    Item: {
      algorithmId: { S: algorithmId },
      backtestId: { S: backtestId },
      runDate: { S: runDate },
      mape: { N: String(mape) },
      rmse: { N: String(rmse) },
      mae: { N: String(mae) },
      r2: { N: String(r2) },
      processingJobName: { S: processingJobName },
      outputUri: { S: event.outputUri || '' },
    },
  }));

  console.log(`Results stored successfully for ${algorithmId}/${backtestId}`);

  return {
    algorithmId,
    backtestId,
    mape,
    alertMessage: `MAPE threshold exceeded for algorithm ${algorithmId}: ${mape}% (backtest: ${backtestId})`,
  };
};
