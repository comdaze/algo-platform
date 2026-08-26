import apiClient from './client';

export interface AutoMlRun {
  runId: string;
  status: string;
  datasetS3Uri?: string;
  task?: string;
  instanceType?: string;
  outputS3?: string;
  createdAt?: string;
  failureReason?: string;
  summary?: {
    status?: string;
    returncode?: number;
    model_id?: string;
    validation_metrics?: Record<string, unknown>;
    results_csv?: string;
    model_dir?: string;
    mlflow_model?: { name?: string; version?: string; tracking_uri?: string; source?: string };
    mlflow_register_error?: string;
  };
}

export async function startAutoml(input: {
  datasetS3Uri: string;
  task?: string;
  instanceType?: string;
  maxIters?: number;
}): Promise<AutoMlRun> {
  const res = await apiClient.post<AutoMlRun>('/automl', input);
  return res.data;
}

export async function getAutoml(id: string): Promise<AutoMlRun> {
  const res = await apiClient.get<AutoMlRun>(`/automl/${encodeURIComponent(id)}`);
  return res.data;
}

export async function listAutoml(): Promise<AutoMlRun[]> {
  const res = await apiClient.get<{ runs: AutoMlRun[] }>('/automl');
  return res.data.runs || [];
}
