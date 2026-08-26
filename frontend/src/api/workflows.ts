import apiClient from './client';

export interface WorkflowExecution {
  id: string;
  pipelineName: string;
  executionId: string;
  status: string;
  startTime: string;
  duration?: string;
  pendingApproval?: boolean;
}

export interface WorkflowStepView {
  name: string;
  status: string;
  startTime?: string;
  endTime?: string;
}

export interface WorkflowDetailView {
  execution: {
    pipelineExecutionArn?: string;
    pipelineExecutionStatus?: string;
    creationTime?: string;
    lastModifiedTime?: string;
  };
  steps: WorkflowStepView[];
}

// SageMaker ListPipelineExecutions summary (PascalCase) -> view model.
export async function listExecutions(): Promise<WorkflowExecution[]> {
  const res = await apiClient.get<{ executions?: Record<string, unknown>[] }>('/workflows');
  return (res.data.executions || []).map((e) => {
    const arn = (e.PipelineExecutionArn as string) || '';
    return {
      id: arn,
      pipelineName:
        (e.PipelineExecutionDisplayName as string) ||
        (e.PipelineName as string) ||
        'pipeline',
      executionId: arn.split('/').pop() || arn,
      status: (e.PipelineExecutionStatus as string) || 'Unknown',
      startTime: (e.StartTime as string) || '',
    };
  });
}

export async function getExecution(id: string): Promise<WorkflowDetailView> {
  const res = await apiClient.get<{ execution?: Record<string, unknown>; steps?: Record<string, unknown>[] }>(
    `/workflows/${encodeURIComponent(id)}`
  );
  const steps = (res.data.steps || []).map((s) => ({
    name: (s.StepName as string) || (s.name as string) || 'step',
    status: (s.StepStatus as string) || 'NotStarted',
    startTime: s.StartTime as string | undefined,
    endTime: s.EndTime as string | undefined,
  }));
  return { execution: res.data.execution || {}, steps };
}

export async function approveStep(executionId: string, callbackToken: string): Promise<void> {
  await apiClient.post(`/workflows/${encodeURIComponent(executionId)}/approve`, { callbackToken });
}

export async function startExecution(): Promise<{ pipelineExecutionArn?: string }> {
  const res = await apiClient.post<{ pipelineExecutionArn?: string }>('/workflows', {});
  return res.data;
}
