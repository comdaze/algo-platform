import type { Handler } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const dynamoClient = new DynamoDBClient({
  region: process.env.REGION || process.env.AWS_REGION,
});

const snsClient = new SNSClient({
  region: process.env.REGION || process.env.AWS_REGION,
});

interface AlertEvaluatorResult {
  evaluated: boolean;
  alertsSent: number;
}

export const handler: Handler<unknown, AlertEvaluatorResult> = async () => {
  const tableName = process.env.RESULTS_TABLE || '';
  const modelAlertsTopicArn = process.env.MODEL_ALERTS_TOPIC_ARN || '';
  const mapeThreshold = parseFloat(process.env.MAPE_THRESHOLD || '10');
  const consecutiveDaysThreshold = parseInt(process.env.CONSECUTIVE_DAYS_THRESHOLD || '3', 10);

  console.log(`AlertEvaluator: threshold=${mapeThreshold}%, consecutiveDays=${consecutiveDaysThreshold}`);

  // Query for recent backtest results
  // Scan all algorithms (in production, maintain a list of algorithm IDs)
  const algorithmIds = ['default'];
  let alertsSent = 0;

  for (const algorithmId of algorithmIds) {
    const result = await dynamoClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'algorithmId = :aid',
      ExpressionAttributeValues: {
        ':aid': { S: algorithmId },
      },
      ScanIndexForward: false,
      Limit: consecutiveDaysThreshold,
    }));

    const items = result.Items || [];
    if (items.length < consecutiveDaysThreshold) {
      console.log(`Algorithm ${algorithmId}: insufficient data (${items.length} results)`);
      continue;
    }

    // Check if MAPE exceeded threshold for consecutive days
    const allExceedThreshold = items
      .slice(0, consecutiveDaysThreshold)
      .every((item) => {
        const mape = parseFloat(item.mape?.N || '0');
        return mape > mapeThreshold;
      });

    if (allExceedThreshold) {
      const latestMape = parseFloat(items[0].mape?.N || '0');
      console.log(`ALERT: Algorithm ${algorithmId} exceeded MAPE threshold for ${consecutiveDaysThreshold} consecutive days. Latest: ${latestMape}%`);

      await snsClient.send(new PublishCommand({
        TopicArn: modelAlertsTopicArn,
        Subject: `Model Alert: ${algorithmId} MAPE Threshold Exceeded`,
        Message: JSON.stringify({
          algorithmId,
          latestMape,
          threshold: mapeThreshold,
          consecutiveDays: consecutiveDaysThreshold,
          message: `Algorithm ${algorithmId} has exceeded the MAPE threshold of ${mapeThreshold}% for ${consecutiveDaysThreshold} consecutive days. Latest MAPE: ${latestMape}%.`,
        }),
      }));

      alertsSent++;
    } else {
      console.log(`Algorithm ${algorithmId}: MAPE within acceptable range`);
    }
  }

  return {
    evaluated: true,
    alertsSent,
  };
};
