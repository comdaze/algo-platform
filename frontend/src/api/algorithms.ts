import apiClient from './client';
import type { Algorithm } from '../types';

// The backend stores items keyed by algorithmId/version and returns
// { items, count, nextToken }. Map that to the frontend Algorithm shape.
interface BackendAlgorithm {
  algorithmId?: string;
  id?: string;
  name?: string;
  province?: string;
  variety?: string;
  status?: Algorithm['status'];
  mape?: number | string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapAlgorithm(it: BackendAlgorithm): Algorithm {
  return {
    id: it.algorithmId ?? it.id ?? '',
    name: it.name ?? '',
    province: it.province ?? '',
    variety: it.variety ?? '',
    status: it.status ?? 'draft',
    mape: typeof it.mape === 'number' ? it.mape : Number(it.mape ?? 0),
    description: it.description,
    createdAt: it.createdAt ?? '',
    updatedAt: it.updatedAt ?? '',
  };
}

export async function listAlgorithms(): Promise<Algorithm[]> {
  const res = await apiClient.get<{ items: BackendAlgorithm[]; count?: number }>('/algorithms');
  return (res.data.items || []).map(mapAlgorithm);
}

export async function getAlgorithm(id: string): Promise<Algorithm> {
  const res = await apiClient.get<BackendAlgorithm>(`/algorithms/${id}`);
  return mapAlgorithm(res.data);
}

export async function createAlgorithm(data: Partial<Algorithm>): Promise<Algorithm> {
  const res = await apiClient.post<BackendAlgorithm>('/algorithms', data);
  return mapAlgorithm(res.data);
}

export async function updateAlgorithm(id: string, data: Partial<Algorithm>): Promise<Algorithm> {
  const res = await apiClient.put<BackendAlgorithm>(`/algorithms/${id}`, data);
  return mapAlgorithm(res.data);
}

export async function deleteAlgorithm(id: string): Promise<void> {
  await apiClient.delete(`/algorithms/${id}`);
}
