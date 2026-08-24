import apiClient from './client';
import type { Algorithm, AlgorithmListResponse } from '../types';

export interface ListAlgorithmsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  province?: string;
  search?: string;
}

export async function listAlgorithms(params?: ListAlgorithmsParams): Promise<AlgorithmListResponse> {
  const response = await apiClient.get<AlgorithmListResponse>('/algorithms', { params });
  return response.data;
}

export async function getAlgorithm(id: string): Promise<Algorithm> {
  const response = await apiClient.get<Algorithm>(`/algorithms/${id}`);
  return response.data;
}

export async function createAlgorithm(data: Partial<Algorithm>): Promise<Algorithm> {
  const response = await apiClient.post<Algorithm>('/algorithms', data);
  return response.data;
}

export async function updateAlgorithm(id: string, data: Partial<Algorithm>): Promise<Algorithm> {
  const response = await apiClient.put<Algorithm>(`/algorithms/${id}`, data);
  return response.data;
}

export async function deleteAlgorithm(id: string): Promise<void> {
  await apiClient.delete(`/algorithms/${id}`);
}
