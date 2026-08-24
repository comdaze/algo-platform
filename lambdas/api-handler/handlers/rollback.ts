import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: process.env.REGION });

export async function triggerRollback(body: Record<string, unknown>) {
  const { endpointName, targetVersion, reason } = body as {
    endpointName?: string;
    targetVersion?: string;
    reason?: string;
  };

  if (!endpointName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'endpointName is required' }),
    };
  }

  // Invoke the rollback Lambda asynchronously
  const payload = JSON.stringify({
    endpointName,
    targetVersion: targetVersion || 'previous',
    reason: reason || 'Manual rollback triggered via API',
    triggeredAt: new Date().toISOString(),
  });

  await lambdaClient.send(
    new InvokeCommand({
      FunctionName: 'goldwind-rollback-function',
      InvocationType: 'Event', // Asynchronous invocation
      Payload: Buffer.from(payload),
    })
  );

  return {
    statusCode: 202,
    body: JSON.stringify({
      message: 'Rollback initiated',
      endpointName,
      targetVersion: targetVersion || 'previous',
    }),
  };
}
