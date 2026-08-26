import {
  SageMakerClient,
  ListPipelineExecutionsCommand,
  DescribePipelineExecutionCommand,
  ListPipelineExecutionStepsCommand,
  SendPipelineExecutionStepSuccessCommand,
  StartPipelineExecutionCommand,
} from '@aws-sdk/client-sagemaker';

const client = new SageMakerClient({ region: process.env.REGION });

const DEFAULT_PIPELINE = process.env.PIPELINE_NAME || 'AlgoWindPowerPipeline';

export async function startExecution(body: Record<string, unknown>) {
  const pipelineName = (body.pipelineName as string) || DEFAULT_PIPELINE;
  try {
    const result = await client.send(
      new StartPipelineExecutionCommand({
        PipelineName: pipelineName,
        PipelineExecutionDisplayName: `run-${Date.now()}`,
      })
    );
    return {
      statusCode: 202,
      body: JSON.stringify({ pipelineExecutionArn: result.PipelineExecutionArn }),
    };
  } catch (err) {
    const name = (err as { name?: string })?.name || '';
    if (name === 'ResourceNotFound' || name === 'ResourceNotFoundException' || name === 'ValidationException') {
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: `Pipeline "${pipelineName}" does not exist yet. Create it first by running the ML pipeline.`,
        }),
      };
    }
    throw err;
  }
}

export async function listExecutions(queryParams: Record<string, string | undefined>) {
  const pipelineName = queryParams.pipelineName || DEFAULT_PIPELINE;

  try {
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
  } catch (err) {
    // The pipeline may not exist yet (no runs). Treat "not found" as an empty
    // list rather than a 500, so the UI shows a clean empty state.
    const name = (err as { name?: string })?.name || '';
    if (name === 'ResourceNotFound' || name === 'ResourceNotFoundException' || name === 'ValidationException') {
      return {
        statusCode: 200,
        body: JSON.stringify({ executions: [] }),
      };
    }
    throw err;
  }
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
