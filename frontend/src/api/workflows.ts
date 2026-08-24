import apiClient from './client';
import type { PipelineExecution } from '../types';

export async function listExecutions(): Promise<PipelineExecution[]> {
  const response = await apiClient.get<PipelineExecution[]>('/workflows');
  return response.data;
}

export async function getExecution(id: string): Promise<PipelineExecution> {
  const response = await apiClient.get<PipelineExecution>(`/workflows/${id}`);
  return response.data;
}

export async function approveStep(executionId: string, stepName: string): Promise<void> {
  await apiClient.post(`/workflows/${executionId}/approve`, { stepName });
}
