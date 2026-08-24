import {
  SageMakerClient,
  ListPipelineExecutionsCommand,
  DescribePipelineExecutionCommand,
  ListPipelineExecutionStepsCommand,
  SendPipelineExecutionStepSuccessCommand,
} from '@aws-sdk/client-sagemaker';

const client = new SageMakerClient({ region: process.env.REGION });

export async function listExecutions(queryParams: Record<string, string | undefined>) {
  const pipelineName = queryParams.pipelineName || 'goldwind-algo-pipeline';

  const result = await client.send(
    new ListPipelineExecutionsCommand({
      PipelineName: pipelineName,
      MaxResults: 50,
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      executions: result.PipelineExecutionSummaries || [],
    }),
  };
}

export async function getExecution(id: string) {
  const [executionResult, stepsResult] = await Promise.all([
    client.send(
      new DescribePipelineExecutionCommand({
        PipelineExecutionArn: id,
      })
    ),
    client.send(
      new ListPipelineExecutionStepsCommand({
        PipelineExecutionArn: id,
      })
    ),
  ]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      execution: {
        pipelineExecutionArn: executionResult.PipelineExecutionArn,
        pipelineExecutionStatus: executionResult.PipelineExecutionStatus,
        pipelineExecutionDescription: executionResult.PipelineExecutionDescription,
        creationTime: executionResult.CreationTime,
        lastModifiedTime: executionResult.LastModifiedTime,
      },
      steps: stepsResult.PipelineExecutionSteps || [],
    }),
  };
}

export async function approveStep(executionId: string, body: Record<string, unknown>) {
  const callbackToken = body.callbackToken as string;

  if (!callbackToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'callbackToken is required' }),
    };
  }

  await client.send(
    new SendPipelineExecutionStepSuccessCommand({
      CallbackToken: callbackToken,
      OutputParameters: [
        {
          Name: 'approvedBy',
          Value: (body.approvedBy as string) || 'api-user',
        },
        {
          Name: 'approvedAt',
          Value: new Date().toISOString(),
        },
      ],
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Step approved successfully', executionId }),
  };
}
